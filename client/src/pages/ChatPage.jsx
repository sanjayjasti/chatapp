import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import NewGroupModal from "./NewGroupModal";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function ChatPage() {
  const { user, token, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");
  const [typingUser, setTypingUser] = useState("");
  const [uploading, setUploading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null); // null = the single shared room
  const [showNewGroup, setShowNewGroup] = useState(false);
  const socketRef = useRef(null);
  const chatEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // ---------- Socket connection (once per login) ----------
  useEffect(() => {
    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on("receive_message", (data) => {
      setActiveGroupGuard(() => {
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
      }, null);
      setTypingUser("");
    });

    socket.on("receive_group_message", (data) => {
      setActiveGroupGuard(() => {
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
      }, data.groupId);
    });

    socket.on("show_typing", (name) => {
      if (name !== user.name) setTypingUser(name);
    });

    socket.on("hide_typing", () => setTypingUser(""));

    socket.on("connect_error", (err) => {
      console.error("Socket connection failed:", err.message);
    });

    // Load my groups once on login
    fetch(`${API_URL}/api/groups`)
      .then((res) => res.json())
      .catch(() => []);

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Helper: only apply an incoming message if we're currently looking at the matching chat
  function setActiveGroupGuard(applyFn, incomingGroupId) {
    const isViewingThatChat =
      (incomingGroupId === null && activeGroup === null) ||
      (incomingGroupId && activeGroup && activeGroup._id === incomingGroupId);
    if (isViewingThatChat) applyFn();
  }

  // ---------- Load the user's groups once on mount ----------
  useEffect(() => {
    fetch(`${API_URL}/api/users`).catch(() => {}); // warms nothing, just placeholder if needed later
  }, []);

  useEffect(() => {
    refreshGroups();
  }, []);

  function refreshGroups() {
    fetch(`${API_URL}/api/groups/${user.id}`)
      .then((res) => res.json())
      .then((data) => setGroups(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to load groups:", err));
  }

  // ---------- Load message history whenever the active chat changes ----------
  useEffect(() => {
    if (activeGroup) {
      fetch(`${API_URL}/api/groups/${activeGroup._id}/messages`)
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
        .catch((err) => console.error("Failed to load group messages:", err));

      socketRef.current?.emit("join_group", activeGroup._id);
    } else {
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, typingUser]);

  function sendMessage() {
    if (!message.trim()) return;

    if (activeGroup) {
      socketRef.current.emit("send_group_message", {
        groupId: activeGroup._id,
        text: message.trim(),
      });
    } else {
      socketRef.current.emit("send_message", { text: message.trim() });
    }

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
      if (!res.ok) throw new Error(data.message || "Upload failed");

      if (activeGroup) {
        socketRef.current.emit("send_group_message", {
          groupId: activeGroup._id,
          text: "",
          imageUrl: data.imageUrl,
        });
      } else {
        socketRef.current.emit("send_message", { text: "", imageUrl: data.imageUrl });
      }
    } catch (err) {
      console.error("Image upload failed:", err);
      alert("Failed to send image: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function handleGroupCreated(group) {
    setGroups((prev) => [group, ...prev]);
    socketRef.current?.emit("join_group", group._id);
    setShowNewGroup(false);
    setActiveGroup(group);
  }

  const chatTitle = activeGroup ? activeGroup.name : "Real-Time Chat";
  const chatSubtitle = activeGroup
    ? `${activeGroup.members.length} members`
    : `Logged in as ${user.name}`;

  return (
    <div className="chat-page">
      <div className="chat-shell" style={{ display: "flex", flexDirection: "row", maxWidth: 760 }}>
        {/* ---------- Sidebar: room + groups ---------- */}
        <div style={{ width: 200, borderRight: "1px solid var(--border-color)", display: "flex", flexDirection: "column" }}>
          <div className="chat-header-actions" style={{ padding: "10px", justifyContent: "space-between", display: "flex" }}>
            <button className="icon-btn" onClick={() => setShowNewGroup(true)} title="New group">
              +
            </button>
            <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
              {theme === "light" ? "🌙" : "☀️"}
            </button>
            <button className="icon-btn" onClick={logout} title="Log out">
              ⎋
            </button>
          </div>

          <div
            className={`sidebar-item ${!activeGroup ? "active" : ""}`}
            onClick={() => setActiveGroup(null)}
            style={{ cursor: "pointer", padding: "10px" }}
          >
            💬 Main room
          </div>

          <div className="sidebar-section-label">Groups</div>
          {groups.map((g) => (
            <div
              key={g._id}
              className={`sidebar-item ${activeGroup?._id === g._id ? "active" : ""}`}
              onClick={() => setActiveGroup(g)}
              style={{ cursor: "pointer", padding: "10px" }}
            >
              {g.name}
            </div>
          ))}
        </div>

        {/* ---------- Chat area ---------- */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="avatar-fallback">{chatTitle.charAt(0).toUpperCase()}</div>
              <div>
                <div className="chat-header-name">{chatTitle}</div>
                <div className="chat-header-status">{chatSubtitle}</div>
              </div>
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

          <form
            className="chat-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
          >
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
              placeholder="Type a message..."
            />
            <button type="submit">Send</button>
          </form>
        </div>
      </div>

      {showNewGroup && (
        <NewGroupModal onClose={() => setShowNewGroup(false)} onCreated={handleGroupCreated} />
      )}
    </div>
  );
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}