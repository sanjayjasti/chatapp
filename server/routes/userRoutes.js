const express = require("express");
const User = require("../models/User");

const router = express.Router();

// GET /api/users - list everyone except yourself, for picking group members
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("name email");
    res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;