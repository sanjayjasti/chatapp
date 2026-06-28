import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function NewGroupModal({ onClose, onCreated }) {
  const { user } = useAuth();
  const [groupName, setGroupName] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/users`)
      .then((res) => res.json())
      .then((data) => {
        // Don't show yourself in the member-picker list
        setAllUsers(data.filter((u) => u._id !== user.id));
      })
      .catch((err) => console.error("Failed to load users:", err));
  }, [user.id]);

  function toggleUser(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleCreate() {
    setError("");
    if (!groupName.trim()) {
      setError("Group name is required");
      return;
    }
    if (selectedIds.length === 0) {
      setError("Pick at least one member");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName.trim(),
          memberIds: selectedIds,
          createdById: user.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create group");

      onCreated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>New group</h2>

        <input
          type="text"
          placeholder="Group name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="modal-input"
        />

        <p className="modal-label">Add members</p>
        <div className="modal-user-list">
          {allUsers.map((u) => (
            <div
              key={u._id}
              className={`modal-user-item ${selectedIds.includes(u._id) ? "selected" : ""}`}
              onClick={() => toggleUser(u._id)}
            >
              <span>{u.name}</span>
              {selectedIds.includes(u._id) && <span className="modal-check">✓</span>}
            </div>
          ))}
          {allUsers.length === 0 && (
            <p className="sidebar-empty">No other users yet</p>
          )}
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="modal-confirm" onClick={handleCreate} disabled={loading}>
            {loading ? "Creating..." : "Create group"}
          </button>
        </div>
      </div>
    </div>
  );
}