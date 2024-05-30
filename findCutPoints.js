const fs = require("fs");
const path = require("path");
const { DRAFT_CONTENT_PATH } = require("./config");

// Path to the JSON file
const filePath = path.join(__dirname, DRAFT_CONTENT_PATH);

// Function to read the JSON file and parse it
function readAndParseJSON(file) {
  const data = fs.readFileSync(file);
  return JSON.parse(data);
}

// Function to find cut points based on segment start times
function findCutPoints(data) {
  const videos = data.materials.videos;
  const segments = data.tracks?.[0]?.segments;
  const cutPoints = [];

  console.log("segments:", segments);
  // Loop through the segments array, starting from the second segment
  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];
    const materialId = segment.material_id;
    const start = segment.target_timerange.start / 1000000; // Convert to seconds
    const startSec = Math.floor(start); // round down to the nearest second
    const startMin = Math.floor(startSec / 60);
    const startTime = `${startMin}:${(startSec % 60).toString().padStart(2, "0")}`;

    const video = videos.find((video) => video.id === materialId);

    if (video && video.material_name) {
      const folderName = video.material_name.split("_")?.[0]; // Retrieve original folder name
      cutPoints.push(`${startTime} ${folderName}`);
    } else {
      cutPoints.push(startTime);
    }
  }

  return cutPoints;
}

// Main function to run the script
function main() {
  try {
    const jsonData = readAndParseJSON(filePath);
    const cutPoints = findCutPoints(jsonData);
    console.log("Cut Points:", cutPoints);
  } catch (error) {
    console.error("Error processing the file:", error);
  }
}

main();
