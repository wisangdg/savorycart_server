/**
 * Controller untuk endpoint error logging
 */

const logger = require("../../utils/logger");

// Field yang diterima dari client beserta batas panjangnya. Field di luar
// daftar ini diabaikan agar tidak ada data sensitif/arbitrer yang ikut tercatat.
const ALLOWED_FIELDS = {
	error: 1000,
	message: 1000,
	url: 2048,
	userAgent: 500,
	componentStack: 4000,
	timestamp: 50,
};

const safeString = (value, maxLength) => {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
};

/**
 * Log error dari client
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const logClientError = (req, res) => {
	try {
		const body = req.body || {};
		const payload = {};

		for (const [field, maxLength] of Object.entries(ALLOWED_FIELDS)) {
			const value = safeString(body[field], maxLength);
			if (value !== undefined) payload[field] = value;
		}

		// Log error ke file
		logger.error({
			source: "client",
			...payload,
			ip: req.ip,
			user: req.user ? req.user._id : "unauthenticated",
		});

		// Kirim response sukses
		res.status(200).json({
			error: 0,
			message: "Error logged successfully",
		});
	} catch (err) {
		// Log error internal
		logger.error({
			source: "server",
			message: "Error logging client error",
			error: err.message,
			stack: err.stack,
		});

		// Kirim response error
		res.status(500).json({
			error: 1,
			message: "Failed to log error",
		});
	}
};

module.exports = {
	logClientError,
};
