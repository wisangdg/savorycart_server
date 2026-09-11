const { body, param, query, validationResult } = require("express-validator");
const mongoose = require("mongoose");

/**
 * Middleware untuk validasi input menggunakan express-validator
 */

// Fungsi untuk menangani hasil validasi
const validate = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({
			error: 1,
			message: "Validation error",
			errors: errors.array().map((error) => ({
				field: error.path,
				message: error.msg,
			})),
		});
	}
	next();
};

// Validasi untuk ObjectId MongoDB
const isValidObjectId = (value) => {
	return mongoose.Types.ObjectId.isValid(value);
};

// Validasi untuk registrasi user
const registerValidator = [
	body("full_name")
		.notEmpty()
		.withMessage("Nama lengkap tidak boleh kosong")
		.isLength({ min: 3, max: 50 })
		.withMessage("Nama lengkap harus antara 3-50 karakter")
		.trim()
		.escape(),

	body("email")
		.notEmpty()
		.withMessage("Email tidak boleh kosong")
		.isEmail()
		.withMessage("Format email tidak valid")
		.normalizeEmail(),

	body("password")
		.notEmpty()
		.withMessage("Password tidak boleh kosong")
		.isLength({ min: 6 })
		.withMessage("Password minimal 6 karakter")
		.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
		.withMessage(
			"Password harus mengandung huruf besar, huruf kecil, dan angka",
		),

	validate,
];

// Validasi untuk login
const loginValidator = [
	body("email")
		.notEmpty()
		.withMessage("Email tidak boleh kosong")
		.isEmail()
		.withMessage("Format email tidak valid")
		.normalizeEmail(),

	body("password").notEmpty().withMessage("Password tidak boleh kosong"),

	validate,
];

// Validasi untuk produk
const productValidator = [
	body("name")
		.notEmpty()
		.withMessage("Nama produk tidak boleh kosong")
		.isLength({ min: 3, max: 100 })
		.withMessage("Nama produk harus antara 3-100 karakter")
		.trim()
		.escape(),

	body("description")
		.optional()
		.isLength({ max: 1000 })
		.withMessage("Deskripsi maksimal 1000 karakter")
		.trim()
		.escape(),

	body("price")
		.notEmpty()
		.withMessage("Harga tidak boleh kosong")
		.isNumeric()
		.withMessage("Harga harus berupa angka")
		.isFloat({ min: 0 })
		.withMessage("Harga tidak boleh negatif"),

	body("category")
		.optional()
		.custom((value) => {
			if (value && !isValidObjectId(value)) {
				throw new Error("ID kategori tidak valid");
			}
			return true;
		}),

	body("tags")
		.optional()
		.isArray()
		.withMessage("Tags harus berupa array")
		.custom((value) => {
			if (value && value.some((tag) => !isValidObjectId(tag))) {
				throw new Error("ID tag tidak valid");
			}
			return true;
		}),

	validate,
];

// Validasi untuk kategori
const categoryValidator = [
	body("name")
		.notEmpty()
		.withMessage("Nama kategori tidak boleh kosong")
		.isLength({ min: 2, max: 50 })
		.withMessage("Nama kategori harus antara 2-50 karakter")
		.trim()
		.escape(),

	validate,
];

// Validasi untuk tag
const tagValidator = [
	body("name")
		.notEmpty()
		.withMessage("Nama tag tidak boleh kosong")
		.isLength({ min: 2, max: 50 })
		.withMessage("Nama tag harus antara 2-50 karakter")
		.trim()
		.escape(),

	validate,
];

// Ekstrak product ID dari body (objek langsung atau array item pertama)
const extractProductId = (body) => {
	if (!body) return null;
	if (body.product) {
		if (typeof body.product === "object" && body.product._id) {
			return body.product._id;
		}
		if (typeof body.product === "string") {
			return body.product;
		}
	}
	if (Array.isArray(body) && body.length > 0 && body[0].product) {
		const item = body[0];
		if (typeof item.product === "object" && item.product._id) {
			return item.product._id;
		}
		if (typeof item.product === "string") {
			return item.product;
		}
	}
	return null;
};

