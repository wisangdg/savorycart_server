/**
 * Controller untuk endpoint error logging
 */

const logger = require('../../utils/logger');

/**
 * Log error dari client
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const logClientError = (req, res) => {
  try {
    const { error, message, url, userAgent, timestamp } = req.body;
    
    // Log error ke file
    logger.error({
      source: 'client',
      error,
      message,
      url,
      userAgent,
      timestamp,
      ip: req.ip,
      user: req.user ? req.user._id : 'unauthenticated'
    });
    
    // Kirim response sukses
    res.status(200).json({
      error: 0,
      message: 'Error logged successfully'
    });
  } catch (err) {
    // Log error internal
    logger.error({
      source: 'server',
      message: 'Error logging client error',
      error: err.message,
      stack: err.stack
    });
    
    // Kirim response error
    res.status(500).json({
      error: 1,
      message: 'Failed to log error'
    });
  }
};

module.exports = {
  logClientError
};
