const KnowledgeBase = require("../models/KnowledgeBase");
const { generateEmbedding } = require("../services/embeddingService");

// Split text into ~500 char chunks with 50 char overlap
function chunkText(text, chunkSize = 500, overlap = 50) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end).trim());
    start += chunkSize - overlap;
  }
  return chunks.filter((c) => c.length > 20);
}

// Upload a document — chunk and embed it
const uploadDocument = async (req, res) => {
  try {
    const { title, category, text } = req.body;
    if (!title || !text) {
      return res.status(400).json({ error: "Title and text are required" });
    }

    const rawChunks = chunkText(text);
    console.log(`📄 Processing ${rawChunks.length} chunks for: ${title}`);

    const chunks = await Promise.all(
      rawChunks.map(async (chunkText, index) => {
        const embedding = await generateEmbedding(chunkText);
        return { text: chunkText, embedding, chunkIndex: index };
      })
    );

    const doc = await KnowledgeBase.create({
      title,
      category: category || "custom",
      originalText: text,
      chunks,
      uploadedBy: req.user._id,
    });

    console.log(`✅ Document saved: ${title} with ${chunks.length} chunks`);
    res.status(201).json({
      message: "Document uploaded successfully",
      documentId: doc._id,
      title: doc.title,
      chunkCount: chunks.length,
    });
  } catch (err) {
    console.error("❌ Upload error:", err.message);
    res.status(500).json({ error: "Failed to upload document" });
  }
};

// Get all documents (admin)
const getAllDocuments = async (req, res) => {
  try {
    const docs = await KnowledgeBase.find()
      .select("title category chunkCount createdAt uploadedBy chunks")
      .populate("uploadedBy", "name email")
      .lean();

    const result = docs.map((d) => ({
      ...d,
      chunkCount: d.chunks?.length || 0,
      chunks: undefined,
    }));

    res.json({ documents: result });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch documents" });
  }
};

// Delete a document
const deleteDocument = async (req, res) => {
  try {
    const deleted = await KnowledgeBase.findByIdAndDelete(req.params.docId);
    if (!deleted) return res.status(404).json({ error: "Document not found" });
    res.json({ message: "Document deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete document" });
  }
};

// Find relevant chunks for a query
async function getRelevantChunks(queryText, topK = 3) {
  try {
    const queryEmbedding = await generateEmbedding(queryText);
    if (!queryEmbedding.length) return [];

    const docs = await KnowledgeBase.find().lean();
    const allChunks = [];

    for (const doc of docs) {
      for (const chunk of doc.chunks) {
        if (!chunk.embedding?.length) continue;
        const dot = chunk.embedding.reduce(
          (sum, val, i) => sum + val * (queryEmbedding[i] || 0), 0
        );
        const magA = Math.sqrt(chunk.embedding.reduce((s, v) => s + v * v, 0));
        const magB = Math.sqrt(queryEmbedding.reduce((s, v) => s + v * v, 0));
        const score = magA && magB ? dot / (magA * magB) : 0;
        allChunks.push({ text: chunk.text, score, source: doc.title });
      }
    }

    return allChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  } catch (err) {
    console.error("❌ Chunk retrieval error:", err.message);
    return [];
  }
}

function formatChunksForPrompt(chunks) {
  if (!chunks.length) return "";
  const lines = chunks
    .map((c) => `[${c.source}]: ${c.text}`)
    .join("\n\n");
  return `\n\nRelevant knowledge base information:\n${lines}\n\nUse this information to answer accurately. If the answer is in the knowledge base, prefer it over general knowledge.`;
}

module.exports = {
  uploadDocument,
  getAllDocuments,
  deleteDocument,
  getRelevantChunks,
  formatChunksForPrompt,
};
