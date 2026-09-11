/**
 * Test ringan tanpa database (node:test, tanpa dependency baru).
 * Fokus pada logika murni: policy invoice, validasi cart, sanitizer password.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { subject } = require("@casl/ability");
const mongoose = require("mongoose");
const { policyFor } = require("../utils/index.js");
const { sanitizeRequest } = require("../utils/sanitizer.js");
const {
	cartValidator,
	cartUpdateValidator,
} = require("../middlewares/validator.js");

const PRODUCT_ID = "507f1f77bcf86cd799439011";

// Mock Express req/res untuk memanggil middleware secara langsung.
const runMiddleware = (middleware, req) => {
	const res = {
		statusCode: 200,
		body: null,
		status(code) {
			this.statusCode = code;
			return this;
		},
		json(payload) {
			this.body = payload;
			return this;
		},
	};

	let nextCalled = false;
	middleware(req, res, () => {
		nextCalled = true;
	});

	return { res, nextCalled };
};

test("invoice: user hanya boleh read invoice miliknya (bukan 'view')", () => {
	const user = { _id: "user-1", role: "user" };
	const ability = policyFor(user);

	assert.equal(
		ability.can("read", subject("Invoice", { user_id: "user-1" })),
		true,
	);
	assert.equal(
		ability.can("read", subject("Invoice", { user_id: "user-2" })),
		false,
	);
	// Route lama memakai 'view' yang tidak dimiliki user biasa.
	assert.equal(
		ability.can("view", subject("Invoice", { user_id: "user-1" })),
		false,
	);
});

test("invoice: perbandingan owner tetap benar untuk ObjectId", () => {
	const userId = new mongoose.Types.ObjectId();
	const otherId = new mongoose.Types.ObjectId();
	const ability = policyFor({ _id: userId, role: "user" });

	assert.equal(
		ability.can("read", subject("Invoice", { user_id: String(userId) })),
		true,
	);
	assert.equal(
		ability.can("read", subject("Invoice", { user_id: String(otherId) })),
		false,
	);
});

test("cart POST: qty default 1, menerima integer positif", () => {
	const req1 = { body: { product: PRODUCT_ID } };
	const out1 = runMiddleware(cartValidator[0], req1);
	assert.equal(out1.nextCalled, true);
	assert.equal(req1.validatedCartData.qty, 1);

	const req2 = { body: { product: { _id: PRODUCT_ID }, qty: "3" } };
	const out2 = runMiddleware(cartValidator[0], req2);
	assert.equal(out2.nextCalled, true);
	assert.equal(req2.validatedCartData.qty, 3);
});

test("cart POST: qty 0 / negatif / pecahan ditolak 400", () => {
	for (const qty of [0, -2, 2.5]) {
		const req = { body: { product: PRODUCT_ID, qty } };
		const out = runMiddleware(cartValidator[0], req);
		assert.equal(out.nextCalled, false);
		assert.equal(out.res.statusCode, 400);
	}
});

test("cart PUT: qty akhir integer >= 1 diterima, delta negatif ditolak", () => {
	const okReq = { body: { qty: 4 } };
	const ok = runMiddleware(cartUpdateValidator[0], okReq);
	assert.equal(ok.nextCalled, true);
	assert.equal(okReq.validatedCartData.qty, 4);

	const badReq = { body: { qty: -1 } };
	const bad = runMiddleware(cartUpdateValidator[0], badReq);
	assert.equal(bad.nextCalled, false);
	assert.equal(bad.res.statusCode, 400);
});

test("sanitizer: password tidak ditransformasi, field lain tetap disanitasi", () => {
	const req = {
		body: {
			email: "a@b.com",
			password: "<b>Secret</b>&raw",
			name: "<i>Hi</i>",
		},
		query: {},
		params: {},
	};

	sanitizeRequest(req, {}, () => {});

	assert.equal(req.body.password, "<b>Secret</b>&raw");
	assert.equal(req.body.name, "Hi");
});
