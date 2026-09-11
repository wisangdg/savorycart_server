const { police_check } = require("../../middlewares/index.js");
const deliveryAddressController = require("./controller.js");
const {
	addressValidator,
	idValidator,
	paginationValidator,
} = require("../../middlewares/validator");

const router = require("express").Router();

router.post(
	"/delivery-addresses",
	police_check("create", "DeliveryAddress"),
	addressValidator,
	deliveryAddressController.store,
);

router.put(
	"/delivery-addresses/:id",
	police_check("update", "DeliveryAddress"),
	idValidator,
	addressValidator,
	deliveryAddressController.update,
);

router.delete(
	"/delivery-addresses/:id",
	police_check("delete", "DeliveryAddress"),
	idValidator,
	deliveryAddressController.destroy,
);

router.get(
	"/delivery-addresses",
	police_check("view", "DeliveryAddress"),
	paginationValidator,
	deliveryAddressController.index,
);

module.exports = router;
