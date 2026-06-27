import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function ChatPage() {
  const { user, token, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");
  const [typingUser, setTypingUser] = useState("");
  const [uploading, setUploading] = useState(false);
  const socketRef = useRef(null);
  const chatEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;

    fetch(`${API_URL}/messages`)
      .then((res) => res.json())
      .then((data) => {
        setChat(
          data.map((msg) => ({
            sender: msg.sender,
            text: msg.text,
            imageUrl: msg.imageUrl,
            mine: msg.sender === user.name,
            createdAt: msg.createdAt,
          }))
        );
      })
      .catch((err) => console.error("Failed to load messages:", err));

    socket.on("receive_message", (data) => {
      setChat((prev) => [
        ...prev,
        {
          sender: data.sender,
          text: data.text,
          imageUrl: data.imageUrl,
          mine: data.sender === user.name,
          createdAt: data.createdAt,
        },
      ]);
      setTypingUser("");
    });

    socket.on("show_typing", (name) => {
      if (name !== user.name) setTypingUser(name);
    });

    socket.on("hide_typing", () => setTypingUser(""));

    socket.on("connect_error", (err) => {
      console.error("Socket connection failed:", err.message);
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, typingUser]);

  function sendMessage() {
    if (!message.trim()) return;
    socketRef.current.emit("send_message", { text: message.trim() });
    socketRef.current.emit("stop_typing");
    setMessage("");
  }

  function handleInputChange(e) {
    setMessage(e.target.value);
    socketRef.current.emit("typing");

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit("stop_typing");
    }, 1500);
  }

  async function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Upload failed");
      }

      socketRef.current.emit("send_message", { text: "", imageUrl: data.imageUrl });
    } catch (err) {
      console.error("Image upload failed:", err);
      alert("Failed to send image: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="chat-page">
      <div className="chat-shell">
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="avatar-fallback">{user.name.charAt(0).toUpperCase()}</div>
            <div>
              <div className="chat-header-name">Real-Time Chat</div>
              <div className="chat-header-status">Logged in as {user.name}</div>
            </div>
          </div>
          <div className="chat-header-actions">
            <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
              {theme === "light" ? "🌙" : "☀️"}
            </button>
            <button className="icon-btn" onClick={logout} title="Log out">
              ⎋
            </button>
          </div>
        </div>

        <div className="chat-messages">
          {chat.map((msg, index) => (
            <div key={index} className={`message-row ${msg.mine ? "mine" : "theirs"}`}>
              <div className="message-bubble">
                {!msg.mine && <div className="message-sender-name">{msg.sender}</div>}
                {msg.imageUrl && (
                  <img src={`${API_URL}${msg.imageUrl}`} alt="Shared" className="message-image" />
                )}
                {msg.text && <span className="message-text">{msg.text}</span>}
                {msg.createdAt && (
                  <span className="message-meta">{formatTime(msg.createdAt)}</span>
                )}
              </div>
            </div>
          ))}

          {typingUser && (
            <div className="message-row theirs">
              <div className="message-bubble typing-bubble">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        <div className="chat-input-row">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageSelect}
            style={{ display: "none" }}
          />
          <button
            type="button"
            className="icon-btn"
            onClick={() => fileInputRef.current.click()}
            disabled={uploading}
            title="Send image"
          >
            📎
          </button>
          <input
            value={message}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}