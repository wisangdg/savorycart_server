const Order = require("../order/model.js");
const OrderItem = require("../order-item/model.js");
const DeliveryAddress = require("../deliveryAddress/model.js");
const CartItem = require("../cart-item/model.js");
const { Types } = require("mongoose");
const Invoice = require("../invoice/model");

const store = async (req, res, next) => {
  try {
    let { delivery_fee, delivery_address } = req.body;
    let items = await CartItem.find({ user: req.user._id }).populate("product");

    if (!items || items.length === 0) {
      return res.status(400).json({
        error: 1,
        message: "You cannot create order because you have no items in cart",
      });
    }

    let address = await DeliveryAddress.findById(delivery_address);
    if (!address) {
      return res.status(400).json({
        error: 1,
        message: "Delivery address not found",
      });
    }

    let sub_total = items.reduce((total, item) => {
      const price = parseInt(item.product.price) || 0;
      const qty = parseInt(item.quantity) || 1;
      return total + price * qty;
    }, 0);

    delivery_fee = parseInt(delivery_fee) || 0;

    let order = new Order({
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
      user: req.user._id,
    });

    let orderItems = await OrderItem.insertMany(
      items.map((item) => ({
        name: item.product.name,
        qty: parseInt(item.quantity) || 1,
        price: parseInt(item.product.price),
        order: order._id,
        product: item.product._id,
      }))
    );

    order.order_items = orderItems.map((item) => item._id);
    order.sub_total = sub_total;
    order.total = sub_total + delivery_fee;

    await order.save();

    let invoice = new Invoice({
      user: req.user._id,
      order: order._id,
      sub_total: order.sub_total,
      delivery_fee: order.delivery_fee,
      total: order.total,
      delivery_address: order.delivery_address,
      order_items: order.order_items,
    });
    await invoice.save();

    await CartItem.deleteMany({ user: req.user._id });

    return res.json(order);
  } catch (err) {
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
            0
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
