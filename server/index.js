const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/messageRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const path = require("path");
const Message = require("./models/Message");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGO_URI) {
  console.error(
    "Missing MONGO_URI in server/.env. Add a valid MongoDB connection string to MONGO_URI and restart."
  );
  process.exit(1);
}

if (!JWT_SECRET) {
  console.error(
    "Missing JWT_SECRET in server/.env. Add a JWT_SECRET value and restart."
  );
  process.exit(1);
}

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
  },
});

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/messages", messageRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected Successfully");
  })
  .catch((error) => {
    console.log("MongoDB Error:", error);
    process.exit(1);
  });

app.get("/", (req, res) => {
  res.send("Chat server running...");
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("No token provided"));

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.username = decoded.name;
    next();
  } catch (err) {
    next(new Error("Invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.username, socket.id);

  socket.on("send_message", async (data) => {
    const sender = socket.username;
    const text = typeof data.text === "string" ? data.text.trim() : "";
    const imageUrl = typeof data.imageUrl === "string" ? data.imageUrl : "";

    if (!text && !imageUrl) {
      console.warn("Ignored empty message from:", sender);
      return;
    }

    try {
      const newMessage = new Message({ sender, text, imageUrl });
      await newMessage.save();

      io.emit("receive_message", {
        sender,
        text,
        imageUrl,
        createdAt: newMessage.createdAt,
      });
    } catch (error) {
      console.error("Failed to save message:", error);
    }
  });

  socket.on("typing", () => {
    socket.broadcast.emit("show_typing", socket.username);
  });

  socket.on("stop_typing", () => {
    socket.broadcast.emit("hide_typing");
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.username, socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});