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

    const newMessage = new Message({
      text: data.text,
    });

    await newMessage.save();

    io.emit("receive_message", data);
  });

  // Typing indicator ON
  socket.on("typing", () => {
    socket.broadcast.emit("show_typing");
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