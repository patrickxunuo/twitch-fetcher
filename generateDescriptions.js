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
      const folderName = video.material_name.split("###")?.[0]; // Retrieve original folder name
      cutPoints.push(`${startTime} ${folderName}`);
    } else {
      cutPoints.push(startTime);
    }
  }

  return cutPoints;
}

// Function to write cut points to the description file
function updateDescriptionFile(cutPoints) {
  let content = fs.readFileSync(descriptionPath, { encoding: 'utf8' });
  const startMarker = content.indexOf('\n0:');
  const endMarker = content.indexOf('\nOutro');

  if (startMarker !== -1 && endMarker !== -1) {
    const before = content.substring(0, startMarker);
    const after = content.substring(endMarker);
    const newContent = `${before}\n${cutPoints.join('\n')}${after}`;
    fs.writeFileSync(descriptionPath, newContent, { encoding: 'utf8' });
    console.log('Description updated successfully.');
  } else {
    console.error('Markers not found in the description file.');
  }
}

// Main function to run the script
async function main() {
  try {
    const jsonData = readAndParseJSON(filePath);
    const cutPoints = generateDescriptions(jsonData);
    updateDescriptionFile(cutPoints);
  } catch (error) {
    console.error("Error processing the file:", error);
  }
}

main();
