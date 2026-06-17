const Conversation = require("../models/Conversation");
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const WINDOW_SIZE = 10;

// Get last N conversations for a user
async function getRecentConversations(userId, limit = WINDOW_SIZE) {
  try {
    const conversations = await Conversation.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return conversations.reverse(); // oldest first
  } catch (err) {
    console.error("❌ Context fetch error:", err.message);
    return [];
  }
}

// Summarise older conversations beyond the window
async function summariseOldConversations(userId) {
  try {
    const total = await Conversation.countDocuments({ userId });
    if (total <= WINDOW_SIZE) return "";

    const oldConversations = await Conversation.find({ userId })
      .sort({ createdAt: -1 })
      .skip(WINDOW_SIZE)
      .limit(20)
      .lean();

    if (!oldConversations.length) return "";

    const transcript = oldConversations
      .reverse()
      .map((c) => `User: ${c.userMessage}\nBot: ${c.botReply}`)
      .join("\n");

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "user",
          content: `Summarise this conversation history in 2-3 sentences, focusing on key facts, issues discussed, and any resolutions:\n\n${transcript}`,
        },
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    const summary = response.choices[0]?.message?.content || "";
    console.log("📝 Conversation summary generated");
    return summary;
  } catch (err) {
    console.error("❌ Summarise error:", err.message);
    return "";
  }
}

// Format recent conversations for prompt injection
function formatConversationContext(conversations, summary = "") {
  let context = "";

  if (summary) {
    context += `\n\nSummary of earlier conversation:\n${summary}`;
  }

  if (conversations.length > 0) {
    const lines = conversations
      .map((c) => `User: ${c.userMessage}\nAssistant: ${c.botReply}`)
      .join("\n");
    context += `\n\nRecent conversation:\n${lines}`;
  }

  return context;
}

module.exports = {
  getRecentConversations,
  summariseOldConversations,
  formatConversationContext,
};
