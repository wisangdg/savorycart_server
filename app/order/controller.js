const mongoose = require("mongoose");
const { Types } = mongoose;
const config = require("../config.js");
const Order = require("../order/model.js");
const OrderItem = require("../order-item/model.js");
const DeliveryAddress = require("../deliveryAddress/model.js");
const CartItem = require("../cart-item/model.js");
const Invoice = require("../invoice/model");

const restoreCartItems = async (items) =>
	CartItem.insertMany(
		items.map((item) => ({
			_id: item._id,
			user: item.user,
			product: item.product?._id,
			qty: item.qty,
			price: item.price,
			image_url: item.image_url,
		})),
	).catch((err) => {
		console.error("Cart restore failed:", err);
	});

// Transaksi tidak tersedia pada MongoDB standalone (butuh replica set/mongos).
const isTransactionUnsupported = (err) => {
	if (!err) return false;
	if (err.code === 20 || err.code === 251) return true;
	const message = String(err.message || "");
	return (
		/transaction/i.test(message) &&
		/(not supported|replica set|mongos|standalone|only allowed)/i.test(
			message,
		)
	);
};

/**
 * Membuat order + order items + invoice. Jika `session` diberikan, seluruh
 * operasi berjalan atomik dalam transaksi. Jika tidak, rollback manual
 * dijalankan saat terjadi kegagalan agar tidak menyisakan data yatim.
 */
const buildOrder = async (userId, deliveryAddressId, session) => {
	const sessionOpt = session ? { session } : {};
	const run = (query) => (session ? query.session(session) : query);
	const claimed = [];
	let order = null;
	let orderItems = [];

	try {
		const items = await run(CartItem.find({ user: userId })).populate(
			"product",
		);

		if (!items || items.length === 0) {
			const err = new Error("Keranjang kosong");
			err.code = "EMPTY_CART";
			throw err;
		}

		// Batasi ke alamat milik user ini agar tidak bisa memakai alamat pelanggan lain.
		const address = await run(
			DeliveryAddress.findOne({ _id: deliveryAddressId, user: userId }),
		);
		if (!address) {
			const err = new Error("Alamat pengiriman tidak ditemukan");
			err.code = "ADDRESS_NOT_FOUND";
			throw err;
		}

		// Pastikan semua produk masih ada dan quantity valid SEBELUM cart diklaim.
		for (const item of items) {
			if (!item.product || !item.product._id) {
				const err = new Error("Produk sudah tidak tersedia");
				err.code = "PRODUCT_MISSING";
				throw err;
			}
			const qty = parseInt(item.qty);
			if (!Number.isInteger(qty) || qty <= 0) {
				const err = new Error("Quantity tidak valid");
				err.code = "INVALID_QTY";
				throw err;
			}
		}

		// Klaim item cart satu per satu secara atomik. Bila ada item yang sudah
		// diklaim checkout lain, batalkan agar tidak terbentuk order ganda.
		for (const item of items) {
			const deleted = await run(
				CartItem.findOneAndDelete({ _id: item._id, user: userId }),
			);
			if (!deleted) {
				const err = new Error("Checkout sedang diproses");
				err.code = "CHECKOUT_CONFLICT";
				throw err;
			}
			claimed.push(item);
		}

		// Harga selalu dari server (produk ter-populate), bukan dari client.
		const sub_total = claimed.reduce((total, item) => {
			const price = parseInt(item.product?.price) || 0;
			const qty = parseInt(item.qty) || 1;
			return total + price * qty;
		}, 0);

		const delivery_fee = config.deliveryFee;

		order = new Order({
			_id: new Types.ObjectId(),
			status: "waiting payment",
			delivery_fee: delivery_fee,
			delivery_address: {
				provinsi: address.provinsi,
				kabupaten: address.kabupatenkota,
				kecamatan: address.kecamatan,
				kelurahan: address.kelurahan,
				detail: address.detail,
			},
			user: userId,
		});

		orderItems = await OrderItem.insertMany(
			claimed.map((item) => ({
				name: item.product?.name,
				qty: parseInt(item.qty) || 1,
				price: parseInt(item.product?.price),
				order: order._id,
				product: item.product?._id,
			})),
			sessionOpt,
		);

		order.order_items = orderItems.map((item) => item._id);
		order.sub_total = sub_total;
		order.total = sub_total + delivery_fee;

		await order.save(session ? { session } : undefined);

		// Invoice idempoten: upsert satu invoice per order.
		await Invoice.findOneAndUpdate(
			{ order: order._id },
			{
				$setOnInsert: {
					user: userId,
					order: order._id,
					sub_total: order.sub_total,
					delivery_fee: order.delivery_fee,
					total: order.total,
					delivery_address: order.delivery_address,
					order_items: order.order_items,
				},
			},
			{
				new: true,
				upsert: true,
				setDefaultsOnInsert: true,
				...sessionOpt,
			},
		);

		return order;
	} catch (err) {
		// Tanpa transaksi: buang artefak setengah jadi dan pulihkan item cart.
		if (!session) {
			try {
				if (order?._id) {
					await Invoice.deleteOne({ order: order._id });
					await OrderItem.deleteMany({ order: order._id });
					await Order.deleteOne({ _id: order._id });
				} else if (orderItems.length) {
					await OrderItem.deleteMany({
						_id: { $in: orderItems.map((item) => item._id) },
					});
				}
				if (claimed.length) await restoreCartItems(claimed);
			} catch (rollbackErr) {
				console.error("Checkout rollback failed:", rollbackErr);
			}
		}
		throw err;
	}
};

