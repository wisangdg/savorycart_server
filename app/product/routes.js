const router = require("express").Router();
const fs = require("fs");
const multer = require("multer");
const os = require("os");
const productController = require("./controller.js");
const { police_check, decodeToken } = require("../../middlewares/index.js");
const {
	productValidator,
	idValidator,
	paginationValidator,
	searchValidator,
} = require("../../middlewares/validator");

// Batas ukuran dan tipe file agar tidak bisa menyimpan file besar/sembarangan.
const upload = multer({
	dest: os.tmpdir(),
	limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
	fileFilter: (req, file, cb) => {
		if (!file.mimetype.startsWith("image/")) {
			return cb(new Error("Hanya file gambar yang diizinkan"));
		}
		cb(null, true);
	},
});

// Hapus file sementara bila request ditolak setelah upload (mis. gagal validasi),
// supaya file tidak menumpuk di direktori temp.
const cleanupRejectedUpload = (req, res, next) => {
	res.on("finish", () => {
		if (req.file?.path && res.statusCode >= 400) {
			fs.promises.rm(req.file.path, { force: true }).catch(() => {});
		}
	});
	next();
};

router.get(
	"/products",
	paginationValidator,
	searchValidator,
	productController.index,
);

// police_check sengaja dijalankan SEBELUM multer agar request tanpa izin
// tidak sempat menulis file ke disk.
router.post(
	"/products",
	decodeToken,
	police_check("create", "Product"),
	upload.single("image"),
	cleanupRejectedUpload,
	productValidator,
	productController.store,
);

router.put(
	"/products/:id",
	police_check("update", "Product"),
	idValidator,
	upload.single("image"),
	cleanupRejectedUpload,
	productValidator,
	productController.update,
);

router.delete(
	"/products/:id",
	police_check("delete", "Product"),
	idValidator,
	productController.destroy,
);

module.exports = router;
