const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config();

const { DB_HOST, DB_PASS, DB_NAME, DB_USER, MONGODB_URI } = process.env;

let connectionString = MONGODB_URI;
if (!connectionString) {
	if (DB_USER && DB_PASS && DB_HOST && DB_NAME) {
		connectionString = `mongodb+srv://${DB_USER}:${DB_PASS}@${DB_HOST}/${DB_NAME}?retryWrites=true&w=majority`;
	} else if (DB_HOST && DB_NAME) {
		connectionString = `mongodb://${DB_HOST}/${DB_NAME}`;
	}
}

let lastConnectionError = null;
let connectionPromise = null;

async function connectDb() {
	if (mongoose.connection.readyState === 1) {
		return mongoose.connection;
	}

	if (!connectionString) {
		lastConnectionError =
			"Variabel lingkungan database tidak ditemukan. Harap atur MONGODB_URI atau (DB_HOST, DB_NAME, DB_USER, DB_PASS) di Vercel Dashboard.";
		console.error(lastConnectionError);
		return null;
	}

	if (mongoose.connection.readyState === 2 && connectionPromise) {
		try {
			await connectionPromise;
			return mongoose.connection;
		} catch (err) {
			// lanjutkan rekoneksi jika gagal
		}
	}

	try {
		connectionPromise = mongoose.connect(connectionString, {
			serverSelectionTimeoutMS: 5000,
		});
		await connectionPromise;
		lastConnectionError = null;
		console.log("Berhasil terhubung ke MongoDB Atlas");
		return mongoose.connection;
	} catch (err) {
		lastConnectionError = err?.message || String(err);
		console.error("Gagal terhubung ke MongoDB Atlas:", lastConnectionError);
		return null;
	}
}

// Inisiasi koneksi di awal
if (connectionString) {
	connectDb().catch(() => {});
} else {
	lastConnectionError =
		"Variabel lingkungan database belum disetel di environment variables Vercel.";
}

const db = mongoose.connection;

db.on("error", (err) => {
	lastConnectionError = err?.message || String(err);
	console.error("Koneksi error:", err);
});

db.once("open", () => {
	lastConnectionError = null;
	console.log("Koneksi ke database berhasil dibuka");
});

module.exports = db;
module.exports.connectDb = connectDb;
module.exports.getLastError = () => lastConnectionError;
