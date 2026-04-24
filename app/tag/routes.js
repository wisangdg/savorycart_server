const router = require("express").Router();
const { police_check } = require("../../middlewares/index.js");
const tagController = require("./controller.js");
const { tagValidator, idValidator } = require("../../middlewares/validator");

router.get("/tags", tagController.index);

router.post(
  "/tags",
  police_check("create", "Tag"),
  tagValidator,
  tagController.store
);

router.put(
  "/tags/:id",
  police_check("update", "Tag"),
  idValidator,
  tagValidator,
  tagController.update
);

router.delete(
  "/tags/:id",
  police_check("delete", "Tag"),
  idValidator,
  tagController.destroy
);

module.exports = router;
