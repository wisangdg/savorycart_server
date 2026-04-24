const router = require("express").Router();
const { police_check } = require("../../middlewares/index.js");
const categoryController = require("./controller.js");
const {
  categoryValidator,
  idValidator,
} = require("../../middlewares/validator");

router.get("/categories", categoryController.index);

router.post(
  "/categories",
  police_check("create", "Category"),
  categoryValidator,
  categoryController.store
);

router.put(
  "/categories/:id",
  police_check("update", "Category"),
  idValidator,
  categoryValidator,
  categoryController.update
);

router.delete(
  "/categories/:id",
  police_check("delete", "Category"),
  idValidator,
  categoryController.destroy
);

module.exports = router;
