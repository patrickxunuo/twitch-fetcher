const fs = require("fs");
const path = require("path");
const { getOAuthToken, fetchUserByUsername } = require("./twitchApi");
const { BROADCASTERS_FILE_PATH } = require("./config");

async function writeBroadcastersToFile(usernames) {
  const token = await getOAuthToken();
  let broadcasterData = [];

  for (let username of usernames) {
    const users = await fetchUserByUsername(username, token);
    if (users.length > 0) {
      broadcasterData.push({ username: username, id: users[0].id });
    } else {
      console.log(`User ${username} not found`);
    }
  }

  fs.writeFileSync(
    path.resolve(__dirname, BROADCASTERS_FILE_PATH),
    JSON.stringify(broadcasterData, null, 2),
  );
  console.log("Broadcaster IDs have been written to broadcasters.json");
}

// Example usage with Tyler1 and Midbeast
writeBroadcastersToFile([
  "loltyler1",
  "midbeast",
  "spear_shot",
  "thebausffs",
  "pobelter",
  "sanchovies",
  "lourlo",
  "xfsn_saber",
  "trick2g",
  "rush",
  "pekinwoof",
  "sloppywalrusx",
  "jankos",
  "dantes",
  "caedrel",
  "lol_nemesis",
  "llstylish",
  "drututt",
  "broxah",
  "autolykuslol",
  "gamergirl",
  "elite500",
  "stunt",
  "sirhcez",
  "cowsep",
  "gosu",
  "tobiasfate",
  "solarbacca",
  "foggedftw2",
  "bwipolol",
  "bobqinxd",
  "kev1ntv",
  "xdavemon",
  "forsen",
  "karasmai",
  "quantum",
  "akali",
  "horsey",
  "thewanderingpro",
  "naayil",
  "noway4u_sir",
  "agurin",
  "sneakylol",
  "pinkwardlol",
  "anniebot",
  "solorenektononly",
]).catch(console.error);
