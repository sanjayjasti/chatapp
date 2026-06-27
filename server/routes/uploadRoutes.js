const express = require("express");
const upload = require("../middleware/upload");

const router = express.Router();

// POST /api/upload - upload a single image, returns its URL
router.post("/", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

module.exports = router;