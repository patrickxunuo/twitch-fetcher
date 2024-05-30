const fs = require("fs");
const path = require("path");
const util = require("util");
const { BASE_DOWNLOAD_PATH } = require("./config");

// Promisify fs methods to use async/await
const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);
const rename = util.promisify(fs.rename);

// Define the source and target directory
const today = new Date().toISOString().slice(0, 10);
const sourceDir = path.join(
  __dirname,
  `${BASE_DOWNLOAD_PATH}_${new Date().toISOString().slice(0, 10)}`,
);
const targetDir = path.join(__dirname, `flattened_clips_${today}`);

// Ensure the target directory exists
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir);
}

// Function to flatten directories and rename files to include their original directory
async function flattenDirectories(source, target) {
  try {
    const files = await readdir(source);
    let filePaths = [];

    // Get all file paths
    for (const file of files) {
      const fullPath = path.join(source, file);
      const fileStats = await stat(fullPath);

      if (fileStats.isDirectory()) {
        const innerFiles = await flattenDirectories(fullPath, target); // Recursively flatten directories
        filePaths = filePaths.concat(innerFiles);
      } else {
        // Store file path along with its original directory name for later renaming
        filePaths.push({ path: fullPath, dirName: path.basename(source) });
      }
    }

    // Randomize file array
    filePaths.sort(() => 0.5 - Math.random());

    // Move files to target directory with new names
    for (const fileData of filePaths) {
      if (!fileData) continue;
      const fileName = fileData.dirName + "_" + path.basename(fileData.path);
      const targetPath = path.join(target, fileName);
      await rename(fileData.path, targetPath);
      console.log(`Moved: ${fileData.path} -> ${targetPath}`);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the function
flattenDirectories(sourceDir, targetDir);
