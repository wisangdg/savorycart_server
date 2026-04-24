const { subject } = require("@casl/ability");
const Invoice = require("./model");
const Order = require("../order/model");
const { policyFor } = require("../../utils/index.js");

const show = async (req, res, next) => {
  try {
    let { order_id } = req.params;
    console.log("User yang melakukan request:", req.user);
    console.log("Mencari invoice dengan order_id:", order_id);

    let invoice = await Invoice.findOne({ order: order_id })
      .populate("order")
      .populate("user")
      .populate({
        path: "order_items",
        model: "OrderItem",
      });

    console.log("Invoice yang ditemukan:", invoice);

    if (!invoice) {
      return res.status(404).json({
        error: 1,
        message: "Invoice tidak ditemukan",
      });
    }

    let policy = policyFor(req.user);
    let subjectInvoice = subject("Invoice", {
      ...invoice.toJSON(),
      user_id: invoice.user._id,
    });

    if (!policy.can("read", subjectInvoice)) {
      return res.status(403).json({
        error: 1,
        message: "Anda tidak memiliki akses untuk melihat invoice ini",
      });
    }

    console.log("Policy yang dibuat:", policy);
    console.log("Subject invoice:", subjectInvoice);

    return res.json(invoice);
  } catch (err) {
    console.error("Error lengkap:", err);
    console.error("Stack trace:", err.stack);
    return res.status(500).json({
      error: 1,
      message: "Terjadi kesalahan saat mengambil invoice",
    });
  }
};

const create = async (req, res, next) => {
  try {
    const { order_id } = req.body;
    console.log("Creating invoice for order_id:", order_id); // Log tambahan
    const order = await Order.findById(order_id).populate("order_items");

    if (!order) {
      return res.status(404).json({
        error: 1,
        message: "Order tidak ditemukan",
      });
    }

    const invoice = new Invoice({
      order: order._id,
      user: order.user,
      order_items: order.order_items,
      sub_total: order.sub_total,
      delivery_fee: order.delivery_fee,
      total: order.total,
      delivery_address: order.delivery_address,
    });

    await invoice.save();

    return res.status(201).json(invoice);
  } catch (err) {
    console.error("Error creating invoice:", err); // Log tambahan
    return res.status(500).json({
      error: 1,
      message: "Terjadi kesalahan saat membuat invoice",
    });
  }
};

module.exports = { show, create };
