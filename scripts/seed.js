/**
 * Seed data demo SavoryCart (idempotent, aman dijalankan berulang).
 *
 * Pemakaian: npm run seed
 *
 * PERINGATAN KEAMANAN: akun dan data di sini hanya untuk demo lokal.
 * Jangan deploy database hasil seed ini ke publik tanpa mengganti kredensial
 * (terutama akun admin) dan menonaktifkan endpoint admin yang tidak dipakai.
 */
const mongoose = require("mongoose");
const db = require("../database");

const User = require("../app/user/model");
const Category = require("../app/category/model");
const Tag = require("../app/tag/model");
const Product = require("../app/product/model");

const DEMO_CATEGORIES = ["Makanan", "Minuman", "Camilan", "Dessert"];

const DEMO_TAGS = [
	"Pedas",
	"Manis",
	"Sehat",
	"Favorit",
	"Baru",
	"Vegetarian",
	"Gorengan",
];

// image_url hanya nama file; disajikan dari /images/products/<file>.
const DEMO_PRODUCTS = [
	{
		name: "Nasi Goreng Spesial",
		description: "Nasi goreng dengan telur, ayam, dan sambal rumahan.",
		price: 28000,
		image_url: "0d1e96bfd4cd5662d24a18ce983b40a9.jpeg",
		category: "Makanan",
		tags: ["Pedas", "Favorit"],
	},
	{
		name: "Mie Ayam Bakso",
		description: "Mie ayam kenyal dengan bakso sapi dan kuah gurih.",
		price: 25000,
		image_url: "1492085b406b0f4d15cbadaee405762a.jpeg",
		category: "Makanan",
		tags: ["Favorit"],
	},
	{
		name: "Ayam Geprek Sambal Bawang",
		description: "Ayam crispy digeprek dengan sambal bawang pedas.",
		price: 32000,
		image_url: "1739b9d6763192e9ccbd984c3838fdab.jpeg",
		category: "Makanan",
		tags: ["Pedas", "Gorengan"],
	},
	{
		name: "Sate Ayam Madura",
		description: "Sepuluh tusuk sate ayam dengan bumbu kacang.",
		price: 35000,
		image_url: "25e586d2c7985cd59a77dc84327bf9ff.jpeg",
		category: "Makanan",
		tags: ["Favorit"],
	},
	{
		name: "Bakso Urat Jumbo",
		description: "Bakso urat jumbo dengan kuah kaldu sapi hangat.",
		price: 30000,
		image_url: "25e7d58b77d556565937dfda81ab65bb.jpg",
		category: "Makanan",
		tags: ["Favorit"],
	},
	{
		name: "Gado-Gado Segar",
		description: "Sayuran rebus dengan bumbu kacang dan kerupuk.",
		price: 22000,
		image_url: "29c5f8da185f0befacd8def3f8b90e1b.jpeg",
		category: "Makanan",
		tags: ["Sehat", "Vegetarian"],
	},
	{
		name: "Nasi Padang Rendang",
		description: "Rendang sapi empuk dengan nasi hangat dan sambal ijo.",
		price: 38000,
		image_url: "33142c25ed3144c9c4efb170c15d74e1.jpg",
		category: "Makanan",
		tags: ["Pedas", "Favorit"],
	},
	{
		name: "Es Teh Manis",
		description: "Teh manis dingin segar, teman makan paling pas.",
		price: 8000,
		image_url: "377c43714c012cd2619df9aa8b18d8f5.jpg",
		category: "Minuman",
		tags: ["Manis"],
	},
	{
		name: "Jus Alpukat",
		description: "Jus alpukat kental dengan susu dan gula aren.",
		price: 18000,
		image_url: "44a7390ba0f5db6e76e9a059803a73c7.jpg",
		category: "Minuman",
		tags: ["Sehat", "Manis"],
	},
	{
		name: "Pisang Goreng Keju",
		description: "Pisang goreng renyah dengan topping keju dan susu.",
		price: 15000,
		image_url: "6625e18cc7f39297441ee5daf0b39d45.jpeg",
		category: "Camilan",
		tags: ["Manis", "Gorengan"],
	},
	{
		name: "Tahu Crispy",
		description: "Tahu goreng crispy dengan bumbu tabur pedas.",
		price: 12000,
		image_url: "6eec062b54ff473da954e9af116c04f3.jpeg",
		category: "Camilan",
		tags: ["Pedas", "Gorengan", "Vegetarian"],
	},
	{
		name: "Puding Cokelat",
		description: "Puding cokelat lembut dengan saus vla vanilla.",
		price: 16000,
		image_url: "6f733b4fa78f3555713541944b68be90.jpeg",
		category: "Dessert",
		tags: ["Manis", "Baru"],
	},
];

// Kredensial demo — ganti sebelum dipakai di luar lokal.
const DEMO_USERS = [
	{
		full_name: "Admin SavoryCart",
		email: "admin@savorycart.test",
		password: "admin12345",
		role: "admin",
	},
	{
		full_name: "Demo Pelanggan",
		email: "demo@savorycart.test",
		password: "demo12345",
		role: "user",
	},
];

async function seed() {
	const categoryIds = {};
	for (const name of DEMO_CATEGORIES) {
		const doc = await Category.findOneAndUpdate(
			{ name },
			{ name },
			{ new: true, upsert: true, setDefaultsOnInsert: true },
		);
		categoryIds[name] = doc._id;
	}

	const tagIds = {};
	for (const name of DEMO_TAGS) {
		const doc = await Tag.findOneAndUpdate(
			{ name },
			{ name },
			{ new: true, upsert: true, setDefaultsOnInsert: true },
		);
		tagIds[name] = doc._id;
	}

	for (const product of DEMO_PRODUCTS) {
		await Product.findOneAndUpdate(
			{ name: product.name },
			{
				$set: {
					name: product.name,
					description: product.description,
					price: product.price,
					image_url: product.image_url,
					category: categoryIds[product.category],
					tags: product.tags.map((tag) => tagIds[tag]),
				},
			},
			{
				new: true,
				upsert: true,
				setDefaultsOnInsert: true,
				runValidators: true,
			},
		);
	}

	// User dibuat lewat save() agar pre-save hook tetap meng-hash password.
	for (const user of DEMO_USERS) {
		const exists = await User.findOne({ email: user.email });
		if (exists) {
			console.log(`Lewati user yang sudah ada: ${user.email}`);
			continue;
		}
		await User.create(user);
	}

	console.log(
		`Seed selesai: ${DEMO_CATEGORIES.length} kategori, ${DEMO_TAGS.length} tag, ` +
			`${DEMO_PRODUCTS.length} produk, ${DEMO_USERS.length} user.`,
	);
}

async function run() {
	try {
		await seed();
	} catch (err) {
		console.error("Seed gagal:", err.message);
		process.exitCode = 1;
	} finally {
		await mongoose.connection.close();
	}
}

if (mongoose.connection.readyState === 1) {
	run();
} else {
	mongoose.connection.once("open", run);
	mongoose.connection.on("error", (err) => {
		console.error("Koneksi database gagal:", err.message);
		process.exitCode = 1;
	});
}