const store = async (req, res, next) => {
	const userId = req.user._id;
	const { delivery_address } = req.body;
	let order;

	try {
		// Coba transaksi MongoDB; fallback ke jalur manual bila tidak didukung.
		try {
			const session = await mongoose.startSession();
			try {
				await session.withTransaction(async () => {
					order = await buildOrder(userId, delivery_address, session);
				});
			} finally {
				await session.endSession();
			}
		} catch (err) {
			if (!isTransactionUnsupported(err)) throw err;
			console.warn(
				"MongoDB transactions unavailable, falling back to manual rollback.",
			);
			order = await buildOrder(userId, delivery_address, null);
		}

		return res.json(order);
	} catch (err) {
		if (err && err.code === "EMPTY_CART") {
			return res.status(400).json({
				error: 1,
				message:
					"You cannot create order because you have no items in cart",
			});
		}
		if (err && err.code === "ADDRESS_NOT_FOUND") {
			return res.status(400).json({
				error: 1,
				message: "Delivery address not found",
			});
		}
		if (err && err.code === "PRODUCT_MISSING") {
			return res.status(400).json({
				error: 1,
				message: "One or more products are no longer available",
			});
		}
		if (err && err.code === "INVALID_QTY") {
			return res.status(400).json({
				error: 1,
				message: "Invalid item quantity",
			});
		}
		if (err && err.code === "CHECKOUT_CONFLICT") {
			return res.status(409).json({
				error: 1,
				message: "Checkout sedang diproses. Coba lagi.",
			});
		}

		console.error("Order creation error:", err);
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
		let { skip = 0, limit = 10 } = req.query;

		let orders = await Order.find({ user: req.user._id })
			.skip(parseInt(skip))
			.limit(parseInt(limit))
			.populate("order_items")
			.sort("-createdAt");

		let count = await Order.find({ user: req.user._id }).countDocuments();

		return res.json({
			data: orders.map((order) => {
				const orderJson = order.toJSON({ virtuals: true });
				return {
					...orderJson,
					items_count: order.order_items.reduce(
						(total, item) => total + (item.qty || 0),
						0,
					),
				};
			}),
			count,
		});
	} catch (err) {
		console.error("Order fetch error:", err);
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

const deleteOrder = async (req, res, next) => {
	try {
		const { id } = req.params;
		await Order.findByIdAndDelete(id);
		return res.json({ message: "Order deleted successfully" });
	} catch (err) {
		console.error("Delete order error:", err);
		next(err);
	}
};

module.exports = {
	store,
	index,
	delete: deleteOrder,
};
