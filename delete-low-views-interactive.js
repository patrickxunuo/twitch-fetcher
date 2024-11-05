const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { BASE_DOWNLOAD_PATH } = require("./config");

// Configuration
const DRY_RUN = false; // Set to false to actually delete files

/**
 * Creates an interface for reading user input
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Gets view count from filename
 * Filename format: clipId###broadcasterName###viewsCount###date.mp4
 */
function getViewCount(filename) {
  try {
    const viewsPart = filename.split("###")[2];
    if (!viewsPart) return 0;

    const views = parseInt(viewsPart.replace("views", ""));
    return isNaN(views) ? 0 : views;
  } catch (error) {
    console.error(
      `Error parsing views from filename ${filename}:`,
      error.message,
    );
    return 0;
  }
}

/**
 * Analyzes clips in directory before deletion
 */
function analyzeClips(dirPath, minViews) {
  const stats = {
    totalClips: 0,
    clipsToDelete: [],
    totalViews: 0,
    affectedBroadcasters: new Set(),
  };

  try {
    const files = fs
      .readdirSync(dirPath)
      .filter((file) => file.endsWith(".mp4"));

    stats.totalClips = files.length;

    files.forEach((file) => {
      const viewCount = getViewCount(file);
      const broadcasterName = file.split("###")[1];
      stats.totalViews += viewCount;

      if (viewCount < minViews) {
        stats.clipsToDelete.push({
          filename: file,
          views: viewCount,
          broadcaster: broadcasterName,
        });
        stats.affectedBroadcasters.add(broadcasterName);
      }
    });
  } catch (error) {
    console.error("Error analyzing clips:", error.message);
  }

  return stats;
}

/**
 * Confirms deletion with user
 */
async function confirmDeletion(stats, minViews) {
  const rl = createInterface();

  console.log("\nDeletion Analysis:");
  console.log("=================");
  console.log(`Total clips found: ${stats.totalClips}`);
  console.log(`Clips to be deleted: ${stats.clipsToDelete.length}`);
  console.log(`Affected broadcasters: ${stats.affectedBroadcasters.size}`);
  console.log(`Deletion criterion: < ${minViews} views`);

  if (stats.clipsToDelete.length > 0) {
    console.log("\nClips that will be deleted:");
    stats.clipsToDelete
      .sort((a, b) => b.views - a.views)
      .forEach((clip) => {
        console.log(
          `- ${clip.views.toString().padStart(5)} views | ${clip.broadcaster} | ${clip.filename}`,
        );
      });

    console.log("\nAffected broadcasters:");
    Array.from(stats.affectedBroadcasters)
      .sort()
      .forEach((broadcaster) => {
        const broadcasterClips = stats.clipsToDelete.filter(
          (clip) => clip.broadcaster === broadcaster,
        );
        console.log(`- ${broadcaster}: ${broadcasterClips.length} clips`);
      });
  }

  return new Promise((resolve) => {
    if (DRY_RUN) {
      console.log("\nDRY RUN MODE: No files will be actually deleted.");
      console.log(
        "To perform actual deletion, set DRY_RUN to false in the script.",
      );
      resolve(false);
      rl.close();
      return;
    }

    rl.question("\nProceed with deletion? (yes/no): ", (answer) => {
      rl.close();
      resolve(answer.toLowerCase().startsWith("y"));
    });
  });
}

/**
 * Deletes files based on view count threshold
 */
async function deleteFiles(dirPath, minViews) {
  const stats = analyzeClips(dirPath, minViews);

  if (stats.totalClips === 0) {
    console.log("No clips found in directory.");
    return;
  }

  if (stats.clipsToDelete.length === 0) {
    console.log(`No clips found with less than ${minViews} views.`);
    return;
  }

  const proceed = await confirmDeletion(stats, minViews);

  if (!proceed) {
    console.log("Deletion cancelled.");
    return;
  }

  let deletedCount = 0;
  let errorCount = 0;

  for (const clip of stats.clipsToDelete) {
    try {
      const filePath = path.join(dirPath, clip.filename);
      if (!DRY_RUN) {
        fs.unlinkSync(filePath);
      }
      console.log(`Deleted: ${clip.filename}`);
      deletedCount++;
    } catch (error) {
      console.error(`Error deleting ${clip.filename}:`, error.message);
      errorCount++;
    }
  }

  console.log("\nDeletion Summary:");
  console.log(`Successfully deleted: ${deletedCount} clips`);
  if (errorCount > 0) {
    console.log(`Failed to delete: ${errorCount} clips`);
  }
}

/**
 * Gets minimum view count from user
 */
async function getMinViews() {
  const rl = createInterface();

  return new Promise((resolve) => {
    rl.question("Enter minimum view count threshold: ", (answer) => {
      rl.close();
      const minViews = parseInt(answer);
      if (isNaN(minViews) || minViews < 0) {
        console.error("Please enter a valid positive number.");
        process.exit(1);
      }
      resolve(minViews);
    });
  });
}

/**
 * Main function
 */
async function main() {
  // Use the same path format as the clip downloader
  const todayPath = `${BASE_DOWNLOAD_PATH}_${new Date().toISOString().slice(0, 10)}`;

  if (!fs.existsSync(todayPath)) {
    console.error(`Directory not found: ${todayPath}`);
    console.error("No clips directory found for today.");
    process.exit(1);
  }

  console.log(`Operating on directory: ${todayPath}`);

  const minViews = await getMinViews();
  await deleteFiles(todayPath, minViews);
}

// Run the script
console.log("Starting cleanup process...");
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
