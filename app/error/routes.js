/**
 * Routes untuk error logging
 */

const router = require('express').Router();
const errorController = require('./controller');

// Route untuk logging error dari client
router.post('/log-error', errorController.logClientError);

module.exports = router;
