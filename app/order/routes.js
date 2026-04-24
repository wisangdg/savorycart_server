const router = require("express").Router();
const orderController = require("./controller.js");
const { police_check } = require("../../middlewares/index.js");
const {
  orderValidator,
  idValidator,
  paginationValidator,
} = require("../../middlewares/validator");

router.post(
  "/orders",
  police_check("create", "Order"),
  orderValidator,
  orderController.store
);

router.get(
  "/orders",
  police_check("view", "Order"),
  paginationValidator,
  orderController.index
);

router.delete(
  "/orders/:id",
  police_check("delete", "Order"),
  idValidator,
  orderController.delete
);

module.exports = router;
