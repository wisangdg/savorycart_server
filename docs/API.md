# Dokumentasi API Eduwork E-Commerce

Dokumentasi ini menjelaskan endpoint API yang tersedia di aplikasi Eduwork E-Commerce.

## Autentikasi

### Register

Mendaftarkan pengguna baru ke sistem.

- **URL**: `/auth/register`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "name": "Nama Pengguna",
    "email": "user@example.com",
    "password": "password123",
    "role": "user"
  }
  ```
- **Response Success**:
  ```json
  {
    "_id": "user_id",
    "name": "Nama Pengguna",
    "email": "user@example.com",
    "role": "user"
  }
  ```
- **Response Error**:
  ```json
  {
    "error": 1,
    "message": "Pesan error",
    "fields": {
      "email": {
        "message": "Email sudah terdaftar"
      }
    }
  }
  ```

### Login

Melakukan login pengguna dan mendapatkan token akses.

- **URL**: `/auth/login`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response Success**:
  ```json
  {
    "message": "Login successfully",
    "user": {
      "_id": "user_id",
      "name": "Nama Pengguna",
      "email": "user@example.com",
      "role": "user"
    },
    "token": "access_token_string"
  }
  ```
- **Response Error**:
  ```json
  {
    "error": 1,
    "message": "email or password incorrect"
  }
  ```

### Logout

Melakukan logout pengguna dan menghapus token.

- **URL**: `/auth/logout`
- **Method**: `POST`
- **Headers**: 
  - `Authorization: Bearer access_token`
- **Response Success**:
  ```json
  {
    "error": 0,
    "message": "Logout berhasil"
  }
  ```

### Me

Mendapatkan data pengguna yang sedang login.

- **URL**: `/auth/me`
- **Method**: `GET`
- **Headers**: 
  - `Authorization: Bearer access_token`
- **Response Success**:
  ```json
  {
    "_id": "user_id",
    "name": "Nama Pengguna",
    "email": "user@example.com",
    "role": "user"
  }
  ```
- **Response Error**:
  ```json
  {
    "error": 1,
    "message": "You are not logged in or session expired"
  }
  ```

### Refresh Token

Memperbarui access token menggunakan refresh token.

- **URL**: `/auth/refresh-token`
- **Method**: `GET`
- **Cookies**: 
  - `refreshToken: refresh_token_string`
- **Response Success**:
  ```json
  {
    "error": 0,
    "message": "Token refreshed successfully",
    "token": "new_access_token_string",
    "user": {
      "_id": "user_id",
      "name": "Nama Pengguna",
      "email": "user@example.com",
      "role": "user"
    }
  }
  ```
- **Response Error**:
  ```json
  {
    "error": 1,
    "message": "Invalid or expired refresh token"
  }
  ```

## Produk

### Mendapatkan Semua Produk

Mendapatkan daftar semua produk dengan pagination.

- **URL**: `/api/products`
- **Method**: `GET`
- **Query Parameters**:
  - `limit`: Jumlah produk per halaman (default: 10)
  - `skip`: Jumlah produk yang dilewati (default: 0)
  - `q`: Kata kunci pencarian (opsional)
  - `category`: ID kategori (opsional)
  - `tags`: ID tag, bisa multiple dengan koma (opsional)
- **Response Success**:
  ```json
  {
    "data": [
      {
        "_id": "product_id",
        "name": "Nama Produk",
        "description": "Deskripsi produk",
        "price": 100000,
        "image_url": "/images/products/product_image.jpg",
        "category": {
          "_id": "category_id",
          "name": "Nama Kategori"
        },
        "tags": [
          {
            "_id": "tag_id",
            "name": "Nama Tag"
          }
        ]
      }
    ],
    "count": 100,
    "totalPages": 10,
    "currentPage": 1
  }
  ```

### Mendapatkan Detail Produk

Mendapatkan detail produk berdasarkan ID.

- **URL**: `/api/products/:id`
- **Method**: `GET`
- **Response Success**:
  ```json
  {
    "_id": "product_id",
    "name": "Nama Produk",
    "description": "Deskripsi produk",
    "price": 100000,
    "image_url": "/images/products/product_image.jpg",
    "category": {
      "_id": "category_id",
      "name": "Nama Kategori"
    },
    "tags": [
      {
        "_id": "tag_id",
        "name": "Nama Tag"
      }
    ]
  }
  ```

## Kategori

### Mendapatkan Semua Kategori

Mendapatkan daftar semua kategori.

- **URL**: `/api/categories`
- **Method**: `GET`
- **Response Success**:
  ```json
  [
    {
      "_id": "category_id",
      "name": "Nama Kategori"
    }
  ]
  ```

## Tag

### Mendapatkan Semua Tag

Mendapatkan daftar semua tag.

- **URL**: `/api/tags`
- **Method**: `GET`
- **Response Success**:
  ```json
  [
    {
      "_id": "tag_id",
      "name": "Nama Tag"
    }
  ]
  ```

## Keranjang Belanja

### Mendapatkan Keranjang Belanja

Mendapatkan daftar item di keranjang belanja pengguna.

- **URL**: `/api/carts`
- **Method**: `GET`
- **Headers**: 
  - `Authorization: Bearer access_token`
- **Response Success**:
  ```json
  {
    "items": [
      {
        "_id": "cart_item_id",
        "product": {
          "_id": "product_id",
          "name": "Nama Produk",
          "price": 100000,
          "image_url": "/images/products/product_image.jpg"
        },
        "qty": 2,
        "price": 100000,
        "subtotal": 200000
      }
    ],
    "total": 200000,
    "count": 2
  }
  ```

### Menambahkan Item ke Keranjang

Menambahkan produk ke keranjang belanja.

- **URL**: `/api/carts`
- **Method**: `PUT`
- **Headers**: 
  - `Authorization: Bearer access_token`
- **Request Body**:
  ```json
  {
    "items": [
      {
        "product": "product_id",
        "qty": 2
      }
    ]
  }
  ```
- **Response Success**:
  ```json
  {
    "items": [
      {
        "_id": "cart_item_id",
        "product": {
          "_id": "product_id",
          "name": "Nama Produk",
          "price": 100000,
          "image_url": "/images/products/product_image.jpg"
        },
        "qty": 2,
        "price": 100000,
        "subtotal": 200000
      }
    ],
    "total": 200000,
    "count": 2
  }
  ```

## Alamat Pengiriman

### Mendapatkan Alamat Pengiriman

Mendapatkan daftar alamat pengiriman pengguna.

- **URL**: `/api/delivery-addresses`
- **Method**: `GET`
- **Headers**: 
  - `Authorization: Bearer access_token`
- **Response Success**:
  ```json
  [
    {
      "_id": "address_id",
      "name": "Rumah",
      "provinsi": "DKI Jakarta",
      "kabupaten": "Jakarta Selatan",
      "kecamatan": "Pancoran",
      "kelurahan": "Kalibata",
      "detail": "Jalan Kalibata Utara No. 123",
      "user": "user_id"
    }
  ]
  ```

## Pesanan

### Membuat Pesanan Baru

Membuat pesanan baru dari keranjang belanja.

- **URL**: `/api/orders`
- **Method**: `POST`
- **Headers**: 
  - `Authorization: Bearer access_token`
- **Request Body**:
  ```json
  {
    "delivery_fee": 10000,
    "delivery_address": "address_id"
  }
  ```
- **Response Success**:
  ```json
  {
    "_id": "order_id",
    "status": "waiting_payment",
    "delivery_fee": 10000,
    "delivery_address": {
      "_id": "address_id",
      "name": "Rumah",
      "provinsi": "DKI Jakarta",
      "kabupaten": "Jakarta Selatan",
      "kecamatan": "Pancoran",
      "kelurahan": "Kalibata",
      "detail": "Jalan Kalibata Utara No. 123"
    },
    "order_items": [
      {
        "_id": "order_item_id",
        "name": "Nama Produk",
        "price": 100000,
        "qty": 2,
        "subtotal": 200000,
        "product": "product_id"
      }
    ],
    "user": "user_id",
    "order_number": "ORD-20230101-001",
    "total": 210000
  }
  ```

### Mendapatkan Daftar Pesanan

Mendapatkan daftar pesanan pengguna.

- **URL**: `/api/orders`
- **Method**: `GET`
- **Headers**: 
  - `Authorization: Bearer access_token`
- **Response Success**:
  ```json
  [
    {
      "_id": "order_id",
      "status": "waiting_payment",
      "delivery_fee": 10000,
      "delivery_address": {
        "_id": "address_id",
        "name": "Rumah",
        "provinsi": "DKI Jakarta",
        "kabupaten": "Jakarta Selatan",
        "kecamatan": "Pancoran",
        "kelurahan": "Kalibata",
        "detail": "Jalan Kalibata Utara No. 123"
      },
      "order_items": [
        {
          "_id": "order_item_id",
          "name": "Nama Produk",
          "price": 100000,
          "qty": 2,
          "subtotal": 200000,
          "product": "product_id"
        }
      ],
      "user": "user_id",
      "order_number": "ORD-20230101-001",
      "total": 210000
    }
  ]
  ```

## Faktur

### Mendapatkan Faktur

Mendapatkan faktur berdasarkan ID pesanan.

- **URL**: `/api/invoices/:order_id`
- **Method**: `GET`
- **Headers**: 
  - `Authorization: Bearer access_token`
- **Response Success**:
  ```json
  {
    "_id": "invoice_id",
    "user": "user_id",
    "order": {
      "_id": "order_id",
      "status": "waiting_payment",
      "order_number": "ORD-20230101-001",
      "total": 210000
    },
    "payment_status": "waiting_payment",
    "sub_total": 200000,
    "delivery_fee": 10000,
    "total": 210000,
    "payment_method": "bank_transfer",
    "invoice_number": "INV-20230101-001"
  }
  ```
