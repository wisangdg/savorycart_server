const mongoose = require("mongoose");
const { model, Schema } = mongoose;

const cartItemSchema = Schema({
	qty: {
		type: Number,
		min: [1, "Minimal qty adalah 1"],
		required: [true, "qty harus diisi"],
	},
	price: {
		type: Number,
		default: 0,
	},
	image_url: String,

	user: {
		type: Schema.Types.ObjectId,
		ref: "User",
	},

	product: {
		type: Schema.Types.ObjectId,
		ref: "Product",
	},
});

// Satu user hanya boleh punya satu baris per produk (mencegah duplikasi dari race).
cartItemSchema.index({ user: 1, product: 1 }, { unique: true });

module.exports = model("CartItem", cartItemSchema);
