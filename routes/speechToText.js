const express = require('express');
const router = express.Router();
const multer = require('multer');
const { speechToText } = require('../services/speechToTextService');

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/', upload.single('audio'), async (req, res) => {
  try {
    console.log('Received file:', req.file);

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    if (req.file.size === 0) {
      return res.status(400).json({ error: 'Uploaded audio file is empty' });
    }

    const result = await speechToText(req.file.buffer);

    res.json(result);
  } catch (err) {
    console.error('Error in speech-to-text:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
