const axios = require("axios");
const { getOAuthToken } = require("./twitchApi");
const { CLIENT_ID } = process.env;

// Function to get game ID for "League of Legends"
async function getGameId(gameName, token) {
  const url = "https://api.twitch.tv/helix/games";
  const headers = {
    "Client-ID": CLIENT_ID,
    Authorization: `Bearer ${token}`,
  };
  const params = {
    name: gameName,
  };
  const response = await axios.get(url, { headers, params });
  return response.data.data.length > 0 ? response.data.data[0].id : null;
}

// Function to fetch the top 10 streams for a given game ID
async function fetchTopStreams(gameId, token) {
  const url = "https://api.twitch.tv/helix/streams";
  const headers = {
    "Client-ID": CLIENT_ID,
    Authorization: `Bearer ${token}`,
  };
  const params = {
    game_id: gameId,
    first: 10, // Limit to top 10 streams
  };
  const response = await axios.get(url, { headers, params });
  return response.data.data;
}

// Main function to execute the script
async function main() {
  const token = await getOAuthToken();
  const gameId = await getGameId("League of Legends", token);
  if (!gameId) {
    console.log("Game not found");
    return;
  }
  const topStreams = await fetchTopStreams(gameId, token);
  console.log("Top 10 Most Viewed League of Legends Streamers:");
  topStreams.forEach((stream) => {
    console.log(`${stream.user_name} - ${stream.viewer_count} viewers`);
  });
}

main().catch(console.error);
