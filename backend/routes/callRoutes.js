// backend/routes/callRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const axios = require("axios");
const auth = require("../middleware/authMiddleware");
const FormData = require("form-data");

// Store audio in memory (no disk)
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/call/transcribe
router.post("/transcribe", auth, upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No audio file" });

    const formData = new FormData();
    formData.append("file", req.file.buffer, {
      filename: "audio.webm",
      contentType: req.file.mimetype || "audio/webm",
    });
    formData.append("model", "whisper-large-v3");
    formData.append("response_format", "json");
    formData.append("language", req.body.language || "en");

    const response = await axios.post(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      formData,
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          ...formData.getHeaders(),
        },
      }
    );

    res.json({ transcript: response.data.text });
  } catch (err) {
    console.error("Transcription error:", err.response?.data || err.message);
    res.status(500).json({ error: "Transcription failed" });
  }
});

module.exports = router;