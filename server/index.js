const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/messageRoutes");
const Message = require("./models/Message");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/messages", messageRoutes);

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected Successfully");
  })
  .catch((error) => {
    console.log("MongoDB Error:", error);
  });

app.get("/", (req, res) => {
  res.send("Chat server running...");
});

// Socket connection
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Receive message from frontend
  socket.on("send_message", async (data) => {
    console.log("Message received:", data);

    const sender = typeof data.sender === "string" && data.sender.trim() ? data.sender.trim() : "Anonymous";
    const text =
      typeof data.text === "string"
        ? data.text.trim()
        : data.text && typeof data.text.text === "string"
        ? data.text.text.trim()
        : "";

    if (!text) {
      console.warn("Ignored invalid message payload:", data);
      return;
    }

    try {
      const newMessage = new Message({ sender, text });
      await newMessage.save();

      io.emit("receive_message", {
        sender,
        text,
        createdAt: newMessage.createdAt,
      });
    } catch (error) {
      console.error("Failed to save message:", error);
    }
  });

  // Typing indicator ON
  socket.on("typing", (username) => {
    socket.broadcast.emit("show_typing", username);
  });

  // Typing indicator OFF
  socket.on("stop_typing", () => {
    socket.broadcast.emit("hide_typing");
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});