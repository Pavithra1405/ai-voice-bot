const axios = require("axios");

// ── NON-STREAMING (used to save to DB) ──────────────────────
async function generateGeminiResponse(userMessage) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a helpful AI customer support agent. Be friendly, clear and concise.",
          },
          { role: "user", content: userMessage },
        ],
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return (
      response.data.choices?.[0]?.message?.content ||
      "Sorry, I could not generate a response."
    );
  } catch (error) {
    console.error("Groq API Error:", error.response?.data || error.message);
    return "AI service is currently unavailable.";
  }
}

// ── STREAMING (used to send words to frontend instantly) ─────
async function generateGroqStream(userMessage, res) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a helpful AI customer support agent. Be friendly, clear and concise.",
        },
        { role: "user", content: userMessage },
      ],
      max_tokens: 500,
      stream: true, // ✅ streaming ON
    },
    {
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      responseType: "stream", // ✅ get raw stream
    }
  );

  return response.data; // returns the raw stream
}

module.exports = { generateGeminiResponse, generateGroqStream };
