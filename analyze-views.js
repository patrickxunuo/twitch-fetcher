const fs = require("fs");
const path = require("path");
const { BASE_DOWNLOAD_PATH } = require("./config");

// View count ranges for analysis
const VIEW_RANGES = [
  { min: 0, max: 5, label: "< 5" },
  { min: 5, max: 10, label: "5-10" },
  { min: 10, max: 25, label: "10-25" },
  { min: 25, max: 50, label: "25-50" },
  { min: 50, max: 100, label: "50-100" },
  { min: 100, max: 250, label: "100-250" },
  { min: 250, max: 500, label: "250-500" },
  { min: 500, max: 1000, label: "500-1K" },
  { min: 1000, max: 5000, label: "1K-5K" },
  { min: 5000, max: Infinity, label: "5K+" },
];

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

function getViewRange(views) {
  return VIEW_RANGES.find((range) => views >= range.min && views < range.max);
}

function createBar(value, max, width = 30) {
  const barLength = Math.round((value / max) * width);
  return "█".repeat(barLength) + "░".repeat(width - barLength);
}

function analyzeClips(dirPath) {
  const stats = {
    ranges: VIEW_RANGES.reduce((acc, range) => {
      acc[range.label] = 0;
      return acc;
    }, {}),
    total: 0,
    maxViews: 0,
    avgViews: 0,
    totalViews: 0,
    broadcasters: new Set(),
    clips: [], // Store clip details for possible further analysis
  };

  try {
    const files = fs
      .readdirSync(dirPath)
      .filter((file) => file.endsWith(".mp4"));

    for (const file of files) {
      stats.total++;
      const viewCount = getViewCount(file);
      const broadcasterName = file.split("###")[1];

      // Store clip details
      stats.clips.push({
        filename: file,
        views: viewCount,
        broadcaster: broadcasterName,
      });

      if (broadcasterName) {
        stats.broadcasters.add(broadcasterName);
      }

      stats.totalViews += viewCount;
      stats.maxViews = Math.max(stats.maxViews, viewCount);

      const range = getViewRange(viewCount);
      if (range) {
        stats.ranges[range.label]++;
      }
    }

    stats.avgViews = Math.round(stats.totalViews / stats.total) || 0;
  } catch (error) {
    console.error(`Error analyzing clips:`, error.message);
  }

  return stats;
}

function printAnalysis(stats) {
  if (stats.total === 0) {
    console.log("No clips found in directory");
    return;
  }

  console.log("\nCLIP ANALYSIS SUMMARY");
  console.log("====================");
  console.log(`Total Clips: ${stats.total}`);
  console.log(`Total Views: ${stats.totalViews.toLocaleString()}`);
  console.log(`Average Views: ${stats.avgViews.toLocaleString()}`);
  console.log(`Max Views: ${stats.maxViews.toLocaleString()}`);
  console.log(`Unique Broadcasters: ${stats.broadcasters.size}`);

  console.log("\nView Distribution:");
  const maxCount = Math.max(...Object.values(stats.ranges));
  Object.entries(stats.ranges)
    .filter(([_, count]) => count > 0)
    .forEach(([range, count]) => {
      const percentage = ((count / stats.total) * 100).toFixed(1);
      console.log(
        `  ${range.padEnd(8)}: ${count.toString().padStart(4)} (${percentage.padStart(4)}%) ${createBar(count, maxCount)}`,
      );
    });

  // Print top clips
  const topClips = stats.clips.sort((a, b) => b.views - a.views).slice(0, 5);

  console.log("\nTop 5 Clips by Views:");
  topClips.forEach((clip, index) => {
    console.log(
      `${index + 1}. ${clip.views.toString().padStart(5)} views | ${clip.broadcaster}`,
    );
  });

  // Print broadcaster statistics
  const broadcasterStats = {};
  stats.clips.forEach((clip) => {
    if (!broadcasterStats[clip.broadcaster]) {
      broadcasterStats[clip.broadcaster] = {
        clips: 0,
        totalViews: 0,
      };
    }
    broadcasterStats[clip.broadcaster].clips++;
    broadcasterStats[clip.broadcaster].totalViews += clip.views;
  });

  const topBroadcasters = Object.entries(broadcasterStats)
    .sort((a, b) => b[1].totalViews - a[1].totalViews)
    .slice(0, 5);

  console.log("\nTop 5 Broadcasters by Total Views:");
  topBroadcasters.forEach(([broadcaster, stats], index) => {
    const avgViews = Math.round(stats.totalViews / stats.clips);
    console.log(`${index + 1}. ${broadcaster}`);
    console.log(
      `   Clips: ${stats.clips} | Total Views: ${stats.totalViews.toLocaleString()} | Avg: ${avgViews.toLocaleString()}`,
    );
  });
}

async function main() {
  // Use the same path format as the clip downloader
  const todayPath = `${BASE_DOWNLOAD_PATH}_${new Date().toISOString().slice(0, 10)}`;

  if (!fs.existsSync(todayPath)) {
    console.error(`Directory not found: ${todayPath}`);
    console.error("No clips directory found for today.");
    process.exit(1);
  }

  console.log(`Analyzing clips in: ${todayPath}`);
  const stats = analyzeClips(todayPath);
  printAnalysis(stats);
}

// Run the script
console.log("Starting clip analysis...");
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
