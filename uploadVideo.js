const fs = require("fs");
const readline = require("readline");
const path = require("path");
const { google } = require("googleapis");
const {
  CREDENTIALS_PATH,
  VIDEO_FILE_DIR,
  TOKEN_PATH,
  DESCRIPTION_PATH,
  THUMBNAIL_PATH,
  SCOPES,
} = require("./config");
const { formatDate } = require("./helper");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function loadClientSecrets() {
  fs.readFile(CREDENTIALS_PATH, (err, content) => {
    if (err) {
      console.error("Error loading client secret file:", err);
      return;
    }
    console.log("Client secrets loaded successfully.");
    authorize(JSON.parse(content));
  });
}

function authorize(credentials) {
  const { client_secret, client_id, redirect_uris } = credentials.web;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0],
  );
  console.log("Attempting to retrieve access token...");
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) {
      console.log("Token not found, requesting new token...");
      getAccessToken(oAuth2Client);
      return;
    }
    console.log("Access token retrieved successfully.");
    oAuth2Client.setCredentials(JSON.parse(token));
    getVideoTitle(oAuth2Client);
  });
}

function getAccessToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  console.log("Authorize this app by visiting this URL:", authUrl);
  rl.question("Enter the code from that page here: ", (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) {
        console.error("Error retrieving access token:", err);
        return;
      }
      console.log("Access token received and stored.");
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error("Error saving token:", err);
        else console.log("Token stored to", TOKEN_PATH);
      });
      getVideoTitle(oAuth2Client);
    });
  });
}

function getVideoTitle(auth) {
  rl.question("Enter the title for the video: ", (title) => {
    uploadVideo(auth, title);
  });
}

function uploadVideo(auth, title) {
  const description = fs.readFileSync(DESCRIPTION_PATH, "utf8");
  const videoFilePath = path.join(VIDEO_FILE_DIR, `lol ${formatDate()}.mp4`);

  // Check if video file exists
  if (!fs.existsSync(videoFilePath)) {
    console.error("Error: Video file does not exist.");
    return;
  }

  // Check if thumbnail exists
  if (!fs.existsSync(THUMBNAIL_PATH)) {
    console.error("Error: Thumbnail file does not exist.");
    return;
  }

  const youtube = google.youtube({ version: "v3", auth });
  const requestBody = {
    snippet: {
      title,
      description,
      categoryId: "22", // Example: gaming
    },
    status: {
      privacyStatus: "private", // Keep it private initially
    },
  };

  const media = {
    body: fs.createReadStream(videoFilePath),
  };

  console.log("Starting video upload...");
  youtube.videos.insert(
    {
      part: "snippet,status",
      requestBody,
      media,
    },
    (err, data) => {
      if (err) {
        console.error("Error uploading video:", err);
        return;
      }
      console.log(`Video uploaded successfully. ID: ${data.data.id}`);
      setThumbnail(auth, data.data.id, THUMBNAIL_PATH);
    },
  );
}

function setThumbnail(auth, videoId, thumbnailPath) {
  const youtube = google.youtube({ version: "v3", auth });
  const media = {
    mimeType: "image/png",
    body: fs.createReadStream(thumbnailPath),
  };

  console.log("Uploading thumbnail...");
  youtube.thumbnails.set(
    {
      videoId,
      media,
    },
    (err, response) => {
      if (err) {
        console.error("Error uploading thumbnail:", err);
        return;
      }
      console.log("Thumbnail uploaded successfully.");
      rl.close(); // Close readline interface
    },
  );
}

loadClientSecrets();
