const router = require("express").Router();
const multer = require("multer");
const os = require("os");
const productController = require("./controller.js");
const { police_check, decodeToken } = require("../../middlewares/index.js");
const {
  productValidator,
  idValidator,
  paginationValidator,
  searchValidator,
} = require("../../middlewares/validator");

router.get(
  "/products",
  paginationValidator,
  searchValidator,
  productController.index
);

router.post(
  "/products",
  decodeToken,
  multer({ dest: os.tmpdir() }).single("image"),
  police_check("create", "Product"),
  productValidator,
  productController.store
);

router.put(
  "/products/:id",
  multer({ dest: os.tmpdir() }).single("image"),
  police_check("update", "Product"),
  idValidator,
  productValidator,
  productController.update
);

router.delete(
  "/products/:id",
  police_check("delete", "Product"),
  idValidator,
  productController.destroy
);

module.exports = router;