const parseQuantity = (value) => {
	if (value === undefined || value === null || value === "") return NaN;
	return Number(value);
};

// Validasi cart (POST): product dari body, qty integer positif opsional (default 1)
const cartValidator = [
	(req, res, next) => {
		const productId = extractProductId(req.body);

		if (!productId) {
			return res.status(400).json({
				error: 1,
				message: "ID produk tidak boleh kosong",
			});
		}

		if (!isValidObjectId(productId)) {
			return res.status(400).json({
				error: 1,
				message: "ID produk tidak valid",
			});
		}

		// qty opsional: default 1, jika dikirim harus integer positif.
		const rawQty = req.body?.qty;
		let qty = 1;
		if (rawQty !== undefined && rawQty !== null && rawQty !== "") {
			qty = parseQuantity(rawQty);
			if (!Number.isInteger(qty) || qty < 1) {
				return res.status(400).json({
					error: 1,
					message: "Quantity minimal 1",
				});
			}
		}

		req.validatedCartData = { productId, qty };
		next();
	},
];

// Validasi untuk alamat pengiriman
const addressValidator = [
	body("addressName")
		.notEmpty()
		.withMessage("Nama alamat tidak boleh kosong")
		.isLength({ min: 3, max: 255 })
		.withMessage("Nama alamat harus antara 3-255 karakter")
		.trim()
		.escape(),

	body("provinsi")
		.notEmpty()
		.withMessage("Provinsi tidak boleh kosong")
		.trim()
		.escape(),

	body("kabupatenkota")
		.notEmpty()
		.withMessage("Kabupaten/kota tidak boleh kosong")
		.trim()
		.escape(),

	body("kecamatan")
		.notEmpty()
		.withMessage("Kecamatan tidak boleh kosong")
		.trim()
		.escape(),

	body("kelurahan")
		.notEmpty()
		.withMessage("Kelurahan tidak boleh kosong")
		.trim()
		.escape(),

	body("detail")
		.notEmpty()
		.withMessage("Detail alamat tidak boleh kosong")
		.trim()
		.escape(),

	validate,
];

// Validasi untuk order
const orderValidator = [
	body("delivery_address")
		.notEmpty()
		.withMessage("Alamat pengiriman tidak boleh kosong")
		.custom((value) => {
			if (!isValidObjectId(value)) {
				throw new Error("ID alamat pengiriman tidak valid");
			}
			return true;
		}),

	validate,
];

// Validasi untuk ID parameter
const idValidator = [
	param("id")
		.notEmpty()
		.withMessage("ID tidak boleh kosong")
		.custom((value) => {
			if (!isValidObjectId(value)) {
				throw new Error("ID tidak valid");
			}
			return true;
		}),

	validate,
];

// Validasi untuk query parameter
const paginationValidator = [
	query("page")
		.optional()
		.isInt({ min: 1 })
		.withMessage("Halaman harus berupa angka positif"),

	query("limit")
		.optional()
		.isInt({ min: 1, max: 100 })
		.withMessage("Limit harus berupa angka antara 1-100"),

	query("skip")
		.optional()
		.isInt({ min: 0 })
		.withMessage("Skip harus berupa angka non-negatif"),

	validate,
];

// Validasi untuk search query
const searchValidator = [
	query("q")
		.optional()
		.isLength({ min: 1 })
		.withMessage("Query pencarian tidak boleh kosong")
		.trim()
		.escape(),

	validate,
];

// Validasi update cart (PUT): product dari :id URL, qty akhir integer >= 1
const cartUpdateValidator = [
	(req, res, next) => {
		const qty = parseQuantity(req.body?.qty);

		if (!Number.isInteger(qty) || qty < 1) {
			return res.status(400).json({
				error: 1,
				message: "Quantity minimal 1",
			});
		}

		req.validatedCartData = { qty };
		next();
	},
];

module.exports = {
	validate,
	registerValidator,
	loginValidator,
	productValidator,
	categoryValidator,
	tagValidator,
	cartValidator,
	cartUpdateValidator,
	addressValidator,
	orderValidator,
	idValidator,
	paginationValidator,
	searchValidator,
};
