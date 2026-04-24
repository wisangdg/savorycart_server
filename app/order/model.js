const mongoose = require("mongoose");
const { model, Schema } = mongoose;
const AutoIncrement = require("mongoose-sequence")(mongoose);
const Invoice = require("../invoice/model");

const orderSchema = Schema(
  {
    status: {
      type: String,
      enum: ["waiting payment", "processing", "in_delivery", "delivered"],
      default: "waiting payment",
    },
    delivery_fee: {
      type: Number,
      default: 0,
    },
    sub_total: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    delivery_address: {
      provinsi: { type: String, required: [true, "Provinsi harus diisi"] },
      kabupaten: { type: String, required: [true, "Kabupaten harus diisi"] },
      kecamatan: { type: String, required: [true, "Kecamatan harus diisi"] },
      kelurahan: { type: String, required: [true, "Kelurahan harus diisi"] },
      detail: { type: String },
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    order_items: [{ type: Schema.Types.ObjectId, ref: "OrderItem" }],
  },
  { timestamps: true }
);

orderSchema.plugin(AutoIncrement, { inc_field: "order_number" });
orderSchema.virtual("items_count").get(function () {
  return this.order_items.reduce(
    (total, item) => total + (parseInt(item.qty) || 0),
    0
  );
});

// orderSchema.post("save", async function () {
//   let invoice = new Invoice({
//     user: this.user,
//     order: this._id,
//     sub_total: this.sub_total,
//     delivery_fee: this.delivery_fee,
//     total: this.total,
//     delivery_address: this.delivery_address,
//   });
//   await invoice.save();
// });

module.exports = model("Order", orderSchema);
