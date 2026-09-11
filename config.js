const path = require("path");
const dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config();

module.exports = {
	rootPath: path.resolve(__dirname),
	secretKey: process.env.SECRET_KEY,
	serviceName: process.env.SERVICE_NAME || "SavoryCart",
	mongoUri: process.env.MONGODB_URI,
	dbHost: process.env.DB_HOST || "localhost",
	dbPort: process.env.DB_PORT || 27017,
	dbUser: process.env.DB_USER,
	dbPass: process.env.DB_PASS,
	dbName: process.env.DB_NAME || "savorycart",
	frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

	// Image optimization settings
	imageOptimization: {
		quality: 80,
		maxWidth: 1200,
		formats: ["webp", "jpeg"],
		cacheDuration: 60 * 60 * 24 * 7, // 7 days in seconds
	},
};
