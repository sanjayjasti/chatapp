import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

function App() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [typing, setTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetch("http://localhost:5000/messages")
      .then((res) => res.json())
      .then((data) => {
        setChat(data.map((msg) => ({ text: msg.text, mine: false })));
      });

    socket.on("connect", () => {
      console.log("Connected:", socket.id);
    });

    socket.on("receive_message", (data) => {
      setChat((prev) => [...prev, data]);
      setTyping(false);
    });

    socket.on("show_typing", () => {
      setTyping(true);
    });

    socket.on("hide_typing", () => {
      setTyping(false);
    });

    return () => {
      socket.off("receive_message");
      socket.off("show_typing");
      socket.off("hide_typing");
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, typing]);

  const sendMessage = () => {
    if (message.trim() === "") return;

    const messageData = {
      text: message,
      mine: true,
    };

    socket.emit("send_message", messageData);
    socket.emit("stop_typing");
    setMessage("");
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);

    if (e.target.value.length > 0) {
      socket.emit("typing");
    } else {
      socket.emit("stop_typing");
    }
  };

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
          Real-Time Chat
        </div>

        <div
          style={{
            flex: 1,
            padding: "15px",
            overflowY: "auto",
            background: "#f9fafb",
          }}
        >
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
                  maxWidth: "70%",
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {typing && (
            <p style={{ fontStyle: "italic", color: "gray" }}>
              Someone is typing...
            </p>
          )}

          <div ref={chatEndRef}></div>
        </div>

        <div
          style={{
            display: "flex",
            padding: "15px",
            borderTop: "1px solid #ddd",
          }}
        >
          <input
            type="text"
            value={message}
            placeholder="Type message..."
            onChange={handleTyping}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #ccc",
              outline: "none",
            }}
          />

          <button
            onClick={sendMessage}
            style={{
              marginLeft: "10px",
              padding: "12px 20px",
              background: "#4f46e5",
              color: "white",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;