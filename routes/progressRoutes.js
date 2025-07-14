const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');

router.post('/update', progressController.updateProgress);

module.exports = router;
