const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const { getUserMemories, deleteMemory, clearAllMemories } = require("../controllers/memoryController");

router.get("/", auth, getUserMemories);
router.delete("/clear", auth, clearAllMemories);
router.delete("/:memoryId", auth, deleteMemory);

module.exports = router;
