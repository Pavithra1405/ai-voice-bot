// backend/routes/chatRoutes.js

const express = require("express");
const router = express.Router();
const { handleChat, getHistory } = require("../controllers/chatController");
const auth = require("../middleware/authMiddleware");

router.post("/", auth, handleChat);
router.get("/history", auth, getHistory);

module.exports = router;