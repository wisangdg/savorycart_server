# Dokumentasi Pengujian Backend

Dokumen ini menjelaskan strategi dan implementasi pengujian di backend Eduwork E-Commerce.

## Jenis Pengujian

### Unit Testing

Pengujian unit menguji fungsi dan modul individual secara terisolasi. Pengujian ini fokus pada:
- Fungsi-fungsi utilitas
- Service layer
- Model methods

### Integration Testing

Pengujian integrasi menguji interaksi antar modul. Pengujian ini fokus pada:
- Interaksi antar modul
- Interaksi dengan database
- Middleware

### API Testing

Pengujian API menguji endpoint API. Pengujian ini fokus pada:
- Request dan response
- Status code
- Response body
- Headers

## Tools Pengujian

### Mocha

Mocha adalah framework pengujian JavaScript yang digunakan untuk:
- Menjalankan pengujian
- Menyediakan struktur pengujian (describe, it)
- Hooks (before, after, beforeEach, afterEach)

### Chai

Chai adalah library assertion yang digunakan untuk:
- Assertions (expect, should, assert)
- Plugin untuk pengujian HTTP

### Supertest

Supertest adalah library untuk pengujian HTTP yang digunakan untuk:
- Mengirim HTTP request
- Memeriksa response
- Integrasi dengan Express

### Sinon

Sinon adalah library untuk mocking yang digunakan untuk:
- Spies: Memantau pemanggilan fungsi
- Stubs: Mengganti implementasi fungsi
- Mocks: Kombinasi spies dan stubs dengan ekspektasi

### MongoDB Memory Server

MongoDB Memory Server adalah library untuk database in-memory yang digunakan untuk:
- Database MongoDB in-memory untuk pengujian
- Isolasi pengujian
- Performa pengujian

## Struktur Pengujian

```
test/
├── unit/                  # Pengujian unit
│   ├── utils/             # Pengujian utilitas
│   ├── services/          # Pengujian service
│   └── models/            # Pengujian model
├── integration/           # Pengujian integrasi
│   ├── middleware/        # Pengujian middleware
│   └── database/          # Pengujian database
├── api/                   # Pengujian API
│   ├── auth/              # Pengujian API autentikasi
│   ├── product/           # Pengujian API produk
│   └── ...                # Pengujian API lainnya
├── fixtures/              # Data untuk pengujian
└── helpers/               # Helper untuk pengujian
```

## Contoh Pengujian

### Pengujian Unit

```javascript
// test/unit/utils/index.test.js
const { expect } = require('chai');
const { getToken } = require('../../../utils/index');

describe('Utils - getToken', () => {
  it('should extract token from Authorization header', () => {
    const req = {
      headers: {
        authorization: 'Bearer token123'
      }
    };
    
    const token = getToken(req);
    expect(token).to.equal('token123');
  });
  
  it('should return null if no Authorization header', () => {
    const req = {
      headers: {}
    };
    
    const token = getToken(req);
    expect(token).to.be.null;
  });
});
```

### Pengujian Integrasi

```javascript
// test/integration/middleware/decodeToken.test.js
const { expect } = require('chai');
const sinon = require('sinon');
const { decodeToken } = require('../../../middlewares');
const jwt = require('jsonwebtoken');
const config = require('../../../config');

describe('Middleware - decodeToken', () => {
  let req, res, next;
  
  beforeEach(() => {
    req = {
      headers: {
        authorization: 'Bearer validToken'
      }
    };
    res = {};
    next = sinon.spy();
  });
  
  it('should set req.user if token is valid', () => {
    const user = { _id: 'user123', email: 'user@example.com' };
    sinon.stub(jwt, 'verify').returns(user);
    
    decodeToken(req, res, next);
    
    expect(req.user).to.deep.equal(user);
    expect(next.calledOnce).to.be.true;
    
    jwt.verify.restore();
  });
  
  it('should call next without setting req.user if no token', () => {
    req.headers = {};
    
    decodeToken(req, res, next);
    
    expect(req.user).to.be.undefined;
    expect(next.calledOnce).to.be.true;
  });
});
```

### Pengujian API

```javascript
// test/api/auth/login.test.js
const request = require('supertest');
const { expect } = require('chai');
const app = require('../../../app');
const User = require('../../../app/user/model');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

describe('API - Auth - Login', () => {
  let mongoServer;
  
  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    
    // Create test user
    await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });
  });
  
  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
  
  it('should login user with valid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('token');
    expect(res.body).to.have.property('user');
    expect(res.body.user.email).to.equal('test@example.com');
  });
  
  it('should return error with invalid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword'
      });
    
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('error', 1);
    expect(res.body).to.have.property('message', 'email or password incorrect');
  });
});
```

## Menjalankan Pengujian

### Menjalankan Semua Pengujian

```bash
npm test
```

### Menjalankan Pengujian Tertentu

```bash
npm test -- --grep "Auth - Login"
```

### Menjalankan Pengujian dengan Coverage

```bash
npm test -- --coverage
```

## Code Coverage

Code coverage mengukur seberapa banyak kode yang diuji. Target coverage:
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

## Continuous Integration

Pengujian dijalankan secara otomatis pada:
- Pull request
- Merge ke branch main

## Best Practices

### Do's

- Isolasi pengujian dengan database in-memory
- Mock dependencies eksternal
- Bersihkan data setelah pengujian
- Gunakan fixtures untuk data pengujian
- Tulis pengujian yang independen

### Don'ts

- Jangan bergantung pada database eksternal
- Jangan bergantung pada state dari pengujian lain
- Jangan uji library pihak ketiga
- Jangan tulis pengujian yang bergantung pada pengujian lain
