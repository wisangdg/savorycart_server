/**
 * Script untuk membersihkan token yang sudah kedaluwarsa
 * Dapat dijalankan sebagai cron job
 */

// Load environment variables
require('dotenv').config();

// Connect to database
const mongoose = require('mongoose');
const config = require('../app/config');

// Import token service
const tokenService = require('../app/auth/token.service');

// Connect to MongoDB
mongoose.connect(`mongodb://${config.dbHost}:${config.dbPort}/${config.dbName}`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('Connected to MongoDB');
  
  try {
    // Cleanup expired tokens
    const result = await tokenService.cleanupExpiredTokens();
    console.log(`Cleaned up ${result.deletedCount} expired tokens`);
  } catch (error) {
    console.error('Error cleaning up tokens:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
})
.catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});
