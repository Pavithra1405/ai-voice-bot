const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const {
  uploadDocument,
  getAllDocuments,
  deleteDocument,
} = require("../controllers/knowledgeController");

// Admin only routes
router.post("/upload", auth, admin, uploadDocument);
router.get("/", auth, admin, getAllDocuments);
router.delete("/:docId", auth, admin, deleteDocument);

module.exports = router;
