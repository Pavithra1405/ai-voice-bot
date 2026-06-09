const { generateGeminiResponse, generateGroqStream } = require("../services/geminiService");
const Conversation = require("../models/Conversation");

// ── STREAMING CHAT ───────────────────────────────────────────
const handleChat = async (req, res) => {
  const { message } = req.body;
  const userId = req.user._id;

  if (!message)
    return res.status(400).json({ error: "Message is required" });

  try {
    // Set headers for Server-Sent Events (SSE) streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await generateGroqStream(message, res);

    let fullReply = ""; // collect full reply to save in DB

    stream.on("data", (chunk) => {
      const lines = chunk.toString().split("\n").filter((l) => l.trim());

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.replace("data: ", "").trim();

          if (jsonStr === "[DONE]") {
            // Stream finished — save to DB and close
            Conversation.create({
              userId,
              userMessage: message,
              botReply: fullReply,
            });
            res.write("data: [DONE]\n\n");
            res.end();
            return;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const token = parsed.choices?.[0]?.delta?.content || "";
            if (token) {
              fullReply += token;
              res.write(`data: ${JSON.stringify({ token })}\n\n`); // send each word to frontend
            }
          } catch (e) {
            // skip malformed chunks
          }
        }
      }
    });

    stream.on("error", (err) => {
      console.error("Stream error:", err.message);
      res.write("data: [DONE]\n\n");
      res.end();
    });

  } catch (error) {
    console.error("❌ Chat Controller Error:", error.message);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// ── GET HISTORY ──────────────────────────────────────────────
const getHistory = async (req, res) => {
  try {
    const history = await Conversation.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.status(200).json({ history });
  } catch (error) {
    res.status(500).json({ error: "Could not fetch history" });
  }
};

module.exports = { handleChat, getHistory };
