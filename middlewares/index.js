const { policyFor } = require("../utils/index.js");
const jwt = require("jsonwebtoken");
const config = require("../config.js");
const User = require("../app/user/model.js");
const { getToken } = require("../utils/index.js");
const tokenService = require("../app/auth/token.service.js");

const decodeToken = async (req, res, next) => {
  try {
    const token = getToken(req);

    if (!token) {
      // Jika tidak ada token, lanjutkan tanpa user terotentikasi
      return next();
    }

    // Periksa apakah token ada di blacklist
    const isBlacklisted = await tokenService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({
        error: 1,
        message: "Token has been revoked",
      });
    }

    // Verifikasi token dan dapatkan payload
    const payload = jwt.verify(token, config.secretKey);

    // Cari user berdasarkan ID dari payload token
    let user = await User.findById(payload._id);

    if (!user) {
      // Jika user tidak ditemukan (mungkin dihapus), kirim error
      return res.status(401).json({
        error: 1,
        message: "User not found or Token invalid",
      });
    }

    // Attach user dan payload ke request
    req.user = user;
    req.tokenPayload = payload;
    return next();
  } catch (err) {
    if (err && err.name === "JsonWebTokenError") {
      return res.status(401).json({
        // Gunakan status 401 untuk error otentikasi
        error: 1,
        message: err.message, // Contoh: 'jwt malformed', 'invalid signature', 'jwt expired'
      });
    } else if (err && err.name === "TokenExpiredError") {
      // Jika token expired, coba cek apakah ada refresh token di cookie
      if (req.cookies?.refreshToken) {
        // Redirect ke endpoint refresh token jika ini bukan request ke endpoint tersebut
        if (!req.originalUrl.includes("/auth/refresh-token")) {
          return res.status(401).json({
            error: 1,
            message: "Token expired",
            needsRefresh: true,
          });
        }
      }

      return res.status(401).json({
        error: 1,
        message: "Token expired",
      });
    }
    // Tangani error tak terduga lainnya
    console.error("Decode token unexpected error:", err);
    return res.status(500).json({
      error: 1,
      message: "Internal Server Error during token decoding",
    });
  }
};

// Middleware untuk memeriksa hak akses
function police_check(action, subject) {
  return function (req, res, next) {
    let policy = policyFor(req.user);
    if (!policy.can(action, subject)) {
      return res.json({
        error: 1,
        message: `You are not allowed to ${action} ${subject}`,
      });
    }
    next();
  };
}

module.exports = {
  decodeToken,
  police_check,
};
