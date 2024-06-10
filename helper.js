function formatDate() {
  const date = new Date();
  const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Months are zero-indexed in JavaScript
  const day = date.getDate().toString().padStart(2, "0");
  return month + day;
}

module.exports = { formatDate };
