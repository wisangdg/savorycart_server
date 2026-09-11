const Product = require("../product/model.js");
const CartItem = require("../cart-item/model.js");

const store = async (req, res, next) => {
	try {
		// Data sudah divalidasi middleware; user selalu dari token (bukan body).
		const { productId, qty } = req.validatedCartData;

		const product = await Product.findById(productId);
		if (!product) {
			return res.status(404).json({
				error: 1,
				message: "Product not found",
			});
		}

		// Atomic upsert: hindari race yang menghasilkan baris cart ganda.
		let result;
		try {
			result = await CartItem.findOneAndUpdate(
				{ user: req.user._id, product: product._id },
				{
					$inc: { qty },
					$setOnInsert: {
						price: product.price,
						image_url: product.image_url,
					},
				},
				{
					new: true,
					upsert: true,
					runValidators: true,
					includeResultMetadata: true,
				},
			);
		} catch (err) {
			// Race pada unique index {user, product}: baris sudah dibuat proses lain,
			// ulangi sebagai update murni.
			if (err && err.code === 11000) {
				const doc = await CartItem.findOneAndUpdate(
					{ user: req.user._id, product: product._id },
					{ $inc: { qty } },
					{ new: true },
				);
				return res.status(200).json({
					error: 0,
					message: "Quantity updated in cart",
					data: doc,
				});
			}
			throw err;
		}

		const existed = Boolean(result.lastErrorObject?.updatedExisting);
		return res.status(existed ? 200 : 201).json({
			error: 0,
			message: existed
				? "Quantity updated in cart"
				: "Product added to cart",
			data: result.value,
		});
	} catch (err) {
		// Tangani ValidationError atau error lainnya
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

const update = async (req, res, next) => {
	try {
		// Produk dari :id URL (bukan body), qty adalah jumlah akhir (>= 1).
		const productId = req.params.id;
		const { qty } = req.validatedCartData;

		const product = await Product.findById(productId);
		if (!product) {
			return res.status(404).json({
				error: 1,
				message: "Product not found",
			});
		}

		// Atomic upsert dengan qty akhir.
		try {
			await CartItem.findOneAndUpdate(
				{ user: req.user._id, product: product._id },
				{
					$set: { qty },
					$setOnInsert: {
						price: product.price,
						image_url: product.image_url,
					},
				},
				{ new: true, upsert: true, runValidators: true },
			);
		} catch (err) {
			if (err && err.code === 11000) {
				await CartItem.findOneAndUpdate(
					{ user: req.user._id, product: product._id },
					{ $set: { qty } },
					{ new: true, runValidators: true },
				);
			} else {
				throw err;
			}
		}

		const updatedCartItems = await CartItem.find({
			user: req.user._id,
		}).populate("product");
		return res.json(updatedCartItems);
	} catch (err) {
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

const destroy = async (req, res, next) => {
	try {
		let cart = await CartItem.findOneAndDelete({
			user: req.user._id,
			product: req.params.id,
		});

		if (!cart) {
			return res
				.status(404)
				.json({ error: 1, message: "Cart item not found" });
		}

		return res.json(cart);
	} catch (error) {
		next(error);
	}
};

const index = async (req, res, next) => {
	try {
		let items = await CartItem.find({ user: req.user._id }).populate(
			"product",
		);

		return res.json(items);
	} catch (err) {
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

module.exports = {
	store,
	update,
	index,
	destroy,
};
