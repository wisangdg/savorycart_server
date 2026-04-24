/**
 * Middleware untuk penanganan error secara terpusat
 * Memastikan format error yang konsisten dan menyembunyikan detail teknis dari client
 */

const config = require("../config");
const logger = require("../utils/logger");

// Kelas untuk error yang dihasilkan aplikasi
class AppError extends Error {
  constructor(
    statusCode,
    message,
    errorCode = "GENERAL_ERROR",
    details = null
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true; // Error yang diharapkan/dikendalikan

    Error.captureStackTrace(this, this.constructor);
  }
}

// Middleware untuk menangkap error yang tidak tertangani
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    404,
    `Resource tidak ditemukan: ${req.originalUrl}`,
    "RESOURCE_NOT_FOUND"
  );
  next(error);
};

// Middleware untuk menangani error
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Log error
  logError(error, req);

  // Default error
  let statusCode = error.statusCode || 500;
  let errorMessage = error.message || "Terjadi kesalahan pada server";
  let errorCode = error.errorCode || "INTERNAL_SERVER_ERROR";
  let errorDetails = error.details || null;

  // Tangani error MongoDB
  if (err.name === "CastError") {
    statusCode = 400;
    errorMessage = "Format data tidak valid";
    errorCode = "INVALID_DATA_FORMAT";
    errorDetails = { field: err.path };
  }

  // Tangani error validasi MongoDB
  if (err.name === "ValidationError") {
    statusCode = 400;
    errorMessage = "Validasi gagal";
    errorCode = "VALIDATION_ERROR";
    errorDetails = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message,
    }));
  }

  // Tangani error duplikat MongoDB
  if (err.code === 11000) {
    statusCode = 400;
    errorMessage = "Data duplikat ditemukan";
    errorCode = "DUPLICATE_DATA";
    errorDetails = {
      field: Object.keys(err.keyValue)[0],
      value: Object.values(err.keyValue)[0],
    };
  }

  // Tangani error JWT
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    errorMessage = "Token tidak valid";
    errorCode = "INVALID_TOKEN";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    errorMessage = "Token kedaluwarsa";
    errorCode = "TOKEN_EXPIRED";
  }

  // Tangani error multer
  if (err.code === "LIMIT_FILE_SIZE") {
    statusCode = 400;
    errorMessage = "Ukuran file terlalu besar";
    errorCode = "FILE_TOO_LARGE";
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    statusCode = 400;
    errorMessage = "Jenis file tidak didukung";
    errorCode = "UNSUPPORTED_FILE_TYPE";
  }

  // Tangani error ukuran payload terlalu besar
  if (err.type === "entity.too.large" || err.status === 413) {
    statusCode = 413;
    errorMessage = "Ukuran data terlalu besar";
    errorCode = "PAYLOAD_TOO_LARGE";
  }

  // Buat respons error
  const errorResponse = {
    error: 1,
    message: errorMessage,
    code: errorCode,
    ...(errorDetails && { details: errorDetails }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  };

  // Kirim respons
  res.status(statusCode).json(errorResponse);
};

// Fungsi untuk logging error
const logError = (error, req) => {
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
    user: req.user ? req.user._id : "unauthenticated",
    statusCode: error.statusCode || 500,
    errorCode: error.errorCode || "INTERNAL_SERVER_ERROR",
    message: error.message,
    stack: error.stack,
  };

  // Log error berdasarkan severity
  if (error.statusCode >= 500) {
    logger.error(logData);
  } else if (error.statusCode >= 400) {
    logger.warn(logData);
  } else {
    logger.info(logData);
  }
};

// Middleware untuk menangkap promise rejection yang tidak tertangani
const handleUncaughtExceptions = () => {
  process.on("uncaughtException", (err) => {
    logger.error({
      message: "UNCAUGHT EXCEPTION",
      error: err.message,
      stack: err.stack,
    });

    console.error("UNCAUGHT EXCEPTION! Shutting down...");
    console.error(err.name, err.message);

    // Keluar dari proses dengan status error
    process.exit(1);
  });

  process.on("unhandledRejection", (err) => {
    logger.error({
      message: "UNHANDLED REJECTION",
      error: err.message,
      stack: err.stack,
    });

    console.error("UNHANDLED REJECTION! Shutting down...");
    console.error(err.name, err.message);

    // Keluar dari proses dengan status error
    process.exit(1);
  });
};

module.exports = {
  AppError,
  notFoundHandler,
  errorHandler,
  handleUncaughtExceptions,
};
