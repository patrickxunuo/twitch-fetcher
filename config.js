const path = require("path");
const { formatDate } = require("./helper");

const CONFIG = {
  BROADCASTERS_FILE_PATH: path.resolve(__dirname, "broadcasters.json"),
  BASE_DOWNLOAD_PATH: path.resolve(__dirname, "twitch_clips"),
  DRAFT_CONTENT_PATH: path.resolve(
    "C:",
    "Users",
    "patri",
    "AppData",
    "Local",
    "JianyingPro",
    "User Data",
    "Projects",
    "com.lveditor.draft",
    `lol ${formatDate()}`,
    "draft_agency_config.json",
  ),
  DESCRIPTION_PATH: path.resolve(__dirname, "description.txt"),
  CREDENTIALS_PATH: path.resolve(__dirname, "credentials.json"),
  THUMBNAIL_PATH: path.resolve(__dirname, "thumbnail.png"),
  VIDEO_FILE_DIR: path.join("F:", "youtube video"),
  TOKEN_PATH: path.resolve(__dirname, "token.json"),
  SCOPES: ["https://www.googleapis.com/auth/youtube.upload"],
};

module.exports = CONFIG;
