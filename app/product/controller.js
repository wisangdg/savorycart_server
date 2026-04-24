const path = require("path");
const fs = require("fs-extra");
const config = require("../config.js");
const Product = require("./model.js");
const Category = require("../category/model.js");
const Tag = require("../tag/model.js");

const store = async (req, res, next) => {
  try {
    let payload = req.body;

    if (payload.category) {
      let category = await Category.findOne({
        name: { $regex: payload.category, $options: "i" },
      });
      if (category) {
        payload.category = category._id;
      } else {
        delete payload.category;
      }
    }

    if (payload.tags && payload.tags.length > 0) {
      let tags = await Tag.find({
        name: { $in: payload.tags.map((tag) => new RegExp(tag, "i")) },
      });
      if (tags.length) {
        payload.tags = tags.map((tag) => tag._id);
      } else {
        delete payload.tags;
      }
    }

    if (req.file) {
      let tmp_path = req.file.path;
      let originalExt = req.file.originalname.split(".").pop();
      let filename = `${req.file.filename}.${originalExt}`;
      let target_path = path.resolve(
        config.rootPath,
        `public/images/products/${filename}`
      );

      await fs.ensureDir(path.dirname(target_path));

      const src = fs.createReadStream(tmp_path);
      const dest = fs.createWriteStream(target_path);
      src.pipe(dest);

      src.on("end", async () => {
        try {
          let product = new Product({ ...payload, image_url: filename });
          await product.save();
          return res.json(product);
        } catch (err) {
          if (fs.existsSync(target_path)) {
            fs.unlinkSync(target_path);
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
      });

      src.on("error", (err) => {
        next(err);
      });
    } else {
      let product = new Product(payload);
      await product.save();
      return res.json(product);
    }
  } catch (err) {
    console.error("Error occurred:", err);
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
    let payload = req.body;
    let { id } = req.params;

    if (payload.category) {
      let category = await Category.findOne({
        name: { $regex: payload.category, $options: "i" },
      });
      if (category) {
        payload.category = category._id;
      } else {
        delete payload.category;
      }
    }

    if (payload.tags && payload.tags.length > 0) {
      let tags = await Tag.find({
        _id: { $in: payload.tags },
      });
      if (tags.length) {
        payload.tags = tags.map((tag) => tag._id);
      } else {
        delete payload.tags;
      }
    }

    if (req.file) {
      let tmp_path = req.file.path;
      let originalExt = req.file.originalname.split(".").pop();
      let filename = `${req.file.filename}.${originalExt}`;
      let target_path = path.resolve(
        config.rootPath,
        `public/images/products/${filename}`
      );

      await fs.ensureDir(path.dirname(target_path));

      const src = fs.createReadStream(tmp_path);
      const dest = fs.createWriteStream(target_path);
      src.pipe(dest);

      src.on("end", async () => {
        try {
          let product = await Product.findById(id);
          if (!product) {
            return res
              .status(404)
              .json({ error: 1, message: "Product not found" });
          }

          let currentImage = `${config.rootPath}/public/images/products/${product.image_url}`;
          if (fs.existsSync(currentImage)) {
            fs.unlinkSync(currentImage);
          }

          product = await Product.findByIdAndUpdate(
            id,
            { ...payload, image_url: filename },
            { new: true, runValidators: true }
          );
          return res.json(product);
        } catch (err) {
          if (fs.existsSync(target_path)) {
            fs.unlinkSync(target_path);
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
      });

      src.on("error", (err) => {
        next(err);
      });
    } else {
      let product = await Product.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
      });
      if (!product) {
        return res.status(404).json({ error: 1, message: "Product not found" });
      }
      return res.json(product);
    }
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
    let { skip = 0, limit = 12, q = "", category = "", tags = [] } = req.query;
    skip = parseInt(skip) || 0;
    limit = parseInt(limit) || 12;
    let page = parseInt(req.query.page) || 1;

    let criteria = {};
    if (q.length) {
      criteria.name = { $regex: q, $options: "i" };
    }

    if (category.length) {
      let categoryResult = await Category.findOne({
        name: { $regex: category, $options: "i" },
      });

      if (categoryResult) {
        criteria.category = categoryResult._id;
      } else {
        // Handle case when category is not found
      }
    }

    if (tags.length) {
      let tagsResult = await Tag.find({ _id: { $in: tags } }); // Menggunakan _id langsung dari query params
      if (tagsResult.length > 0) {
        criteria.tags = { $in: tagsResult.map((tag) => tag._id) };
      }
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
      currentPage: page,
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
