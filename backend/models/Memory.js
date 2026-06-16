const mongoose = require("mongoose");

const memorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    memory: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["identity", "profession", "project", "preference", "location", "other"],
      default: "other",
    },
    importance: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    embedding: {
      type: [Number],
      default: [],
    },
  },
  { timestamps: true }
);

memorySchema.index({ userId: 1, memory: 1 }, { unique: true });

module.exports = mongoose.model("Memory", memorySchema);
