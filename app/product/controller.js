const path = require("path");
const fs = require("fs-extra");
const sharp = require("sharp");
const config = require("../config.js");
const Product = require("./model.js");
const Category = require("../category/model.js");
const Tag = require("../tag/model.js");

// Format gambar yang diterima dan di-encode ulang oleh server.
// ponytail: hanya jpeg/png/webp agar output dijamin didukung;
// tambahkan gif/avif bila libvips di lingkungan deploy mendukungnya.
const IMAGE_EXTENSIONS = {
	jpeg: "jpg",
	png: "png",
	webp: "webp",
};
const PRODUCT_IMAGE_DIR = "public/images/products";

const productImagePath = (imageUrl) =>
	path.resolve(config.rootPath, PRODUCT_IMAGE_DIR, imageUrl || "");

const cleanupTempUpload = async (file) => {
	if (file?.path) await fs.remove(file.path).catch(() => {});
};

/**
 * Memvalidasi isi gambar dan menyimpannya dengan ekstensi hasil deteksi server,
 * bukan nama/konten yang dikirim client. Konten di-encode ulang agar payload
 * aktif (mis. SVG/HTML) tidak ikut tersimpan.
 */
const saveProductImage = async (file) => {
	const metadata = await sharp(file.path).metadata();
	const ext = IMAGE_EXTENSIONS[metadata.format];

	if (!ext) {
		const error = new Error("Format gambar tidak didukung");
		error.isUnsupportedImage = true;
		throw error;
	}

	const filename = `${file.filename}.${ext}`;
	const targetPath = productImagePath(filename);

	await fs.ensureDir(path.dirname(targetPath));
	await sharp(file.path)
		.rotate()
		.toFormat(metadata.format)
		.toFile(targetPath);
	await fs.remove(file.path).catch(() => {});

	return { filename, targetPath };
};

// Kategori & tag dikirim sebagai ObjectId (lihat validator productValidator).
// Referensi yang tidak ditemukan menghasilkan 400, bukan diam-diam dibuang.
const resolveReferences = async (payload) => {
	if (
		payload.category !== undefined &&
		payload.category !== null &&
		payload.category !== ""
	) {
		const category = await Category.findById(payload.category);
		if (!category) {
			return { error: "Kategori tidak ditemukan" };
		}
		payload.category = category._id;
	}

	if (payload.tags !== undefined && payload.tags !== null) {
		const uniqueIds = [...new Set(payload.tags.map(String))];
		const tags = await Tag.find({ _id: { $in: uniqueIds } });
		if (tags.length !== uniqueIds.length) {
			return { error: "Tag tidak ditemukan" };
		}
		payload.tags = tags.map((tag) => tag._id);
	}

	return {};
};

const store = async (req, res, next) => {
	try {
		let payload = { ...req.body };
		// image_url hanya boleh berasal dari file upload, bukan body mentah.
		delete payload.image_url;

		const refError = await resolveReferences(payload);
		if (refError.error) {
			return res.status(400).json({ error: 1, message: refError.error });
		}

		if (req.file) {
			const image = await saveProductImage(req.file);
			try {
				let product = new Product({
					...payload,
					image_url: image.filename,
				});
				await product.save();
				return res.json(product);
			} catch (err) {
				await fs.remove(image.targetPath).catch(() => {});
				throw err;
			}
		} else {
			let product = new Product(payload);
			await product.save();
			return res.json(product);
		}
	} catch (err) {
		await cleanupTempUpload(req.file);
		console.error("Error occurred:", err);
		if (err && err.isUnsupportedImage) {
			return res.status(400).json({ error: 1, message: err.message });
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

const update = async (req, res, next) => {
	try {
		let payload = { ...req.body };
		let { id } = req.params;

		// image_url hanya boleh berasal dari file upload, bukan body mentah.
		delete payload.image_url;

		const refError = await resolveReferences(payload);
		if (refError.error) {
			return res.status(400).json({ error: 1, message: refError.error });
		}

		if (req.file) {
			const image = await saveProductImage(req.file);
			try {
				const existing = await Product.findById(id);
				if (!existing) {
					await fs.remove(image.targetPath).catch(() => {});
					return res
						.status(404)
						.json({ error: 1, message: "Product not found" });
				}

				const updated = await Product.findByIdAndUpdate(
					id,
					{ ...payload, image_url: image.filename },
					{ new: true, runValidators: true },
				);

				// Hapus gambar lama hanya setelah update database berhasil
				if (
					existing.image_url &&
					existing.image_url !== image.filename
				) {
					await fs
						.remove(productImagePath(existing.image_url))
						.catch(() => {});
				}

				return res.json(updated);
			} catch (err) {
				await fs.remove(image.targetPath).catch(() => {});
				throw err;
			}
		} else {
			let product = await Product.findByIdAndUpdate(id, payload, {
				new: true,
				runValidators: true,
			});
			if (!product) {
				return res
					.status(404)
					.json({ error: 1, message: "Product not found" });
			}
			return res.json(product);
		}
	} catch (err) {
		await cleanupTempUpload(req.file);
		if (err && err.isUnsupportedImage) {
			return res.status(400).json({ error: 1, message: err.message });
		}
		if (err && err.name === "ValidationError") {
			return res.status(400).json({
				error: 1,
				message: err.message,
				fields: err.errors,
			});
		}
		next(err);
	}
};

const index = async (req, res, next) => {
	try {
		let { limit = 12, q = "", category = "", tags = [] } = req.query;
		limit = parseInt(limit) || 12;
		if (limit < 1) limit = 12;

		// Prioritaskan `page`; fallback ke `skip` untuk klien yang masih memakainya.
		const pageRaw = parseInt(req.query.page);
		const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : null;
		let skip;
		if (page !== null) {
			skip = (page - 1) * limit;
		} else {
			skip = parseInt(req.query.skip) || 0;
			if (skip < 0) skip = 0;
		}
		const currentPage = page !== null ? page : Math.floor(skip / limit) + 1;

		let criteria = {};
		if (q.length) {
			criteria.name = { $regex: q, $options: "i" };
		}

		if (category.length) {
			let categoryResult = await Category.findOne({
				name: { $regex: category, $options: "i" },
			});

			// Kategori tidak ditemukan -> hasil kosong, bukan seluruh katalog.
			criteria.category = categoryResult
				? categoryResult._id
				: { $in: [] };
		}

		if (tags.length) {
			let tagsResult = await Tag.find({ _id: { $in: tags } });
			// Tag tidak ditemukan -> $in kosong, menghasilkan daftar kosong.
			criteria.tags = { $in: tagsResult.map((tag) => tag._id) };
		}

		let count = await Product.find(criteria).countDocuments();
		let products = await Product.find(criteria)
			.skip(skip)
			.limit(limit)
			.populate("category")
			.populate("tags");
		return res.json({
			data: products,
			totalPages: Math.ceil(count / limit),
			currentPage,
			total: count,
		});
	} catch (err) {
		next(err);
	}
};

const destroy = async (req, res, next) => {
	try {
		let product = await Product.findByIdAndDelete(req.params.id);

		if (!product) {
			return res.json({
				error: 1,
				message: "Produk tidak ditemukan",
			});
		}

		if (product.image_url) {
			let currentImage = `${config.rootPath}/public/images/products/${product.image_url}`;
			if (fs.existsSync(currentImage)) {
				fs.unlinkSync(currentImage);
			}
		}

		return res.json(product);
	} catch (err) {
		next(err);
	}
};

module.exports = {
	store,
	index,
	update,
	destroy,
};
