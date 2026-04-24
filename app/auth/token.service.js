const jwt = require('jsonwebtoken');
const config = require('../config.js');
const Token = require('./token.model.js');
const crypto = require('crypto');

/**
 * Service untuk manajemen token (access token dan refresh token)
 */
class TokenService {
  /**
   * Membuat access token JWT
   * @param {Object} payload - Data yang akan disimpan dalam token
   * @param {String} expiresIn - Waktu kedaluwarsa token (default: 15m)
   * @returns {String} - JWT token
   */
  generateAccessToken(payload, expiresIn = '15m') {
    return jwt.sign(payload, config.secretKey, { expiresIn });
  }

  /**
   * Membuat refresh token dan menyimpannya di database
   * @param {String} userId - ID user
   * @param {Object} metadata - Metadata tambahan (userAgent, ipAddress)
   * @param {Number} expiryDays - Jumlah hari sebelum token kedaluwarsa (default: 7)
   * @returns {Object} - Refresh token object
   */
  async generateRefreshToken(userId, metadata = {}, expiryDays = 7) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);
    
    return Token.createRefreshToken(userId, expiresAt, metadata);
  }

  /**
   * Memverifikasi access token JWT
   * @param {String} token - JWT token
   * @returns {Object} - Decoded token payload atau null jika invalid
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, config.secretKey);
    } catch (error) {
      return null;
    }
  }

  /**
   * Memverifikasi refresh token
   * @param {String} refreshToken - Refresh token string
   * @returns {Object} - Token document atau null jika invalid
   */
  async verifyRefreshToken(refreshToken) {
    // Cek apakah token ada di database
    const tokenDoc = await Token.findRefreshToken(refreshToken);
    
    if (!tokenDoc) {
      return null;
    }
    
    // Cek apakah token sudah kedaluwarsa
    if (tokenDoc.isExpired()) {
      await tokenDoc.remove();
      return null;
    }
    
    // Update waktu penggunaan terakhir
    tokenDoc.metadata.lastUsed = new Date();
    await tokenDoc.save();
    
    return tokenDoc;
  }

  /**
   * Memperbarui access token menggunakan refresh token
   * @param {String} refreshToken - Refresh token string
   * @returns {Object} - Object berisi access token baru atau null jika gagal
   */
  async refreshAccessToken(refreshToken) {
    const tokenDoc = await this.verifyRefreshToken(refreshToken);
    
    if (!tokenDoc) {
      return null;
    }
    
    // Dapatkan user dari token
    const user = await require('../user/model.js').findById(tokenDoc.user);
    
    if (!user) {
      return null;
    }
    
    // Buat payload untuk access token baru
    const payload = {
      _id: user._id,
      email: user.email,
      name: user.full_name,
      role: user.role
    };
    
    // Generate access token baru
    const accessToken = this.generateAccessToken(payload);
    
    return {
      accessToken,
      user: payload
    };
  }

  /**
   * Menambahkan token ke blacklist
   * @param {String} token - Token yang akan di-blacklist
   * @param {String} userId - ID user
   * @param {Date} expiresAt - Waktu kedaluwarsa token
   * @returns {Object} - Blacklisted token document
   */
  async blacklistToken(token, userId, expiresAt) {
    return Token.blacklist(token, userId, expiresAt);
  }

  /**
   * Memeriksa apakah token ada di blacklist
   * @param {String} token - Token yang akan diperiksa
   * @returns {Boolean} - true jika token ada di blacklist
   */
  async isTokenBlacklisted(token) {
    return Token.isBlacklisted(token);
  }

  /**
   * Menghapus semua refresh token milik user tertentu
   * @param {String} userId - ID user
   * @returns {Object} - Result dari operasi delete
   */
  async revokeAllUserTokens(userId) {
    return Token.deleteMany({ user: userId, type: 'refresh' });
  }

  /**
   * Menghapus refresh token tertentu
   * @param {String} refreshToken - Refresh token string
   * @returns {Boolean} - true jika berhasil dihapus
   */
  async revokeRefreshToken(refreshToken) {
    const result = await Token.deleteOne({ token: refreshToken, type: 'refresh' });
    return result.deletedCount > 0;
  }

  /**
   * Membersihkan token yang sudah kedaluwarsa
   * @returns {Object} - Result dari operasi delete
   */
  async cleanupExpiredTokens() {
    return Token.removeExpired();
  }
}

module.exports = new TokenService();
