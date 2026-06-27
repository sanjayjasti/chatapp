import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function AuthPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/login";
      const body = isSignup ? { name, email, password } : { email, password };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      if (isSignup) {
        setIsSignup(false);
        setPassword("");
        setError("");
        setName("");
        alert("Account created! Please log in.");
      } else {
        login(data.user, data.token);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">💬</div>
        <h1>{isSignup ? "Create account" : "Welcome back"}</h1>
        <p className="auth-subtitle">
          {isSignup ? "Sign up to start chatting" : "Log in to continue chatting"}
        </p>

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Please wait..." : isSignup ? "Sign up" : "Log in"}
          </button>
        </form>

        <p className="auth-switch">
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <button type="button" onClick={() => { setIsSignup(!isSignup); setError(""); }}>
            {isSignup ? "Log in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}