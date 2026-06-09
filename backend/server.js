// backend/server.js

const dotenv = require("dotenv");
dotenv.config(); // ← MUST BE FIRST

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const chatRoutes = require("./routes/chatRoutes");
const authRoutes = require("./routes/authRoutes");

connectDB();

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://ai-voice-bot-nu.vercel.app/"  // your actual Vercel URL
  ]
}));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});