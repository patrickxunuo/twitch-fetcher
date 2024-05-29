const path = require("path");

const CONFIG = {
  BROADCASTERS_FILE_PATH: path.resolve(__dirname, "broadcasters.json"),
  BASE_DOWNLOAD_PATH: path.resolve(__dirname, "twitch_clips"), // Base path for downloaded clips
};

module.exports = CONFIG;
