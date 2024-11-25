function formatDate() {
  const date = new Date();
  const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Months are zero-indexed in JavaScript
  const day = date.getDate().toString().padStart(2, "0");
  return month + day;
}

function calculateViewIndex({ viewCount, clipAge, viewVelocity }) {
  // Constants for tuning the formula
  const TIME_DECAY_FACTOR = 0.95; // How quickly the score decays with time
  const VELOCITY_WEIGHT = 0.3; // Weight of view velocity in the final score

  // Calculate time decay multiplier (1.0 to TIME_DECAY_FACTOR)
  // Newer clips get closer to 1.0, older clips closer to TIME_DECAY_FACTOR
  const timeDecay =
    TIME_DECAY_FACTOR + (1 - TIME_DECAY_FACTOR) * Math.exp(-clipAge / 24);

  // Normalize view velocity (using log scale to handle extreme values)
  const normalizedVelocity = Math.log10(viewVelocity + 1) / Math.log10(1000);

  // Calculate base score from views (log scale to handle viral clips more fairly)
  const baseScore = Math.log10(viewCount + 1);

  // Combine factors without VOD engagement
  const viewIndex =
    baseScore * timeDecay * (1 + VELOCITY_WEIGHT * normalizedVelocity);

  return viewIndex;
}

module.exports = { formatDate, calculateViewIndex };
