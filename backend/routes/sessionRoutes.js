// backend/routes/sessionRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ChatSession = require("../models/ChatSession");

// Get all sessions for user (title + id only)
router.get("/", auth, async (req, res) => {
  try {
    const sessions = await ChatSession.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .select("_id title updatedAt isShared shareId")
      .limit(50);
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

// Get single session with messages
router.get("/:id", auth, async (req, res) => {
  try {
    const session = await ChatSession.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

// Create new session
router.post("/", auth, async (req, res) => {
  try {
    const { title, messages } = req.body;
    const session = await ChatSession.create({
      userId: req.user._id,
      title: title || "New Chat",
      messages: messages || [],
    });
    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: "Failed to create session" });
  }
});

// Update session (add messages / update title)
router.patch("/:id", auth, async (req, res) => {
  try {
    const { messages, title } = req.body;
    const update = {};
    if (messages) update.messages = messages;
    if (title) update.title = title;
    const session = await ChatSession.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      update,
      { returnDocument: "after" }
    );
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: "Failed to update session" });
  }
});

// Delete session
router.delete("/:id", auth, async (req, res) => {
  try {
    await ChatSession.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete session" });
  }
});

// Toggle share on/off
router.patch("/:id/share", auth, async (req, res) => {
  try {
    const session = await ChatSession.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!session) return res.status(404).json({ message: "Session not found" });

    session.isShared = !session.isShared;
    await session.save();

    res.json({
      isShared: session.isShared,
      shareId: session.shareId,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Public route — no auth needed
router.get("/shared/:shareId", async (req, res) => {
  try {
    const session = await ChatSession.findOne({
      shareId: req.params.shareId,
      isShared: true,
    });
    if (!session) return res.status(404).json({ message: "Link invalid or sharing disabled" });
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;