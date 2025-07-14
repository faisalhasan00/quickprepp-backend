// routes/videoRoutes.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const router = express.Router();

const VIDEO_FOLDER = "D:/QuickPrepContent/videos"; // SSD path

router.get("/:courseSlug/:filename", (req, res) => {
  const { courseSlug, filename } = req.params;
  const filePath = path.join(VIDEO_FOLDER, courseSlug, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Video not found" });
  }

  res.sendFile(filePath);
});

module.exports = router;
