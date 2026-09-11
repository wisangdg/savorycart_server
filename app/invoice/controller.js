const { subject } = require("@casl/ability");
const Invoice = require("./model");
const Order = require("../order/model");
const { policyFor } = require("../../utils/index.js");

const show = async (req, res, next) => {
	try {
		let { order_id } = req.params;

		let invoice = await Invoice.findOne({ order: order_id })
			.populate("order")
			.populate("user")
			.populate({
				path: "order_items",
				model: "OrderItem",
			});

		if (!invoice) {
			return res.status(404).json({
				error: 1,
				message: "Invoice tidak ditemukan",
			});
		}

		const ownerId = invoice.user?._id || invoice.user;
		let policy = policyFor(req.user);
		// user_id sebagai string agar perbandingan CASL dengan ObjectId di policy benar.
		let subjectInvoice = subject("Invoice", {
			...invoice.toJSON(),
			user_id: ownerId ? String(ownerId) : null,
		});

		if (!ownerId || !policy.can("read", subjectInvoice)) {
			return res.status(403).json({
				error: 1,
				message: "Anda tidak memiliki akses untuk melihat invoice ini",
			});
		}

		return res.json(invoice);
	} catch (err) {
		console.error("Get invoice error:", err);
		return res.status(500).json({
			error: 1,
			message: "Terjadi kesalahan saat mengambil invoice",
		});
	}
};

const create = async (req, res, next) => {
	try {
		const { order_id } = req.body;
		const order = await Order.findById(order_id).populate("order_items");

		if (!order) {
			return res.status(404).json({
				error: 1,
				message: "Order tidak ditemukan",
			});
		}

		// Satu order hanya boleh punya satu invoice.
		const invoice = await Invoice.findOneAndUpdate(
			{ order: order._id },
			{
				$setOnInsert: {
					user: order.user,
					order_items: order.order_items,
					sub_total: order.sub_total,
					delivery_fee: order.delivery_fee,
					total: order.total,
					delivery_address: order.delivery_address,
				},
			},
			{ new: true, upsert: true, setDefaultsOnInsert: true },
		);

		return res.status(201).json(invoice);
	} catch (err) {
		if (err && err.code === 11000) {
			return res.status(409).json({
				error: 1,
				message: "Invoice untuk order ini sudah dibuat",
			});
		}
		console.error("Error creating invoice:", err);
		return res.status(500).json({
			error: 1,
			message: "Terjadi kesalahan saat membuat invoice",
		});
	}
};

module.exports = { show, create };
