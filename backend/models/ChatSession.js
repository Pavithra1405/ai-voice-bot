const mongoose = require("mongoose");
const { nanoid } = require("nanoid");

const ChatSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: "New Chat" },
    messages: [
      {
        role: { type: String, enum: ["user", "bot"], required: true },
        text: { type: String, required: true },
        time: { type: Date, default: Date.now },
      },
    ],
    shareId:  { type: String, default: () => nanoid(10) },
    isShared: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatSession", ChatSessionSchema);