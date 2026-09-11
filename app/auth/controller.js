/**
 * @module auth/controller
 * @description Controller untuk autentikasi dan manajemen sesi pengguna
 */

const User = require("../user/model.js");
const bcrypt = require("bcrypt");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const config = require("../config.js");
const { getToken } = require("../../utils/index.js");
const tokenService = require("./token.service.js");

/**
 * @function register
 * @description Mendaftarkan pengguna baru ke sistem
 * @param {Object} req - Express request object
 * @param {Object} req.body - Data pengguna yang akan didaftarkan
 * @param {string} req.body.email - Email pengguna
 * @param {string} req.body.password - Password pengguna (akan di-hash)
 * @param {string} req.body.name - Nama pengguna
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Data pengguna yang berhasil didaftarkan (tanpa password)
 */
const register = async (req, res, next) => {
	try {
		// Whitelist field registrasi: jangan teruskan req.body mentah,
		// khususnya `role`, agar pengguna tidak dapat mendaftar sebagai admin.
		let user = new User({
			full_name: req.body.full_name,
			email: req.body.email,
			password: req.body.password,
		});
		await user.save();
		const { password, ...userWithoutPassword } = user.toObject();
		return res.json({
			error: 0,
			message: "Register successfully",
			data: userWithoutPassword,
		});
	} catch (err) {
		// Unique index pada email: tangani duplikat sebagai 409.
		if (err && err.code === 11000) {
			return res.status(409).json({
				error: 1,
				message: "Email sudah terdaftar",
			});
		}
		if (err && err.name === "ValidationError") {
			return res.json({
				error: 1,
				message: err.message,
				fields: err.errors,
			});
		}
		next(err);
	}
};

/**
 * @function localStrategy
 * @description Strategi autentikasi lokal untuk Passport.js
 * @param {string} email - Email pengguna
 * @param {string} password - Password pengguna (belum di-hash)
 * @param {Function} done - Callback function dari Passport.js
 * @returns {Function} Panggilan ke callback done dengan user jika berhasil
 */
const localStrategy = async (email, password, done) => {
	try {
		// +password karena skema menetapkan select:false pada field password
		let user = await User.findOne({ email }).select(
			"+password -__v -createdAt -updatedAt -cart_items -token",
		);
		if (!user) return done();
		if (bcrypt.compareSync(password, user.password)) {
			const { password: _password, ...userWithoutPassword } =
				user.toJSON();
			return done(null, userWithoutPassword);
		}
	} catch (err) {
		return done(err, null);
	}
	return done();
};

/**
 * @function login
 * @description Melakukan login pengguna dan membuat token akses
 * @param {Object} req - Express request object
 * @param {Object} req.body - Data login
 * @param {string} req.body.email - Email pengguna
 * @param {string} req.body.password - Password pengguna
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Data pengguna dan token akses
 */
const login = (req, res, next) => {
	passport.authenticate("local", async function (err, user) {
		if (err) return next(err);
		if (!user)
			return res.status(401).json({
				error: 1,
				message: "email or password incorrect",
			});

		try {
			// Buat payload untuk access token
			const payload = {
				_id: user._id,
				email: user.email,
				full_name: user.full_name,
				role: user.role,
			};

			const accessToken = tokenService.generateAccessToken(payload);

			const metadata = {
				userAgent: req.headers["user-agent"],
				ipAddress: req.ip,
			};
			const refreshToken = await tokenService.generateRefreshToken(
				user._id,
				metadata,
			);

			// Bersihkan cookie dari path lama agar tidak ada sesi ganda setelah update
			res.clearCookie("refreshToken", { path: "/auth/refresh-token" });
			res.cookie("refreshToken", refreshToken.token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production", // Gunakan HTTPS di production
				sameSite: "strict",
				maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari dalam milidetik
				path: "/", // Perlu terkirim ke /auth/logout dan /api agar sesi bisa dicabut/di-refresh
			}); // Kirim response dengan access token
			res.json({
				error: 0,
				message: "Login successfully",
				data: {
					user, // Mengembalikan data user (tanpa password dari localStrategy)
					token: accessToken,
				},
			});
		} catch (error) {
			console.error("Login error:", error);
			return res.status(500).json({
				error: 1,
				message: "Internal server error during login",
			});
		}
	})(req, res, next);
};

/**
 * @function logout
 * @description Melakukan logout pengguna, menghapus token akses dan refresh token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Pesan sukses logout
 */
const logout = async (req, res, next) => {
	try {
		// Get access token from Authorization header
		const accessToken = getToken(req);

		// Get refresh token from cookies
		const refreshToken = req.cookies?.refreshToken;

		// Revoke the refresh token if it exists
		// Blacklist the access token if it exists
		if (accessToken) {
			try {
				const decoded = jwt.verify(accessToken, config.secretKey, {
					ignoreExpiration: true,
				});
				const expiryDate = new Date(decoded.exp * 1000); // Convert to milliseconds
				await tokenService.blacklistToken(
					accessToken,
					decoded._id,
					expiryDate,
				);
			} catch (tokenError) {
				console.error(
					"Error decoding token during logout:",
					tokenError,
				);
				// Continue with logout even if token decoding fails
			}
		}

		// Revoke the refresh token if it exists
		if (refreshToken) {
			await tokenService.revokeRefreshToken(refreshToken);
		}

		// Hapus cookie di path baru maupun path lama
		res.clearCookie("refreshToken", {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			path: "/",
		});
		res.clearCookie("refreshToken", { path: "/auth/refresh-token" });

		return res.json({
			error: 0,
			message: "Logout berhasil",
		});
	} catch (err) {
		console.error("Logout error:", err);
		next(err);
	}
};

/**
 * @function me
 * @description Mendapatkan data pengguna yang sedang login
 * @param {Object} req - Express request object
 * @param {Object} req.user - Data pengguna dari middleware decodeToken
 * @param {Object} res - Express response object
 * @returns {Object} Data pengguna yang sedang login
 */
const me = (req, res) => {
	if (!req.user) {
		return res.status(401).json({
			error: 1,
			message: "You are not logged in or session expired",
		});
	}

	return res.json({
		error: 0,
		message: "User data retrieved successfully",
		data: req.user,
	});
};

/**
 * @function refreshToken
 * @description Endpoint untuk memperbarui access token menggunakan refresh token
 * @param {Object} req - Express request object
 * @param {Object} req.cookies - Cookies dari request
 * @param {string} req.cookies.refreshToken - Refresh token dari cookie
 * @param {Object} res - Express response object
 * @returns {Object} Access token baru dan data pengguna
 */
const refreshToken = async (req, res) => {
	try {
		// Dapatkan refresh token dari cookie
		const refreshTokenStr = req.cookies?.refreshToken;

		if (!refreshTokenStr) {
			return res.status(401).json({
				error: 1,
				message: "Refresh token not found",
			});
		}

		// Perbarui access token
		const result = await tokenService.refreshAccessToken(refreshTokenStr);

		if (!result) {
			// Hapus cookie jika refresh token tidak valid
			res.clearCookie("refreshToken", {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "strict",
				path: "/",
			});
			return res.status(401).json({
				error: 1,
				message: "Invalid or expired refresh token",
			});
		}

		// Kirim access token baru
		return res.json({
			error: 0,
			message: "Token refreshed successfully",
			data: {
				token: result.accessToken,
				user: result.user,
			},
		});
	} catch (error) {
		console.error("Refresh token error:", error);
		return res.status(500).json({
			error: 1,
			message: "Internal server error during token refresh",
		});
	}
};

module.exports = {
	register,
	localStrategy,
	login,
	logout,
	me,
	refreshToken,
};
