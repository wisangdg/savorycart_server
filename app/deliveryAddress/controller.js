const { subject } = require("@casl/ability");
const { policyFor } = require("../../utils/index.js");
const DeliveryAddress = require("./model.js");

// Field yang boleh diubah lewat API. `user` dan `_id` sengaja tidak termasuk
// agar kepemilikan tidak bisa dipindahkan.
const ADDRESS_FIELDS = [
	"addressName",
	"provinsi",
	"kabupatenkota",
	"kecamatan",
	"kelurahan",
	"detail",
];

const pickAddressFields = (body = {}) => {
	const payload = {};
	for (const field of ADDRESS_FIELDS) {
		if (body[field] !== undefined) payload[field] = body[field];
	}
	return payload;
};

const store = async (req, res, next) => {
	try {
		let address = new DeliveryAddress({
			...pickAddressFields(req.body),
			user: req.user._id,
		});
		await address.save();
		return res.json(address);
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

const update = async (req, res, next) => {
	try {
		let { id } = req.params;
		let address = await DeliveryAddress.findById(id);

		if (!address) {
			return res.status(404).json({
				error: 1,
				message: "Alamat pengiriman tidak ditemukan",
			});
		}

		let subjectAddress = subject("DeliveryAddress", {
			...address.toJSON(),
			user_id: String(address.user),
		});
		let policy = policyFor(req.user);
		if (!policy.can("update", subjectAddress)) {
			return res.status(403).json({
				error: 1,
				message: "You are not allowed to modify this resource",
			});
		}

		// Query berdasarkan _id + owner agar tidak bisa menyentuh milik user lain.
		address = await DeliveryAddress.findOneAndUpdate(
			{ _id: id, user: req.user._id },
			pickAddressFields(req.body),
			{ new: true, runValidators: true },
		);

		if (!address) {
			return res.status(404).json({
				error: 1,
				message: "Alamat pengiriman tidak ditemukan",
			});
		}

		return res.json(address);
	} catch (err) {
		if (err && err.name == "ValidationError") {
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
		let { id } = req.params;
		let address = await DeliveryAddress.findById(id);

		if (!address) {
			return res.status(404).json({
				error: 1,
				message: "Alamat pengiriman tidak ditemukan",
			});
		}

		let subjectAddress = subject("DeliveryAddress", {
			...address.toJSON(),
			user_id: String(address.user),
		});
		let policy = policyFor(req.user);
		if (!policy.can("delete", subjectAddress)) {
			return res.status(403).json({
				error: 1,
				message: "You are not allowed to delete this resource",
			});
		}

		address = await DeliveryAddress.findOneAndDelete({
			_id: id,
			user: req.user._id,
		});

		if (!address) {
			return res.status(404).json({
				error: 1,
				message: "Alamat pengiriman tidak ditemukan",
			});
		}

		return res.json(address);
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

const index = async (req, res, next) => {
	try {
		let { skip = 0, limit = 10 } = req.query;
		let count = await DeliveryAddress.find({
			user: req.user._id,
		}).countDocuments();
		let address = await DeliveryAddress.find({ user: req.user._id })
			.skip(parseInt(skip))
			.limit(parseInt(limit))
			.sort("-createdAt");

		return res.json({ data: address, count });
	} catch (err) {
		if (err && err.name == "ValidationError") {
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
	destroy,
	index,
};
