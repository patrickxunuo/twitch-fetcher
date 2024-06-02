const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { getOAuthToken } = require("./twitchApi");
const { BROADCASTERS_FILE_PATH, BASE_DOWNLOAD_PATH } = require("./config");

// Read broadcaster IDs from the file
function readBroadcasterIds() {
  const data = fs.readFileSync(BROADCASTERS_FILE_PATH);
  return JSON.parse(data);
}

// Fetch clips for a given broadcaster
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
    first: 10, // Fetch 10 clips
    sort: "NEWEST",
  };
  const response = await axios.get(url, { headers, params });
  return response.data.data;
}

// Download a clip and save it to a specific folder
// Download a clip and save it to a specific folder
async function downloadClip(url, folderPath, filename) {
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });
  const fullFilePath = path.join(folderPath, filename);
  const writer = fs.createWriteStream(fullFilePath);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

// Main function to execute the script
async function main() {
  const token = await getOAuthToken();
  const broadcasters = readBroadcasterIds();
  const dateFolder = `${BASE_DOWNLOAD_PATH}_${new Date().toISOString().slice(0, 10)}`;

  if (!fs.existsSync(dateFolder)) {
    fs.mkdirSync(dateFolder, { recursive: true });
  }

  for (const broadcaster of broadcasters) {
    const clips = await fetchClips(broadcaster.id, token);
    for (const clip of clips) {
      const clipUrl = clip.thumbnail_url.replace(
        "-preview-480x272.jpg",
        ".mp4",
      );
      const clipName = `${clip.id}###${broadcaster.username}.mp4`; // Using ### as a separator
      await downloadClip(clipUrl, dateFolder, clipName);
      console.log(`Downloaded ${clipName} to ${dateFolder}`);
    }
  }
}

main().catch(console.error);
