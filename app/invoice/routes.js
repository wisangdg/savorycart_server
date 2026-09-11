const router = require("express").Router();
const invoiceController = require("./controller");
const { police_check } = require("../../middlewares/index.js");

router.get(
	"/invoices/:order_id",
	police_check("read", "Invoice"),
	invoiceController.show,
);

router.post(
	"/invoices",
	police_check("create", "Invoice"),
	invoiceController.create,
);

module.exports = router;
