# Struktur Proyek Backend

Dokumen ini menjelaskan struktur proyek backend Eduwork E-Commerce.

## Struktur Direktori

```
eduwork-server/
├── app/                    # Modul aplikasi
│   ├── auth/               # Modul autentikasi
│   ├── cart/               # Modul keranjang belanja
│   ├── cart-item/          # Modul item keranjang
│   ├── category/           # Modul kategori
│   ├── deliveryAddress/    # Modul alamat pengiriman
│   ├── error/              # Modul error
│   ├── invoice/            # Modul faktur
│   ├── order/              # Modul pesanan
│   ├── order-item/         # Modul item pesanan
│   ├── product/            # Modul produk
│   ├── tag/                # Modul tag
│   ├── user/               # Modul pengguna
│   └── config.js           # Konfigurasi aplikasi
├── bin/                    # Script untuk menjalankan server
├── database/               # Konfigurasi database
├── middlewares/            # Middleware Express
├── public/                 # File statis
│   ├── cache/              # Cache gambar
│   ├── images/             # Gambar produk
│   ├── javascripts/        # JavaScript
│   └── stylesheets/        # CSS
├── scripts/                # Script utilitas
├── utils/                  # Utilitas
├── views/                  # Template view
├── app.js                  # Aplikasi Express
├── config.js               # Konfigurasi global
└── package.json            # Dependensi dan script
```

## Modul Utama

### Auth

- `app/auth/controller.js`: Controller untuk autentikasi
- `app/auth/routes.js`: Rute untuk autentikasi
- `app/auth/token.model.js`: Model untuk token
- `app/auth/token.service.js`: Service untuk manajemen token

### Cart

- `app/cart/controller.js`: Controller untuk keranjang belanja
- `app/cart/routes.js`: Rute untuk keranjang belanja
- `app/cart-item/model.js`: Model untuk item keranjang

### Category

- `app/category/controller.js`: Controller untuk kategori
- `app/category/model.js`: Model untuk kategori
- `app/category/routes.js`: Rute untuk kategori

### Delivery Address

- `app/deliveryAddress/controller.js`: Controller untuk alamat pengiriman
- `app/deliveryAddress/model.js`: Model untuk alamat pengiriman
- `app/deliveryAddress/routes.js`: Rute untuk alamat pengiriman

### Invoice

- `app/invoice/controller.js`: Controller untuk faktur
- `app/invoice/model.js`: Model untuk faktur
- `app/invoice/routes.js`: Rute untuk faktur

### Order

- `app/order/controller.js`: Controller untuk pesanan
- `app/order/model.js`: Model untuk pesanan
- `app/order/routes.js`: Rute untuk pesanan
- `app/order-item/model.js`: Model untuk item pesanan

### Product

- `app/product/controller.js`: Controller untuk produk
- `app/product/model.js`: Model untuk produk
- `app/product/routes.js`: Rute untuk produk

### Tag

- `app/tag/controller.js`: Controller untuk tag
- `app/tag/model.js`: Model untuk tag
- `app/tag/routes.js`: Rute untuk tag

### User

- `app/user/model.js`: Model untuk pengguna

## Middleware

- `middlewares/errorHandler.js`: Middleware untuk menangani error
- `middlewares/imageOptimizer.js`: Middleware untuk optimasi gambar
- `middlewares/index.js`: Middleware utama
- `middlewares/validator.js`: Middleware untuk validasi

## Utils

- `utils/index.js`: Utilitas umum
- `utils/logger.js`: Utilitas untuk logging
- `utils/sanitizer.js`: Utilitas untuk sanitasi input

## Database

- `database/index.js`: Konfigurasi koneksi database

## Scripts

- `scripts/cleanupTokens.js`: Script untuk membersihkan token yang kedaluwarsa
- `scripts/optimizeImages.js`: Script untuk optimasi gambar

## Konfigurasi

- `config.js`: Konfigurasi global
- `app.js`: Konfigurasi aplikasi Express

## Autentikasi

Aplikasi ini menggunakan JWT (JSON Web Token) untuk autentikasi. Flow autentikasi:

1. User login dengan email dan password
2. Server memverifikasi kredensial
3. Server membuat access token dan refresh token
4. Access token dikirim ke client sebagai response
5. Refresh token disimpan di cookie httpOnly
6. Client menyimpan access token di localStorage
7. Client mengirim access token di header Authorization untuk request yang memerlukan autentikasi
8. Jika access token kedaluwarsa, client menggunakan refresh token untuk mendapatkan access token baru

## Middleware Autentikasi

- `decodeToken`: Middleware untuk memverifikasi token dan menyimpan data user di `req.user`

## Error Handling

- `errorHandler`: Middleware untuk menangani error
- `notFoundHandler`: Middleware untuk menangani 404
- `handleUncaughtExceptions`: Fungsi untuk menangani uncaught exceptions

## Optimasi Gambar

- `imageOptimizer`: Middleware untuk optimasi gambar
- `scripts/optimizeImages.js`: Script untuk optimasi gambar batch

## Logging

- `utils/logger.js`: Utilitas untuk logging
- `morganLogger`: Middleware untuk logging HTTP request
