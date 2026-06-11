// backend/server.js

const dotenv = require("dotenv");
dotenv.config(); // ← MUST BE FIRST

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const chatRoutes = require("./routes/chatRoutes");
const authRoutes = require("./routes/authRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const adminRoutes = require("./routes/adminRoutes");

connectDB();

const app = express(); // ← app created first

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://ai-voice-bot-nu.vercel.app"
  ]
}));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/admin", adminRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});