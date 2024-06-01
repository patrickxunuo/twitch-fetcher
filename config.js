const path = require("path");

const CONFIG = {
  BROADCASTERS_FILE_PATH: path.resolve(__dirname, "broadcasters.json"),
  BASE_DOWNLOAD_PATH: path.resolve(__dirname, "twitch_clips"),
  DRAFT_CONTENT_PATH: path.resolve(__dirname, "draft_content.json"),
  DESCRIPTION_PATH: path.resolve(__dirname, "description.txt"),
};

module.exports = CONFIG;
