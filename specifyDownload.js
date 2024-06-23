const fs = require('fs');
const path = require('path');
const axios = require('axios');
const readline = require('readline');
const { getOAuthToken } = require('./twitchApi');
const { BASE_DOWNLOAD_PATH } = require('./config');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function fetchClips(broadcasterName, token, limit) {
  const url = 'https://api.twitch.tv/helix/users';
  const userResponse = await axios.get(url, {
    headers: {
      'Client-ID': process.env.CLIENT_ID,
      'Authorization': `Bearer ${token}`,
    },
    params: {
      login: broadcasterName
    }
  });

  const userId = userResponse.data.data[0].id;
  const clipsUrl = 'https://api.twitch.tv/helix/clips';
  const yesterday = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const clipsResponse = await axios.get(clipsUrl, {
    headers: {
      'Client-ID': process.env.CLIENT_ID,
      'Authorization': `Bearer ${token}`,
    },
    params: {
      broadcaster_id: userId,
      started_at: yesterday,
      first: limit,
    }
  });

  return clipsResponse.data.data;
}

async function downloadClip(url, folderPath, filename, createdAt) {
  const fullFilePath = path.join(folderPath, filename);
  if (fs.existsSync(fullFilePath)) {
    console.log(`File ${filename} already exists. Created at: ${createdAt}. Skipping download.`);
    return false;
  }

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });

  const writer = fs.createWriteStream(fullFilePath);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      console.log(`Downloaded ${filename}. Created at: ${createdAt}`);
      resolve(true);
    });
    writer.on('error', (error) => {
      console.error(`Failed to download ${filename}. Error: ${error}`);
      reject(error);
    });
  });
}


async function specifyDownload() {
  const token = await getOAuthToken();
  rl.question('Enter the name of the streamer: ', async (streamerName) => {
    rl.question('Enter the number of clips to download: ', async (numClips) => {
      const clips = await fetchClips(streamerName, token, numClips);
      const dateFolder = `${BASE_DOWNLOAD_PATH}_${new Date().toISOString().slice(0, 10)}`;

      if (!fs.existsSync(dateFolder)) {
        fs.mkdirSync(dateFolder, { recursive: true });
      }

      let downloadedCount = 0;
      for (const clip of clips) {
        const clipUrl = clip.thumbnail_url.replace("-preview-480x272.jpg", ".mp4");
        const clipName = `${clip.id}###${clip.broadcaster_name}.mp4`;
        const createdAt = clip.created_at;
        const wasDownloaded = await downloadClip(clipUrl, dateFolder, clipName, createdAt);
        if (wasDownloaded) downloadedCount++;
      }

      console.log(`Total clips downloaded: ${downloadedCount}`);
      rl.close();
    });
  });
}

specifyDownload().catch(err => {
  console.error(err);
  process.exit(1);
});
