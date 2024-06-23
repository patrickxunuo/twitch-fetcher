const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { getOAuthToken } = require("./twitchApi");
const { BROADCASTERS_FILE_PATH, BASE_DOWNLOAD_PATH } = require("./config");

const ONLY_DOWNLOAD_MOST_VIEW = false;

function readBroadcasterIds() {
  const data = fs.readFileSync(BROADCASTERS_FILE_PATH);
  return JSON.parse(data);
}

async function fetchClips(broadcasterId, token) {
  const url = "https://api.twitch.tv/helix/clips";
  const headers = {
    "Client-ID": process.env.CLIENT_ID,
    Authorization: `Bearer ${token}`,
  };
  const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const params = {
    broadcaster_id: broadcasterId,
    started_at: yesterday,
    first: 5,
  };
  const response = await axios.get(url, { headers, params });
  return response.data.data;
}

async function downloadClip(url, folderPath, filename) {
  const fullFilePath = path.join(folderPath, filename);
  
  // Check if the file already exists
  if (fs.existsSync(fullFilePath)) {
    console.log(`File ${filename} already exists in ${folderPath}. Skipping download.`);
    return Promise.resolve(); // Resolve the promise without doing anything
  }

  // Proceed with downloading if the file does not exist
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });
  const writer = fs.createWriteStream(fullFilePath);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", () => {
      console.log(`Downloaded ${filename} to ${folderPath}`);
      resolve();
    });
    writer.on("error", reject);
  });
}


async function main() {
  const token = await getOAuthToken();
  const broadcasters = readBroadcasterIds();
  const dateFolder = `${BASE_DOWNLOAD_PATH}_${new Date().toISOString().slice(0, 10)}`;

  if (!fs.existsSync(dateFolder)) {
    fs.mkdirSync(dateFolder, { recursive: true });
  }

  let allClips = [];
  for (const broadcaster of broadcasters) {
    const clips = await fetchClips(broadcaster.id, token);
    allClips = [...allClips, ...clips];
  }

  if (ONLY_DOWNLOAD_MOST_VIEW) {
    allClips.sort((a, b) => b.view_count - a.view_count);
    const topClips = allClips.slice(0, 5);

    for (const clip of topClips) {
      const clipUrl = clip.thumbnail_url.replace(
        "-preview-480x272.jpg",
        ".mp4",
      );
      const clipName = `most_view_${clip.id}###${clip.broadcaster_name}.mp4`;
      await downloadClip(clipUrl, dateFolder, clipName);
      console.log(`Downloaded ${clipName} to ${dateFolder}`);
    }
  } else {
    for (const clip of allClips) {
      const clipUrl = clip.thumbnail_url.replace(
        "-preview-480x272.jpg",
        ".mp4",
      );
      const clipName = `${clip.id}###${clip.broadcaster_name}.mp4`;
      await downloadClip(clipUrl, dateFolder, clipName);
      console.log(`Downloaded ${clipName} to ${dateFolder}`);
    }
  }
}

main().catch(console.error);
