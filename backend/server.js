const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const chatRoutes = require("./routes/chatRoutes");
const authRoutes = require("./routes/authRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const adminRoutes = require("./routes/adminRoutes");
const callRoutes = require("./routes/callRoutes"); // ← ADD THIS
const memoryRoutes = require("./routes/memoryRoutes");
const knowledgeRoutes = require("./routes/knowledgeRoutes");

connectDB();

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://ai-voice-bot-nu.vercel.app"
  ]
}));
app.use(express.json());
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/call", callRoutes); // ← ADD THIS
app.use("/api/memory", memoryRoutes);
app.use("/api/knowledge", knowledgeRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});