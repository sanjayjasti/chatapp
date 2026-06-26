import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

function App() {
  const [username, setUsername] = useState(
    localStorage.getItem("chatUser") || ""
  );
  const [tempName, setTempName] = useState("");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!username) return;

    fetch("http://localhost:5000/messages")
      .then((res) => res.json())
      .then((data) => {
        setChat(
          data.map((msg) => ({
            sender: msg.sender || "Unknown",
            text: msg.text,
            mine: msg.sender === username,
          }))
        );
      });

    socket.on("receive_message", (data) => {
      setChat((prev) => [
        ...prev,
        {
          sender: data.sender,
          text: data.text,
          mine: data.sender === username,
        },
      ]);
      setTypingUser("");
    });

    socket.on("show_typing", (name) => {
      setTypingUser(name);
    });

    socket.on("hide_typing", () => {
      setTypingUser("");
    });

    return () => {
      socket.off("receive_message");
      socket.off("show_typing");
      socket.off("hide_typing");
    };
  }, [username]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, typingUser]);

  const joinChat = () => {
    if (!tempName.trim()) return;
    localStorage.setItem("chatUser", tempName);
    setUsername(tempName);
  };

  const sendMessage = () => {
    if (message.trim() === "") return;

    const messageData = {
      sender: username,
      text: message,
    };

    socket.emit("send_message", messageData);
    socket.emit("stop_typing");
    setMessage("");
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);

    if (e.target.value.length > 0) {
      socket.emit("typing", username);
    } else {
      socket.emit("stop_typing");
    }
  };

  if (!username) {
    return (
      <div style={{ textAlign: "center", marginTop: "100px" }}>
        <h2>Enter Username</h2>
        <input
          value={tempName}
          onChange={(e) => setTempName(e.target.value)}
          placeholder="Your name"
          style={{ padding: "10px" }}
        />
        <button
          onClick={joinChat}
          style={{ marginLeft: "10px", padding: "10px" }}
        >
          Join Chat
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f0f2f5",
      }}
    >
      <div
        style={{
          width: "450px",
          height: "600px",
          background: "white",
          borderRadius: "15px",
          boxShadow: "0 0 20px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "20px",
            background: "#4f46e5",
            color: "white",
            fontSize: "24px",
            fontWeight: "bold",
          }}
        >
          Real-Time Chat ({username})
        </div>

        <div style={{ flex: 1, padding: "15px", overflowY: "auto" }}>
          {chat.map((msg, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent: msg.mine ? "flex-end" : "flex-start",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  background: msg.mine ? "#4f46e5" : "#d1d5db",
                  color: msg.mine ? "white" : "black",
                  padding: "10px 15px",
                  borderRadius: "15px",
                }}
              >
                <small>{msg.sender}</small>
                <br />
                {msg.text}
              </div>
            </div>
          ))}

          {typingUser && (
            <p style={{ fontStyle: "italic", color: "gray" }}>
              {typingUser} is typing...
            </p>
          )}

          <div ref={chatEndRef}></div>
        </div>

        <div style={{ display: "flex", padding: "15px" }}>
          <input
            value={message}
            onChange={handleTyping}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type message..."
            style={{ flex: 1, padding: "12px" }}
          />

          <button onClick={sendMessage} style={{ marginLeft: "10px" }}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;