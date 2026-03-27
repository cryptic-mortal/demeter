const express = require('express');
const router = express.Router();
const { createCrop, getAllCrops } = require('../controllers/cropController');

router.post('/create', createCrop);
router.get('/all', getAllCrops);

module.exports = router;