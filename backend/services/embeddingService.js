const { HfInference } = require("@huggingface/inference");

async function generateEmbedding(text) {
  console.log("🔵 generateEmbedding called, HF_API_KEY exists:", !!process.env.HF_API_KEY);
  try {
    const hf = new HfInference(process.env.HF_API_KEY);
    const result = await hf.featureExtraction({
      model: "sentence-transformers/all-MiniLM-L6-v2",
      inputs: text,
    });
    console.log("✅ Embedding generated, length:", Array.isArray(result) ? result.length : "not array");
    const flat = Array.isArray(result[0]) ? result[0] : result;
    return flat;
  } catch (err) {
    console.error("❌ Embedding error:", err.message);
    console.error("❌ Embedding stack:", err.stack);
    return [];
  }
}

module.exports = { generateEmbedding };
