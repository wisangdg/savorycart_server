const Product = require("../product/model.js");
const CartItem = require("../cart-item/model.js");

const store = async (req, res, next) => {
  try {
    // Gunakan data yang sudah divalidasi oleh middleware
    const { productId: _id, qty } = req.validatedCartData;
    console.log("Using validated data - Product ID:", _id);
    console.log("Using validated data - Quantity:", qty);

    // Cek apakah produk ada di database
    const product = await Product.findById(_id); // Menggunakan _id
    if (!product) {
      return res.status(404).json({
        error: 1,
        message: "Product not found",
      });
    }

    // Cek apakah item sudah ada di keranjang
    const existingCartItem = await CartItem.findOne({
      user: req.user._id, // Pastikan req.user tersedia dari middleware autentikasi
      product: _id, // Menggunakan _id
    });

    if (existingCartItem) {
      // Jika sudah ada, tambahkan qty sebanyak 1
      existingCartItem.qty += 1;
      await existingCartItem.save();
      return res.status(200).json({
        error: 0,
        message: "Quantity updated in cart",
        data: existingCartItem,
      });
    } else {
      // Jika belum ada, tambahkan item baru ke keranjang
      const newCartItem = new CartItem({
        product: product._id,
        qty: 1, // Tambahkan 1 qty
        price: product.price,
        image_url: product.image_url,
        name: product.name,
        user: req.user._id, // Pastikan ini tersedia
      });

      await newCartItem.save();
      return res.status(201).json({
        error: 0,
        message: "Product added to cart",
        data: newCartItem,
      });
    }
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
    // Gunakan data yang sudah divalidasi oleh middleware
    const { productId, qty } = req.validatedCartData;
    console.log("Using validated data for update - Product ID:", productId);
    console.log("Using validated data for update - Quantity:", qty);

    const existingCartItem = await CartItem.findOne({
      user: req.user._id,
      product: productId,
    });

    if (existingCartItem) {
      existingCartItem.qty += qty;
      if (existingCartItem.qty <= 0) {
        await existingCartItem.deleteOne();
      } else {
        await existingCartItem.save();
      }
    } else if (qty > 0) {
      // Cek apakah produk ada di database
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          error: 1,
          message: "Product not found",
        });
      }

      const newCartItem = new CartItem({
        product: productId,
        qty,
        price: product.price,
        image_url: product.image_url,
        user: req.user._id,
      });
      await newCartItem.save();
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
      return res.status(404).json({ error: 1, message: "Cart item not found" });
    }

    return res.json(cart);
  } catch (error) {
    next(error);
  }
};

const index = async (req, res, next) => {
  try {
    let items = await CartItem.find({ user: req.user._id }).populate("product");

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
