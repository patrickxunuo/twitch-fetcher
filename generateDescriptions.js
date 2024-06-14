const fs = require("fs");
const path = require("path");
const { DRAFT_CONTENT_PATH } = require("./config");

// Path to the JSON file
const filePath = path.resolve(__dirname, DRAFT_CONTENT_PATH);
const descriptionPath = path.resolve(__dirname, "description.txt");

// Function to read the JSON file and parse it
function readAndParseJSON(file) {
  const data = fs.readFileSync(file);
  return JSON.parse(data);
}

// Function to find cut points based on segment start times
function generateDescriptions(data) {
  const videos = data.materials.videos;
  const segments = data.tracks?.[0]?.segments;
  const cutPoints = [];
  const streamers = new Set();

  // Loop through the segments array, starting from the second segment
  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];
    const materialId = segment.material_id;
    const start = segment.target_timerange.start / 1000000; // Convert to seconds
    const startSec = Math.floor(start); // round down to the nearest second
    const startMin = Math.floor(startSec / 60);
    const startTime =
      i === 1
        ? "00:00"
        : `${startMin}:${(startSec % 60).toString().padStart(2, "0")}`;

    const video = videos.find((video) => video.id === materialId);
    if (video && video.material_name) {
      const folderName =
        i === segments.length - 1
          ? "outro"
          : video.material_name
              .split("###")?.[1]
              ?.replace(".mp4", "")
              ?.toLowerCase(); // Retrieve original folder name
      if (cutPoints?.length > 0 && cutPoints.at(-1)?.includes(folderName))
        continue;
      cutPoints.push(`${startTime} ${folderName}`);
      streamers.add("https://twitch.tv/" + folderName);
    } else {
      cutPoints.push(startTime);
    }
  }

  return { streamers, cutPoints };
}

// Function to write cut points to the description file
function updateDescriptionFile({ streamers, cutPoints }) {
  let content = fs.readFileSync(descriptionPath, { encoding: "utf8" });
  const startMarker = content.indexOf("\n0:");
  const endMarker = content.indexOf("\nOutro");

  if (startMarker !== -1 && endMarker !== -1) {
    const before = content.substring(0, startMarker);
    const after = content.substring(endMarker);
    content = `${before}\n${cutPoints.join("\n")}\n${after}`;
    console.log("Cut points updated successfully to description.");
  } else {
    console.error("Cut points markers not found in the description file.");
  }

  const startMarker2 = content.indexOf("\nhttps");
  const endMarker2 = content.indexOf("\nTimeline");

  if (startMarker2 !== -1 && endMarker2 !== -1) {
    let before = content.substring(0, startMarker2);
    let after = content.substring(endMarker2);
    content = `${before}\n${Array.from(streamers).join("\n")}\n${after}`;
    console.log("Streamer credits updated successfully to description.");
  } else {
    console.error("Streamer credits markers not found in the description file.");
  }

  fs.writeFileSync(descriptionPath, content, { encoding: "utf8" });
}

// Main function to run the script
async function main() {
  try {
    const jsonData = readAndParseJSON(filePath);
    const d = generateDescriptions(jsonData);
    updateDescriptionFile(d);
  } catch (error) {
    console.error("Error processing the file:", error);
  }
}

main();
