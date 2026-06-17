const mongoose = require("mongoose");

const knowledgeBaseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["faq", "manual", "pricing", "custom"],
      default: "custom",
    },
    originalText: {
      type: String,
      required: true,
    },
    chunks: [
      {
        text: { type: String, required: true },
        embedding: { type: [Number], default: [] },
        chunkIndex: { type: Number },
      },
    ],
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("KnowledgeBase", knowledgeBaseSchema);
