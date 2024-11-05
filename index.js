const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { getOAuthToken } = require("./twitchApi");
const { BROADCASTERS_FILE_PATH, BASE_DOWNLOAD_PATH } = require("./config");
const { spawn } = require("child_process");

const ONLY_DOWNLOAD_MOST_VIEW = true;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

function readBroadcasterIds() {
  const data = fs.readFileSync(BROADCASTERS_FILE_PATH);
  return JSON.parse(data);
}

async function fetchClips(broadcasterId, token, retryCount = 0) {
  const url = "https://api.twitch.tv/helix/clips";
  const headers = {
    "Client-ID": process.env.CLIENT_ID,
    Authorization: `Bearer ${token}`,
  };

  // Calculate time range (last 24 hours)
  const endDate = new Date();
  const startDate = new Date(endDate - 24 * 3600 * 1000);

  const params = {
    broadcaster_id: broadcasterId,
    started_at: startDate.toISOString(),
    ended_at: endDate.toISOString(),
    first: 100, // Maximum allowed per page
  };

  try {
    const response = await axios.get(url, { headers, params });
    let clips = response.data.data;

    // Handle pagination if there are more clips
    let cursor = response.data.pagination?.cursor;
    while (cursor && clips.length < 100) {
      // Limit total clips to 100 to avoid rate limits
      const nextResponse = await axios.get(url, {
        headers,
        params: { ...params, after: cursor },
      });
      clips = [...clips, ...nextResponse.data.data];
      cursor = nextResponse.data.pagination?.cursor;
    }

    return clips;
  } catch (error) {
    if (error.response) {
      console.error(
        `API Error: ${error.response.status} - ${error.response.data.message || error.response.statusText}`,
      );

      // Handle specific API errors
      if (error.response.status === 401) {
        throw new Error("Authentication failed. Token may be expired.");
      } else if (error.response.status === 429) {
        // Rate limit hit - wait and retry
        if (retryCount < MAX_RETRIES) {
          const retryAfter =
            error.response.headers["retry-after"] || RETRY_DELAY;
          console.log(`Rate limit hit. Waiting ${retryAfter}s before retry...`);
          await new Promise((resolve) =>
            setTimeout(resolve, retryAfter * 1000),
          );
          return fetchClips(broadcasterId, token, retryCount + 1);
        }
      }
    }

    if (retryCount < MAX_RETRIES) {
      console.log(
        `Retrying fetch clips for broadcaster ${broadcasterId}. Attempt ${retryCount + 1}/${MAX_RETRIES}`,
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return fetchClips(broadcasterId, token, retryCount + 1);
    }

    console.error(
      `Failed to fetch clips for broadcaster ${broadcasterId}:`,
      error.message,
    );
    return [];
  }
}

async function downloadClip(clip, folderPath, retryCount = 0) {
  const filename = `${clip.id}###${clip.broadcaster_name}###${clip.view_count}views###${clip.created_at.split("T")[0]}.mp4`;
  const fullFilePath = path.join(folderPath, filename);

  if (fs.existsSync(fullFilePath)) {
    const stats = fs.statSync(fullFilePath);
    if (stats.size > 0) {
      console.log(
        `File ${filename} already exists in ${folderPath}. Skipping download.`,
      );
      return;
    }
    fs.unlinkSync(fullFilePath);
  }

  try {
    const clipUrl = `https://clips.twitch.tv/${clip.id}`;

    return new Promise((resolve, reject) => {
      const twitchDl = spawn(
        "twitch-dl",
        ["download", clipUrl, "-o", fullFilePath],
        {
          stdio: ["pipe", "inherit", "inherit"], // Allow us to write to stdin while keeping stdout/stderr visible
        },
      );

      // Automatically respond with "1" whenever there's a prompt
      twitchDl.stdin.write("1\n");

      // Keep responding with "1" periodically in case of multiple prompts
      const inputInterval = setInterval(() => {
        twitchDl.stdin.write("1\n");
      }, 1000); // Send "1" every second

      twitchDl.on("close", (code) => {
        clearInterval(inputInterval); // Clean up the interval

        if (code === 0) {
          if (fs.existsSync(fullFilePath)) {
            const stats = fs.statSync(fullFilePath);
            if (stats.size > 0) {
              console.log(
                `Successfully downloaded ${filename} to ${folderPath}`,
              );
              resolve();
            } else {
              fs.unlinkSync(fullFilePath);
              reject(new Error("Downloaded file is empty"));
            }
          } else {
            reject(new Error("File not found after download"));
          }
        } else {
          reject(new Error(`twitch-dl exited with code ${code}`));
        }
      });

      twitchDl.on("error", (err) => {
        clearInterval(inputInterval); // Clean up the interval
        reject(new Error(`Failed to start twitch-dl: ${err.message}`));
      });
    });
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(
        `Retrying download for ${filename}. Attempt ${retryCount + 1}/${MAX_RETRIES}`,
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return downloadClip(clip, folderPath, retryCount + 1);
    }
    throw new Error(
      `Failed to download ${clip.id} after ${MAX_RETRIES} attempts: ${error.message}`,
    );
  }
}

async function main() {
  try {
    const token = await getOAuthToken();
    const broadcasters = readBroadcasterIds();
    const dateFolder = `${BASE_DOWNLOAD_PATH}_${new Date().toISOString().slice(0, 10)}`;

    if (!fs.existsSync(dateFolder)) {
      fs.mkdirSync(dateFolder, { recursive: true });
    }

    let allClips = [];
    for (const broadcaster of broadcasters) {
      console.log(`Fetching clips for broadcaster: ${broadcaster.id}`);
      const clips = await fetchClips(broadcaster.id, token);
      allClips = [...allClips, ...clips];
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    console.log(`Found ${allClips.length} total clips`);

    if (ONLY_DOWNLOAD_MOST_VIEW) {
      allClips.sort((a, b) => b.view_count - a.view_count);
      allClips = allClips.slice(0, 50);
      console.log("Downloading top 50 most viewed clips");
    }

    let successCount = 0;
    let failureCount = 0;

    // Process clips in batches
    const BATCH_SIZE = 5; // Number of concurrent downloads
    const chunks = [];

    // Split clips into chunks
    for (let i = 0; i < allClips.length; i += BATCH_SIZE) {
      chunks.push(allClips.slice(i, i + BATCH_SIZE));
    }

    // Process each chunk concurrently
    for (const chunk of chunks) {
      const downloadPromises = chunk.map((clip) =>
        downloadClip(clip, dateFolder)
          .then(() => {
            successCount++;
            console.log(
              `Progress: ${successCount + failureCount}/${allClips.length} clips processed`,
            );
          })
          .catch((error) => {
            console.error(`Failed to download clip ${clip.id}:`, error.message);
            failureCount++;
            console.log(
              `Progress: ${successCount + failureCount}/${allClips.length} clips processed`,
            );
          }),
      );

      // Wait for current batch to complete before starting next batch
      await Promise.all(downloadPromises);

      // Optional: Add a small delay between batches
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log("\nDownload Summary:");
    console.log(`Successfully downloaded: ${successCount} clips`);
    console.log(`Failed to download: ${failureCount} clips`);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

main().catch(console.error);
