# Dokumentasi Keamanan

Dokumen ini menjelaskan implementasi keamanan di aplikasi Eduwork E-Commerce.

## Autentikasi

### JWT (JSON Web Token)

Aplikasi ini menggunakan JWT untuk autentikasi. JWT terdiri dari tiga bagian:
- **Header**: Berisi algoritma yang digunakan
- **Payload**: Berisi data user (ID, email, nama, role)
- **Signature**: Tanda tangan digital untuk memverifikasi token

### Access Token dan Refresh Token

Aplikasi ini menggunakan dua jenis token:
- **Access Token**: Token dengan masa aktif pendek (15 menit) yang digunakan untuk autentikasi request API
- **Refresh Token**: Token dengan masa aktif panjang (7 hari) yang digunakan untuk mendapatkan access token baru

### Flow Autentikasi

1. User login dengan email dan password
2. Server memverifikasi kredensial
3. Server membuat access token dan refresh token
4. Access token dikirim ke client sebagai response
5. Refresh token disimpan di cookie httpOnly
6. Client menyimpan access token di localStorage
7. Client mengirim access token di header Authorization untuk request yang memerlukan autentikasi
8. Jika access token kedaluwarsa, client menggunakan refresh token untuk mendapatkan access token baru

### Implementasi

- `app/auth/controller.js`: Controller untuk autentikasi
- `app/auth/token.service.js`: Service untuk manajemen token
- `app/auth/token.model.js`: Model untuk token
- `middlewares/index.js`: Middleware untuk memverifikasi token

## Otorisasi

### Role-Based Access Control (RBAC)

Aplikasi ini menggunakan RBAC untuk otorisasi. Setiap user memiliki role yang menentukan akses:
- **user**: Pengguna biasa
- **admin**: Administrator dengan akses penuh

### Implementasi

- `middlewares/index.js`: Middleware untuk memeriksa role

## Keamanan Password

### Hashing Password

Aplikasi ini menggunakan bcrypt untuk hashing password. Bcrypt adalah algoritma hashing yang dirancang khusus untuk password dengan:
- **Salt**: Nilai random yang ditambahkan ke password sebelum hashing
- **Cost Factor**: Faktor yang menentukan kompleksitas hashing

### Implementasi

- `app/user/model.js`: Model user dengan pre-save hook untuk hashing password

## CORS (Cross-Origin Resource Sharing)

### Konfigurasi CORS

Aplikasi ini menggunakan CORS untuk mengontrol akses dari domain lain:
- **Origin**: Hanya domain yang ditentukan yang diizinkan
- **Methods**: Hanya method yang ditentukan yang diizinkan
- **Headers**: Hanya header yang ditentukan yang diizinkan
- **Credentials**: Mengizinkan credentials (cookies, authorization headers)

### Implementasi

- `app.js`: Konfigurasi CORS

## XSS (Cross-Site Scripting) Protection

### Sanitasi Input

Aplikasi ini menggunakan sanitasi input untuk mencegah XSS:
- **Sanitasi HTML**: Menghapus tag HTML berbahaya
- **Sanitasi JavaScript**: Menghapus kode JavaScript berbahaya

### Implementasi

- `utils/sanitizer.js`: Utilitas untuk sanitasi input
- `middlewares/index.js`: Middleware untuk sanitasi request

## CSRF (Cross-Site Request Forgery) Protection

### SameSite Cookies

Aplikasi ini menggunakan SameSite cookies untuk mencegah CSRF:
- **SameSite=Strict**: Cookie hanya dikirim pada request dari domain yang sama

### Implementasi

- `app/auth/controller.js`: Konfigurasi cookie untuk refresh token

## Rate Limiting

### Pembatasan Request

Aplikasi ini menggunakan rate limiting untuk mencegah brute force dan DoS:
- **Limit per IP**: Membatasi jumlah request per IP
- **Limit per User**: Membatasi jumlah request per user

### Implementasi

- `middlewares/index.js`: Middleware untuk rate limiting

## Logging Keamanan

### Audit Trail

Aplikasi ini menggunakan logging untuk audit trail:
- **Login/Logout**: Mencatat waktu dan IP address
- **Akses Sensitif**: Mencatat akses ke data sensitif
- **Perubahan Data**: Mencatat perubahan data penting

### Implementasi

- `utils/logger.js`: Utilitas untuk logging
- `app/auth/controller.js`: Logging untuk autentikasi

## Keamanan HTTP

### Security Headers

Aplikasi ini menggunakan security headers untuk meningkatkan keamanan:
- **Content-Security-Policy**: Mengontrol sumber daya yang diizinkan
- **X-Content-Type-Options**: Mencegah MIME sniffing
- **X-Frame-Options**: Mencegah clickjacking
- **X-XSS-Protection**: Mengaktifkan perlindungan XSS browser

### Implementasi

- `app.js`: Konfigurasi security headers

## Enkripsi Data

### HTTPS

Aplikasi ini menggunakan HTTPS untuk enkripsi data dalam transit:
- **TLS/SSL**: Mengenkripsi komunikasi antara client dan server

### Implementasi

- `bin/www`: Konfigurasi HTTPS server

## Keamanan Database

### Validasi Input

Aplikasi ini menggunakan validasi input untuk mencegah injeksi:
- **Mongoose Schema**: Mendefinisikan struktur dan validasi data
- **Query Sanitization**: Membersihkan input sebelum query

### Implementasi

- `app/*/model.js`: Model dengan validasi
- `middlewares/validator.js`: Middleware untuk validasi
