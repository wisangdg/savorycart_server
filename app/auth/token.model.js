const mongoose = require('mongoose');
const { Schema, model } = mongoose;

/**
 * Token schema untuk menyimpan refresh token dan blacklisted token
 */
const tokenSchema = new Schema({
  // Token string
  token: {
    type: String,
    required: true,
    index: true
  },
  
  // Jenis token: 'refresh' atau 'blacklisted'
  type: {
    type: String,
    enum: ['refresh', 'blacklisted'],
    required: true
  },
  
  // User ID yang terkait dengan token
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Waktu kedaluwarsa token
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  
  // Metadata tambahan (opsional)
  metadata: {
    userAgent: String,
    ipAddress: String,
    lastUsed: Date
  }
}, { 
  timestamps: true 
});

// Index untuk mempercepat pencarian dan pembersihan token kedaluwarsa
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method untuk memeriksa apakah token sudah kedaluwarsa
tokenSchema.methods.isExpired = function() {
  return Date.now() >= this.expiresAt.getTime();
};

// Method untuk memperbarui waktu penggunaan terakhir
tokenSchema.methods.updateLastUsed = async function() {
  this.metadata.lastUsed = new Date();
  return this.save();
};

// Static method untuk membersihkan token yang kedaluwarsa
tokenSchema.statics.removeExpired = async function() {
  const now = new Date();
  return this.deleteMany({ expiresAt: { $lt: now } });
};

// Static method untuk blacklist token
tokenSchema.statics.blacklist = async function(token, userId, expiresAt) {
  return this.create({
    token,
    type: 'blacklisted',
    user: userId,
    expiresAt
  });
};

// Static method untuk memeriksa apakah token ada di blacklist
tokenSchema.statics.isBlacklisted = async function(token) {
  return this.exists({ token, type: 'blacklisted' });
};

// Static method untuk membuat refresh token baru
tokenSchema.statics.createRefreshToken = async function(userId, expiresAt, metadata = {}) {
  return this.create({
    token: require('crypto').randomBytes(40).toString('hex'),
    type: 'refresh',
    user: userId,
    expiresAt,
    metadata
  });
};

// Static method untuk mendapatkan refresh token berdasarkan token string
tokenSchema.statics.findRefreshToken = async function(token) {
  return this.findOne({ token, type: 'refresh' });
};

module.exports = model('Token', tokenSchema);
