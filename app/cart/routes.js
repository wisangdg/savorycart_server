const router = require("express").Router();
const { police_check } = require("../../middlewares");
const cartController = require("./controller.js");
const {
  cartValidator,
  cartUpdateValidator,
  idValidator,
} = require("../../middlewares/validator");

router.post(
  "/carts",
  police_check("create", "Cart"),
  cartValidator,
  cartController.store
);
router.put(
  "/carts/:id",
  police_check("update", "Cart"),
  idValidator,
  cartUpdateValidator,
  cartController.update
);
router.get("/carts", police_check("read", "Cart"), cartController.index);
router.delete(
  "/carts/:id",
  police_check("delete", "Cart"),
  idValidator,
  cartController.destroy
);

module.exports = router;
