const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const morganLogger = require("morgan");
const cors = require("cors");
const config = require("./config");
const { decodeToken } = require("./middlewares");
const imageOptimizer = require("./middlewares/imageOptimizer");
const { sanitizeRequest } = require("./utils/sanitizer");
const {
	notFoundHandler,
	errorHandler,
	handleUncaughtExceptions,
} = require("./middlewares/errorHandler");
const logger = require("./utils/logger");
const productRoute = require("./app/product/routes.js");
const categoryRoute = require("./app/category/routes.js");
const tagRoute = require("./app/tag/routes.js");
const authRoute = require("./app/auth/routes.js");
const deliveryAddressRoute = require("./app/deliveryAddress/routes.js");
const cartRoute = require("./app/cart/routes.js");
const orderRoute = require("./app/order/routes.js");
const invoiceRoute = require("./app/invoice/routes.js");
const errorRoute = require("./app/error/routes.js");
const app = express();
const mongoose = require("mongoose");

// Konfigurasi CORS yang mendukung credentials dan domain Vercel
const allowedOrigins = [
	config.frontendUrl,
	"https://eduwork-studi-kasus-front-end.vercel.app",
	"http://localhost:5173",
	"http://127.0.0.1:5173",
	"http://localhost:4173",
	"http://127.0.0.1:4173",
	"http://localhost:3000",
	"http://localhost:3004",
];

const corsOptions = {
	origin: function (origin, callback) {
		// Izinkan request tanpa origin (seperti curl, mobile app, server-to-server)
		if (!origin) return callback(null, true);

		// Izinkan jika ada di list eksplisit
		if (allowedOrigins.includes(origin)) {
			return callback(null, true);
		}

		// Izinkan semua preview & production deployment domain dari Vercel (*.vercel.app)
		if (/^https:\/\/.*\.vercel\.app$/.test(origin)) {
			return callback(null, true);
		}

		callback(new Error(`Origin ${origin} not allowed by CORS`));
	},
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
	allowedHeaders: [
		"Content-Type",
		"Authorization",
		"X-Requested-With",
		"Accept",
		"Origin",
	],
	exposedHeaders: ["Content-Disposition"],
	credentials: true,
	maxAge: 86400, // Cache preflight request selama 24 jam
	optionsSuccessStatus: 200, // untuk browser lama
};

app.use(cors(corsOptions));

// Handle preflight requests dengan opsi yang sama
app.options("*", cors(corsOptions));

// Middleware removed as morgan and custom logger already handle this

// Inisialisasi penanganan uncaught exceptions
handleUncaughtExceptions();

// Setup logging
app.use(morganLogger("dev"));
app.use(logger.requestLogger);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(config.secretKey)); // Signed cookies dengan secret key

// Sanitasi input untuk mencegah XSS
app.use(sanitizeRequest);

// Apply image optimization middleware before static files
app.use(imageOptimizer);

// Serve static files
app.use(
	express.static(path.join(__dirname, "public"), {
		maxAge: "1d", // Cache static assets for 1 day
		etag: true,
		lastModified: true,
	}),
);

const db = require("./database/index.js");

// Lightweight /api/ping health-check BEFORE auth & DB dependent middlewares
// so that the frontend can still know the server process is alive even if DB is down
app.get("/api/ping", async function (req, res) {
	if (mongoose.connection.readyState !== 1 && typeof db.connectDb === "function") {
		await db.connectDb();
	}
	res.json({
		status: "ok",
		message: "Server is running",
		db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
		readyState: mongoose.connection.readyState,
		dbError: typeof db.getLastError === "function" ? db.getLastError() : null,
		timestamp: new Date().toISOString(),
	});
});

// Simple DB health guard – if database not connected yet, try connecting or short‑circuit data routes
async function dbHealthGuard(req, res, next) {
	if (mongoose.connection.readyState === 1) return next();

	if (typeof db.connectDb === "function") {
		await db.connectDb();
	}

	const state = mongoose.connection.readyState;
	if (state === 1) return next();
	if (state === 2) {
		return res.status(503).json({
			error: 1,
			code: "DB_CONNECTING",
			message: "Database is still connecting, please retry shortly",
		});
	}
	return res.status(503).json({
		error: 1,
		code: "DB_UNAVAILABLE",
		message: "Database is not available",
		details: typeof db.getLastError === "function" ? db.getLastError() : undefined,
	});
}

app.use(decodeToken);

app.use("/auth", authRoute);
// Apply DB health guard only to routes that actually need DB access
app.use("/api", dbHealthGuard, productRoute);
app.use("/api", dbHealthGuard, categoryRoute);
app.use("/api", dbHealthGuard, tagRoute);
app.use("/api", dbHealthGuard, deliveryAddressRoute);
app.use("/api", dbHealthGuard, cartRoute);
app.use("/api", dbHealthGuard, orderRoute);
app.use("/api", dbHealthGuard, invoiceRoute);
app.use("/api", errorRoute);

//home
app.get("/", function (req, res) {
	res.json({
		message: config.serviceName,
		status: "Running",
	});
});

// (moved the /api/ping endpoint above so it stays functional even if DB/auth fail)

// Penanganan 404 (route tidak ditemukan)
app.use(notFoundHandler);

// Penanganan error global
app.use(errorHandler);

module.exports = app;
