// backend/routes/callRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const axios = require("axios");
const auth = require("../middleware/authMiddleware");
const FormData = require("form-data");

const upload = multer({ storage: multer.memoryStorage() });

// Only filter obvious noise/garbage — NOT real words
const GARBAGE_ONLY = new Set([
  ".", "..", "...", "um", "uh", "hmm", "hm", "mhm",
  "um.", "uh.", "hmm.", "hm."
]);

function isValidTranscript(text) {
  if (!text || typeof text !== "string") return false;

  const cleaned = text.trim();

  // Empty
  if (!cleaned) {
    console.log("❌ No speech detected — empty transcript");
    return false;
  }

  // Only punctuation or whitespace
  if (/^[\s.,!?]+$/.test(cleaned)) {
    console.log("❌ No speech detected — only punctuation");
    return false;
  }

  // Obvious garbage sounds only
  if (GARBAGE_ONLY.has(cleaned.toLowerCase())) {
    console.log("❌ Ignored noise transcript:", JSON.stringify(cleaned));
    return false;
  }

  console.log("✅ Valid transcript received:", JSON.stringify(cleaned));
  return true;
}

// POST /api/call/transcribe
router.post("/transcribe", auth, upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No audio file" });

    // Frontend threshold: 4000 bytes
    // Backend threshold: 3000 bytes (safety net)
    if (req.file.size < 3000) {
      console.log("❌ No speech detected — audio too small:", req.file.size, "bytes");
      return res.json({ transcript: "", valid: false, reason: "too_small" });
    }

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

    const transcript = response.data.text?.trim() || "";

    // Log audio size + transcript for threshold tuning
    console.log("Audio size:", req.file.size, "| Transcript:", JSON.stringify(transcript));

    if (!isValidTranscript(transcript)) {
      return res.json({ transcript: "", valid: false, reason: "garbage" });
    }

    res.json({ transcript, valid: true });
  } catch (err) {
    console.error("Transcription error:", err.response?.data || err.message);
    res.status(500).json({ error: "Transcription failed" });
  }
});

module.exports = router;