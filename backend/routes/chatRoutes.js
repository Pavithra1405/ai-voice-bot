// backend/routes/chatRoutes.js

const express = require("express");
const router = express.Router();
const { handleChat, getHistory } = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, handleChat);
router.get("/history", protect, getHistory);

module.exports = router;