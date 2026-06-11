// backend/routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const User = require("../models/User");
const ChatSession = require("../models/ChatSession");

// All routes below require auth + admin
router.use(auth, adminMiddleware);

// GET all users
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 });

    // Get session count per user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const sessionCount = await ChatSession.countDocuments({
          userId: user._id,
        });
        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
          isBanned: user.isBanned,
          sessionCount,
          createdAt: user.createdAt,
        };
      })
    );

    res.json({ users: usersWithStats });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH toggle ban/unban user
router.patch("/users/:id/ban", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent banning yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot ban yourself" });
    }

    // Prevent banning other admins
    if (user.isAdmin) {
      return res.status(400).json({ message: "Cannot ban another admin" });
    }

    user.isBanned = !user.isBanned;
    await user.save();

    res.json({ isBanned: user.isBanned, userId: user._id });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE user
router.delete("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent deleting yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot delete yourself" });
    }

    // Prevent deleting other admins
    if (user.isAdmin) {
      return res.status(400).json({ message: "Cannot delete another admin" });
    }

    // Delete user and all their sessions
    await User.findByIdAndDelete(req.params.id);
    await ChatSession.deleteMany({ userId: req.params.id });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;