const app = require("./app");
const db = require("./database/index.js");
const config = require("./config");

// Validasi konfigurasi kritis
if (!config.secretKey) {
  console.error("Error: SECRET_KEY environment variable is required");
  process.exit(1);
}

db.on("open", () => {
  console.log("Database connection successful");
});

db.on("error", (err) => {
  console.error("Database connection error:", err);
});

module.exports = app;


w