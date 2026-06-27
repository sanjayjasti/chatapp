const express = require("express");
const Group = require("../models/Group");
const Message = require("../models/Message");

const router = express.Router();

// POST /api/groups - create a new group
router.post("/", async (req, res) => {
  try {
    const { name, memberIds, createdById } = req.body;

    if (!name || !memberIds || memberIds.length === 0 || !createdById) {
      return res.status(400).json({ message: "Group name, members, and creator are required" });
    }

    // Make sure the creator is always included as a member too
    const allMembers = Array.from(new Set([...memberIds, createdById]));

    const group = await Group.create({
      name: name.trim(),
      members: allMembers,
      createdBy: createdById,
    });

    const populated = await group.populate("members", "name email");
    res.status(201).json(populated);
  } catch (error) {
    console.error("Create group error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/groups/:userId - list groups a specific user belongs to
router.get("/:userId", async (req, res) => {
  try {
    const groups = await Group.find({ members: req.params.userId })
      .populate("members", "name email")
      .sort({ updatedAt: -1 });
    res.json(groups);
  } catch (error) {
    console.error("List groups error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/groups/:groupId/messages - message history for one group
router.get("/:groupId/messages", async (req, res) => {
  try {
    const messages = await Message.find({ groupId: req.params.groupId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    console.error("Get group messages error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;