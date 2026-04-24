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
      "Password harus mengandung huruf besar, huruf kecil, dan angka"
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

// Validasi untuk cart - lebih fleksibel untuk menerima berbagai format data
const cartValidator = [
  // Validasi custom untuk seluruh body request
  (req, res, next) => {
    console.log("Cart validator running with body:", JSON.stringify(req.body));

    // Ekstrak product ID dengan berbagai cara
    let productId = null;
    let qty = null;

    // Coba ekstrak dari format objek langsung
    if (req.body.product) {
      if (typeof req.body.product === "object" && req.body.product._id) {
        productId = req.body.product._id;
      } else if (typeof req.body.product === "string") {
        productId = req.body.product;
      }
      qty = req.body.qty;
    }
    // Coba ekstrak dari format array
    else if (Array.isArray(req.body) && req.body.length > 0) {
      const item = req.body[0];
      if (item.product) {
        if (typeof item.product === "object" && item.product._id) {
          productId = item.product._id;
        } else if (typeof item.product === "string") {
          productId = item.product;
        }
        qty = item.qty;
      }
    }

    console.log("Extracted productId:", productId);
    console.log("Extracted qty:", qty);

    // Validasi product ID
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

    // Validasi quantity
    if (!qty || isNaN(parseInt(qty)) || parseInt(qty) < 1) {
      return res.status(400).json({
        error: 1,
        message: "Quantity minimal 1",
      });
    }

    // Simpan data yang sudah divalidasi ke req untuk digunakan controller
    req.validatedCartData = {
      productId,
      qty: parseInt(qty),
    };

    next();
  },
];

// Validasi untuk alamat pengiriman
const addressValidator = [
  body("nama")
    .notEmpty()
    .withMessage("Nama tidak boleh kosong")
    .isLength({ min: 3, max: 100 })
    .withMessage("Nama harus antara 3-100 karakter")
    .trim()
    .escape(),

  body("provinsi")
    .notEmpty()
    .withMessage("Provinsi tidak boleh kosong")
    .trim()
    .escape(),

  body("kabupaten")
    .notEmpty()
    .withMessage("Kabupaten tidak boleh kosong")
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
  body("delivery_fee")
    .notEmpty()
    .withMessage("Biaya pengiriman tidak boleh kosong")
    .isNumeric()
    .withMessage("Biaya pengiriman harus berupa angka")
    .isFloat({ min: 0 })
    .withMessage("Biaya pengiriman tidak boleh negatif"),

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

// Validasi untuk update cart - lebih fleksibel seperti cartValidator
const cartUpdateValidator = [
  // Validasi custom untuk seluruh body request
  (req, res, next) => {
    console.log(
      "Cart update validator running with body:",
      JSON.stringify(req.body)
    );

    // Ekstrak product ID dengan berbagai cara
    let productId = null;
    let qty = null;

    // Coba ekstrak dari format objek langsung
    if (req.body.product) {
      if (typeof req.body.product === "object" && req.body.product._id) {
        productId = req.body.product._id;
      } else if (typeof req.body.product === "string") {
        productId = req.body.product;
      }
      qty = req.body.qty;
    }
    // Coba ekstrak dari format items array
    else if (
      req.body.items &&
      Array.isArray(req.body.items) &&
      req.body.items.length > 0
    ) {
      const item = req.body.items[0];
      if (item.product) {
        if (typeof item.product === "object" && item.product._id) {
          productId = item.product._id;
        } else if (typeof item.product === "string") {
          productId = item.product;
        }
        qty = item.qty;
      }
    }

    console.log("Extracted productId for update:", productId);
    console.log("Extracted qty for update:", qty);

    // Validasi product ID
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

    // Validasi quantity - untuk update, qty bisa negatif untuk mengurangi
    if (qty === undefined || qty === null || isNaN(parseInt(qty))) {
      return res.status(400).json({
        error: 1,
        message: "Quantity harus berupa angka",
      });
    }

    // Simpan data yang sudah divalidasi ke req untuk digunakan controller
    req.validatedCartData = {
      productId,
      qty: parseInt(qty),
    };

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
