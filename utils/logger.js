/**
 * Utilitas untuk logging
 * Menyediakan fungsi untuk logging dengan berbagai level severity
 */

const fs = require("fs");
const path = require("path");
const config = require("../config");

// Buat direktori logs jika belum ada (hanya jika diizinkan / bukan serverless read-only)
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
let canWriteLogs = !isServerless;

const logsDir = path.join(config.rootPath, "logs");
if (canWriteLogs) {
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  } catch (err) {
    canWriteLogs = false;
  }
}

// Path file log
const errorLogPath = path.join(logsDir, "error.log");
const combinedLogPath = path.join(logsDir, "combined.log");

// Ukuran maksimum file log dalam bytes (10MB)
const MAX_LOG_SIZE = 10 * 1024 * 1024;

// Fungsi untuk memeriksa ukuran file dan melakukan rotasi jika perlu
const checkAndRotateLogFile = (filePath) => {
  if (!canWriteLogs) {
    return;
  }

  try {
    if (!fs.existsSync(filePath)) {
      return;
    }

    const stats = fs.statSync(filePath);
    if (stats.size >= MAX_LOG_SIZE) {
      // Buat nama file backup dengan timestamp
      const timestamp = new Date().toISOString().replace(/:/g, "-");
      const backupPath = `${filePath}.${timestamp}`;

      // Rename file log saat ini menjadi file backup
      fs.renameSync(filePath, backupPath);

      // Buat file log baru
      fs.writeFileSync(filePath, "", { encoding: "utf8" });

      console.log(`Log rotated: ${filePath} -> ${backupPath}`);
    }
  } catch (err) {
    canWriteLogs = false;
  }
};

// Fungsi untuk menulis log ke file
const writeToFile = (filePath, data) => {
  if (!canWriteLogs) {
    return;
  }

  try {
    // Periksa dan rotasi file jika perlu
    checkAndRotateLogFile(filePath);

    const logEntry =
      typeof data === "string" ? data : JSON.stringify(data, null, 2);

    fs.appendFile(filePath, `${logEntry}\n`, { encoding: "utf8" }, (err) => {
      if (err) {
        console.error("Error writing to log file:", err);
      }
    });
  } catch (err) {
    canWriteLogs = false;
  }
};

// Fungsi untuk format log
const formatLog = (level, message) => {
  const timestamp = new Date().toISOString();

  if (typeof message === "object") {
    return {
      timestamp,
      level,
      ...message,
    };
  }

  return {
    timestamp,
    level,
    message,
  };
};

// Logger dengan berbagai level
const logger = {
  error: (message) => {
    const formattedLog = formatLog("error", message);
    console.error(formattedLog);
    writeToFile(errorLogPath, formattedLog);
    writeToFile(combinedLogPath, formattedLog);
  },

  warn: (message) => {
    const formattedLog = formatLog("warn", message);
    console.warn(formattedLog);
    writeToFile(combinedLogPath, formattedLog);
  },

  info: (message) => {
    const formattedLog = formatLog("info", message);
    console.info(formattedLog);
    writeToFile(combinedLogPath, formattedLog);
  },

  debug: (message) => {
    if (process.env.NODE_ENV === "development") {
      const formattedLog = formatLog("debug", message);
      console.debug(formattedLog);
      writeToFile(combinedLogPath, formattedLog);
    }
  },

  // Log request HTTP
  request: (req, res, responseTime) => {
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      user: req.user ? req.user._id : "unauthenticated",
    };

    // Log berdasarkan status code
    if (res.statusCode >= 500) {
      logger.error(logData);
    } else if (res.statusCode >= 400) {
      logger.warn(logData);
    } else {
      logger.info(logData);
    }
  },

  // Middleware untuk logging HTTP request
  requestLogger: (req, res, next) => {
    const start = Date.now();

    // Tambahkan listener untuk 'finish' event
    res.on("finish", () => {
      const responseTime = Date.now() - start;
      logger.request(req, res, responseTime);
    });

    next();
  },
};

module.exports = logger;
