const Memory = require("../models/Memory");
const { generateEmbedding } = require("../services/embeddingService");

const MEMORY_PATTERNS = [
  {
    regex: /my name is ([A-Za-z\s]+)/i,
    category: "identity",
    importance: 5,
    formatter: (m) => `User's name is ${m[1].trim()}`,
  },
  {
    regex: /(?:i am|i'm) called ([A-Za-z\s]+)/i,
    category: "identity",
    importance: 5,
    formatter: (m) => `User's name is ${m[1].trim()}`,
  },
  {
    regex: /i (?:am|'m) a ([a-z\s]+(?:developer|designer|engineer|manager|student|teacher|analyst|architect|consultant|freelancer|founder)[a-z\s]*)/i,
    category: "profession",
    importance: 4,
    formatter: (m) => `User is a ${m[1].trim()}`,
  },
  {
    regex: /my project is ([^\.\!\?]+)/i,
    category: "project",
    importance: 4,
    formatter: (m) => `User's project: ${m[1].trim()}`,
  },
  {
    regex: /i(?:'m| am) (?:building|working on|developing|creating) ([^\.\!\?]+)/i,
    category: "project",
    importance: 4,
    formatter: (m) => `User is building: ${m[1].trim()}`,
  },
  {
    regex: /i(?:'m| am) (?:from|based in|living in) ([A-Za-z\s,]+)/i,
    category: "location",
    importance: 3,
    formatter: (m) => `User is from ${m[1].trim()}`,
  },
];

function extractMemoriesFromMessage(message) {
  const found = [];
  for (const pattern of MEMORY_PATTERNS) {
    const match = message.match(pattern.regex);
    if (match) {
      found.push({
        memory: pattern.formatter(match),
        category: pattern.category,
        importance: pattern.importance,
      });
    }
  }
  return found;
}

async function extractAndSaveMemory(userId, userMessage) {
  console.log("🧠 extractAndSaveMemory called for user:", userId, "message:", userMessage);
  try {
    const extracted = extractMemoriesFromMessage(userMessage);
    if (!extracted.length) return;
    const ops = await Promise.all(
      extracted.map(async ({ memory, category, importance }) => {
        const embedding = await generateEmbedding(memory);
        return {
          updateOne: {
            filter: { userId, memory },
            update: { $set: { userId, memory, category, importance, embedding } },
            upsert: true,
          },
        };
      })
    );
    await Memory.bulkWrite(ops);
    console.log(`🧠 Saved ${extracted.length} memory/memories for user ${userId}`);
  } catch (err) {
    console.error("❌ Memory extraction error:", err.message);
  }
}

async function getMemoriesForUser(userId) {
  try {
    const memories = await Memory.find({ userId })
      .sort({ importance: -1, updatedAt: -1 })
      .limit(20)
      .lean();
    return memories;
  } catch (err) {
    console.error("❌ Memory fetch error:", err.message);
    return [];
  }
}

function formatMemoriesForPrompt(memories) {
  if (!memories.length) return "";
  const lines = memories.map((m) => `- ${m.memory}`).join("\n");
  return `\n\nWhat you know about this user (from past conversations):\n${lines}\n\nUse this context naturally when relevant.`;
}

const getUserMemories = async (req, res) => {
  try {
    const memories = await Memory.find({ userId: req.user._id })
      .sort({ importance: -1, updatedAt: -1 })
      .lean();
    res.json({ memories });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch memories" });
  }
};

const deleteMemory = async (req, res) => {
  try {
    const deleted = await Memory.findOneAndDelete({ _id: req.params.memoryId, userId: req.user._id });
    if (!deleted) return res.status(404).json({ error: "Memory not found" });
    res.json({ message: "Memory deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete memory" });
  }
};

const clearAllMemories = async (req, res) => {
  try {
    const result = await Memory.deleteMany({ userId: req.user._id });
    res.json({ message: `Cleared ${result.deletedCount} memories` });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear memories" });
  }
};

async function getRelevantMemories(userId, queryText) {
  try {
    const queryEmbedding = await generateEmbedding(queryText);
    if (!queryEmbedding.length) return getMemoriesForUser(userId);

    const memories = await Memory.find({
      userId,
      embedding: { $exists: true, $not: { $size: 0 } },
    }).lean();

    if (!memories.length) return [];

    const scored = memories.map((m) => {
      const dot = m.embedding.reduce((sum, val, i) => sum + val * (queryEmbedding[i] || 0), 0);
      const magA = Math.sqrt(m.embedding.reduce((sum, val) => sum + val * val, 0));
      const magB = Math.sqrt(queryEmbedding.reduce((sum, val) => sum + val * val, 0));
      const score = magA && magB ? dot / (magA * magB) : 0;
      return { ...m, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  } catch (err) {
    console.error("❌ Relevant memory fetch error:", err.message);
    return getMemoriesForUser(userId);
  }
}

module.exports = {
  extractAndSaveMemory,
  getMemoriesForUser,
  getRelevantMemories,
  formatMemoriesForPrompt,
  getUserMemories,
  deleteMemory,
  clearAllMemories,
};
