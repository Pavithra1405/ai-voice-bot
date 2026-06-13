import { useState, useEffect, useRef } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const THINKING_STAGES = [
  "Understanding your request…",
  "Searching knowledge base…",
  "Generating response…",
];

const EMPTY_FORM = { name: "", email: "", password: "" };

// ── Shared Audio Resources (module-level) ──
let sharedMicStream = null;
let sharedAudioContext = null;
let sharedAnalyser = null;
let sharedSource = null;
let activeBargeSessionId = 0;

async function getSharedMicStream() {
  if (!sharedMicStream) {
    sharedMicStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000,
      }
    });
    if (!sharedAudioContext) {
      sharedAudioContext = new AudioContext();
    }
    if (sharedAudioContext.state === "suspended") {
      await sharedAudioContext.resume();
    }
    sharedSource = sharedAudioContext.createMediaStreamSource(sharedMicStream);
    sharedAnalyser = sharedAudioContext.createAnalyser();
    sharedAnalyser.fftSize = 2048;
    sharedSource.connect(sharedAnalyser);
    if (!window._audioKeepAlive) {
      window._audioKeepAlive = setInterval(() => {
        if (sharedAudioContext?.state === "suspended") {
          sharedAudioContext.resume().catch(() => {});
        }
      }, 3000);
    }
  }
  if (sharedAudioContext.state === "suspended") {
    await sharedAudioContext.resume();
  }
  return { stream: sharedMicStream, audioContext: sharedAudioContext, analyser: sharedAnalyser };
}

function cleanupSharedAudio() {
  if (window._audioKeepAlive) {
    clearInterval(window._audioKeepAlive);
    window._audioKeepAlive = null;
  }
  if (window._audioWatchdog) {
    clearTimeout(window._audioWatchdog);
    window._audioWatchdog = null;
  }
  if (sharedSource) {
    try { sharedSource.disconnect(); } catch {}
    sharedSource = null;
  }
  if (sharedMicStream) {
    sharedMicStream.getTracks().forEach(t => t.stop());
    sharedMicStream = null;
  }
  if (sharedAudioContext) {
    sharedAudioContext.close();
    sharedAudioContext = null;
  }
  sharedAnalyser = null;
}

function NeuralIcon({ size = 22, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className} aria-label="AI">
      <circle cx="16" cy="16" r="4.5" fill="currentColor" opacity="0.9" />
      <circle cx="16" cy="4" r="2.5" fill="currentColor" opacity="0.7" />
      <circle cx="16" cy="28" r="2.5" fill="currentColor" opacity="0.7" />
      <circle cx="4" cy="16" r="2.5" fill="currentColor" opacity="0.7" />
      <circle cx="28" cy="16" r="2.5" fill="currentColor" opacity="0.7" />
      <circle cx="6.5" cy="6.5" r="2" fill="currentColor" opacity="0.45" />
      <circle cx="25.5" cy="6.5" r="2" fill="currentColor" opacity="0.45" />
      <circle cx="6.5" cy="25.5" r="2" fill="currentColor" opacity="0.45" />
      <circle cx="25.5" cy="25.5" r="2" fill="currentColor" opacity="0.45" />
      <line x1="16" y1="11.5" x2="16" y2="6.5" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      <line x1="16" y1="20.5" x2="16" y2="25.5" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      <line x1="11.5" y1="16" x2="6.5" y2="16" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      <line x1="20.5" y1="16" x2="25.5" y2="16" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      <line x1="13.2" y1="13.2" x2="8.3" y2="8.3" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="18.8" y1="13.2" x2="23.7" y2="8.3" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="13.2" y1="18.8" x2="8.3" y2="23.7" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="18.8" y1="18.8" x2="23.7" y2="23.7" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Shared Chat View ────────────────────────────────────────
function SharedChatView() {
  const [messages, setMessages] = useState([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const shareId = window.location.pathname.split("/shared/")[1];
    if (!shareId) { setError("Invalid link."); setLoading(false); return; }
    fetch(`${API}/sessions/shared/${shareId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.message) { setError(data.message); return; }
        setTitle(data.title || "Shared Chat");
        setMessages(data.messages || []);
      })
      .catch(() => setError("Failed to load shared chat."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontSize: 16 }}>
      <NeuralIcon size={28} />&nbsp;Loading shared chat...
    </div>
  );
  if (error) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontSize: 16, color: "#ef4444" }}>
      ❌ {error}
    </div>
  );
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px", fontFamily: "sans-serif" }}>
      <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid #e2e8f0" }}>
        <h2 style={{ margin: 0 }}>💬 {title}</h2>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>Read-only shared conversation</p>
      </div>
      {messages.map((msg, i) => (
        <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
          <div style={{
            maxWidth: "75%", padding: "10px 14px", borderRadius: 12,
            background: msg.role === "user" ? "#3b82f6" : "#f1f5f9",
            color: msg.role === "user" ? "#fff" : "#1e293b",
            fontSize: 14, lineHeight: 1.5,
          }}>
            <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>
              {msg.role === "user" ? "You" : "AI Bot"}
            </div>
            {msg.text}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Admin Panel ─────────────────────────────────────────────
function AdminPanel({ token, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSessions, setUserSessions] = useState({});
  const [sessionsLoading, setSessionsLoading] = useState({});
  const [expandedSessionId, setExpandedSessionId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [toast, setToast] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const toastTimer = useRef(null);

  const showToast = (msg) => {
    clearTimeout(toastTimer.current);
    setToast(msg); setToastVisible(true);
    toastTimer.current = setTimeout(() => {
      setToastVisible(false);
      setTimeout(() => setToast(""), 350);
    }, 2800);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Failed to load users"); return; }
      setUsers(data.users);
    } catch { setError("Failed to load users"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

  const selectUser = async (u) => {
    setSelectedUser(u);
    setExpandedSessionId(null);
    setShowDetail(true);
    if (userSessions[u._id]) return;
    setSessionsLoading((p) => ({ ...p, [u._id]: true }));
    try {
      const res = await fetch(`${API}/admin/users/${u._id}/sessions`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) { showToast(`❌ ${data.message || "Failed to load sessions"}`); return; }
      setUserSessions((p) => ({ ...p, [u._id]: data.sessions || [] }));
    } catch { showToast("❌ Failed to load sessions"); }
    finally { setSessionsLoading((p) => ({ ...p, [u._id]: false })); }
  };

  const toggleBan = async (userId) => {
    try {
      const res = await fetch(`${API}/admin/users/${userId}/ban`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) { showToast(`❌ ${data.message}`); return; }
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, isBanned: data.isBanned } : u));
      if (selectedUser?._id === userId) setSelectedUser((u) => ({ ...u, isBanned: data.isBanned }));
      showToast(data.isBanned ? "🚫 User banned" : "✅ User unbanned");
    } catch { showToast("❌ Failed to update user"); }
  };

  const deleteUser = async (userId) => {
    try {
      const res = await fetch(`${API}/admin/users/${userId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) { showToast(`❌ ${data.message}`); return; }
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      if (selectedUser?._id === userId) { setSelectedUser(null); setShowDetail(false); }
      setDeleteConfirmId(null);
      showToast("🗑️ User deleted");
    } catch { showToast("❌ Failed to delete user"); }
  };

  const Shimmer = ({ w = "100%", h = 12, r = 6 }) => (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: "linear-gradient(90deg, var(--bg3) 25%, var(--bg4) 50%, var(--bg3) 75%)",
      backgroundSize: "800px 100%",
      animation: "ap-skeleton-shimmer 1.4s infinite linear",
      flexShrink: 0,
    }} />
  );

  const activeCount = users.filter((u) => !u.isBanned && !u.isAdmin).length;
  const bannedCount = users.filter((u) => u.isBanned).length;

  return (
    <>
      <style>{`
        @keyframes ap-skeleton-shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position:  400px 0; }
        }
        @keyframes ap-slide-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ap-toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(10px) scale(0.97); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes ap-toast-out {
          from { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
          to   { opacity: 0; transform: translateX(-50%) translateY(10px) scale(0.97); }
        }
        .ap-user-row { transition: background 0.13s; cursor: pointer; }
        .ap-user-row:hover { background: var(--bg3) !important; }
        .ap-user-row.selected { background: var(--bg3) !important; border-left: 3px solid var(--accent) !important; }
        .ap-icon-btn {
          width: 30px; height: 30px; border-radius: 8px;
          border: 1px solid var(--border2); background: var(--bg2);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;
        }
        .ap-icon-btn:hover { transform: scale(1.12); box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
        .ap-icon-btn:active { transform: scale(0.94); }
        .ap-session-card { transition: box-shadow 0.15s, background 0.13s; }
        .ap-session-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.12); background: var(--bg3) !important; }
        .ap-back-btn { display: none; }
        @media (max-width: 680px) {
          .ap-left  { display: block; }
          .ap-right { display: block; }
          .ap-split { flex-direction: column !important; }
          .ap-back-btn { display: flex !important; }
          .ap-left.mobile-hidden  { display: none !important; }
          .ap-right.mobile-hidden { display: none !important; }
        }
      `}</style>

      <div style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "var(--bg)", display: "flex", flexDirection: "column",
        animation: "ap-slide-in 0.2s ease",
        fontFamily: "inherit",
      }}>
        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", height: 58, borderBottom: "1px solid var(--border)",
          background: "var(--bg2)", flexShrink: 0, gap: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "var(--accent-glow)", border: "1px solid var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent3)",
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text)", letterSpacing: "-0.01em" }}>
                Admin Panel
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text3)" }}>
                {loading ? "Loading…" : `${users.length} users · ${activeCount} active · ${bannedCount} banned`}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="ap-icon-btn" onClick={loadUsers} title="Refresh" style={{ width: "auto", padding: "0 12px", gap: 6, color: "var(--text2)", fontSize: "0.82rem" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Refresh</span>
            </button>
            <button className="ap-icon-btn" onClick={onClose} title="Close" style={{ color: "var(--text2)" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Split body */}
        <div className="ap-split" style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* LEFT — User list */}
          <div
            className={`ap-left ${showDetail ? "mobile-hidden" : ""}`}
            style={{
              width: 320, minWidth: 280, borderRight: "1px solid var(--border)",
              display: "flex", flexDirection: "column", background: "var(--bg2)", flexShrink: 0,
            }}
          >
            <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                All Users
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {loading ? (
                [1, 0.85, 0.7, 0.55, 0.4].map((op, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", opacity: op }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", background: "var(--bg4)", flexShrink: 0,
                      animation: "ap-skeleton-shimmer 1.4s infinite linear",
                      backgroundSize: "800px 100%",
                      backgroundImage: "linear-gradient(90deg, var(--bg3) 25%, var(--bg4) 50%, var(--bg3) 75%)",
                    }} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                      <Shimmer w="60%" h={11} />
                      <Shimmer w="80%" h={9} />
                    </div>
                  </div>
                ))
              ) : error ? (
                <div style={{ padding: 24, color: "#ef4444", fontSize: "0.85rem" }}>❌ {error}</div>
              ) : users.length === 0 ? (
                <div style={{ padding: 24, color: "var(--text3)", fontSize: "0.85rem" }}>No users found.</div>
              ) : (
                users.map((u) => (
                  <div
                    key={u._id}
                    className={`ap-user-row ${selectedUser?._id === u._id ? "selected" : ""}`}
                    onClick={() => selectUser(u)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "11px 16px",
                      borderLeft: selectedUser?._id === u._id ? "3px solid var(--accent)" : "3px solid transparent",
                      borderBottom: "1px solid var(--border)",
                      background: selectedUser?._id === u._id ? "var(--bg3)" : "transparent",
                      animation: "ap-slide-in 0.18s ease",
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      background: u.isAdmin ? "var(--accent)" : u.isBanned ? "rgba(239,68,68,0.2)" : "var(--bg4)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.85rem", fontWeight: 700, color: u.isBanned ? "#ef4444" : "var(--text)",
                      border: u.isAdmin ? "2px solid var(--accent)" : "2px solid transparent",
                    }}>
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: "0.86rem", fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {u.name}
                        </span>
                        {u.isAdmin && (
                          <span style={{ fontSize: "0.62rem", padding: "1px 5px", background: "var(--accent-glow)", color: "var(--accent3)", borderRadius: 4, border: "1px solid var(--accent)", flexShrink: 0 }}>
                            Admin
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "var(--text3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {u.email}
                      </div>
                    </div>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                      background: u.isBanned ? "#ef4444" : "#22c55e",
                      boxShadow: u.isBanned ? "0 0 4px #ef4444" : "0 0 4px #22c55e",
                    }} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT — Detail panel */}
          <div
            className={`ap-right ${!showDetail ? "mobile-hidden" : ""}`}
            style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg)" }}
          >
            {!selectedUser ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--text3)" }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" opacity={0.3}>
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <p style={{ margin: 0, fontSize: "0.9rem" }}>Select a user to view details</p>
              </div>
            ) : (
              <>
                <div style={{
                  padding: "16px 24px", borderBottom: "1px solid var(--border)",
                  background: "var(--bg2)", flexShrink: 0,
                  display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
                }}>
                  <button
                    className="ap-back-btn ap-icon-btn"
                    onClick={() => { setShowDetail(false); setSelectedUser(null); }}
                    style={{ color: "var(--text2)" }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <div style={{
                    width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                    background: selectedUser.isAdmin ? "var(--accent)" : selectedUser.isBanned ? "rgba(239,68,68,0.2)" : "var(--bg4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.2rem", fontWeight: 700,
                    color: selectedUser.isBanned ? "#ef4444" : selectedUser.isAdmin ? "#fff" : "var(--text)",
                    border: selectedUser.isAdmin ? "2px solid var(--accent)" : "2px solid var(--border2)",
                  }}>
                    {selectedUser.name?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text)" }}>{selectedUser.name}</span>
                      {selectedUser.isAdmin && (
                        <span style={{ fontSize: "0.68rem", padding: "2px 7px", background: "var(--accent-glow)", color: "var(--accent3)", borderRadius: 4, border: "1px solid var(--accent)" }}>
                          Admin
                        </span>
                      )}
                      <span style={{
                        fontSize: "0.72rem", padding: "2px 9px", borderRadius: 20, fontWeight: 600,
                        background: selectedUser.isBanned ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.1)",
                        color: selectedUser.isBanned ? "#ef4444" : "#22c55e",
                        border: `1px solid ${selectedUser.isBanned ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.25)"}`,
                      }}>
                        {selectedUser.isBanned ? "Banned" : "Active"}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text3)", marginTop: 2 }}>
                      {selectedUser.email} · Joined {new Date(selectedUser.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} · {selectedUser.sessionCount} chat{selectedUser.sessionCount !== 1 ? "s" : ""}
                    </div>
                  </div>
                  {!selectedUser.isAdmin && (
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button
                        className="ap-icon-btn"
                        onClick={() => toggleBan(selectedUser._id)}
                        title={selectedUser.isBanned ? "Unban user" : "Ban user"}
                        style={{ width: "auto", padding: "0 14px", gap: 6, color: selectedUser.isBanned ? "#22c55e" : "#f59e0b", fontSize: "0.82rem", fontWeight: 500 }}
                      >
                        {selectedUser.isBanned ? (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                          </svg>
                        ) : (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                            <path d="M4.93 4.93l14.14 14.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        )}
                        {selectedUser.isBanned ? "Unban" : "Ban"}
                      </button>
                      {deleteConfirmId === selectedUser._id ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="ap-icon-btn" onClick={() => deleteUser(selectedUser._id)}
                            style={{ width: "auto", padding: "0 12px", color: "#ef4444", fontSize: "0.82rem", fontWeight: 600, borderColor: "rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.08)" }}>
                            Confirm delete
                          </button>
                          <button className="ap-icon-btn" onClick={() => setDeleteConfirmId(null)}
                            style={{ width: "auto", padding: "0 12px", color: "var(--text2)", fontSize: "0.82rem" }}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button className="ap-icon-btn" onClick={() => setDeleteConfirmId(selectedUser._id)}
                          title="Delete user" style={{ color: "#ef4444" }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Sessions list */}
                <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                    Chat Sessions
                  </div>
                  {sessionsLoading[selectedUser._id] ? (
                    [1, 0.8, 0.6].map((op, i) => (
                      <div key={i} style={{ borderRadius: 12, overflow: "hidden", opacity: op }}>
                        <div style={{
                          height: 52, borderRadius: 12,
                          backgroundImage: "linear-gradient(90deg, var(--bg2) 25%, var(--bg3) 50%, var(--bg2) 75%)",
                          backgroundSize: "800px 100%", animation: "ap-skeleton-shimmer 1.4s infinite linear",
                        }} />
                      </div>
                    ))
                  ) : !userSessions[selectedUser._id] || userSessions[selectedUser._id].length === 0 ? (
                    <div style={{ color: "var(--text3)", fontSize: "0.86rem", padding: "24px 0" }}>
                      No chat sessions found.
                    </div>
                  ) : (
                    userSessions[selectedUser._id].map((session, si) => (
                      <div
                        key={session._id}
                        className="ap-session-card"
                        style={{
                          border: "1px solid var(--border2)", borderRadius: 12,
                          background: "var(--bg2)",
                          animation: `ap-slide-in 0.18s ease ${si * 35}ms both`,
                        }}
                      >
                        <button
                          onClick={() => setExpandedSessionId(expandedSessionId === session._id ? null : session._id)}
                          style={{
                            width: "100%", display: "flex", alignItems: "center",
                            justifyContent: "space-between", padding: "13px 16px",
                            background: "transparent", border: "none", cursor: "pointer",
                            fontFamily: "inherit", color: "var(--text)", gap: 10, textAlign: "left",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                              background: "var(--bg3)", border: "1px solid var(--border)",
                              display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)",
                            }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: "0.87rem", fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {session.title || "Untitled Chat"}
                              </div>
                              <div style={{ fontSize: "0.73rem", color: "var(--text3)", marginTop: 1 }}>
                                {session.messages?.length || 0} messages · {new Date(session.updatedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                              </div>
                            </div>
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{
                            color: "var(--text3)", flexShrink: 0,
                            transform: expandedSessionId === session._id ? "rotate(90deg)" : "rotate(0deg)",
                            transition: "transform 0.22s cubic-bezier(0.4,0,0.2,1)",
                          }}>
                            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        {expandedSessionId === session._id && (
                          <div style={{
                            borderTop: "1px solid var(--border)", padding: "14px 16px",
                            display: "flex", flexDirection: "column", gap: 8,
                            animation: "ap-slide-in 0.16s ease",
                          }}>
                            {(!session.messages || session.messages.length === 0) ? (
                              <p style={{ margin: 0, fontSize: "0.83rem", color: "var(--text3)" }}>No messages.</p>
                            ) : session.messages.map((msg, idx) => (
                              <div key={idx} style={{
                                display: "flex",
                                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                                animation: `ap-slide-in 0.12s ease ${idx * 25}ms both`,
                              }}>
                                <div style={{
                                  maxWidth: "72%", padding: "8px 13px", borderRadius: 10,
                                  background: msg.role === "user" ? "var(--accent)" : "var(--bg4)",
                                  color: msg.role === "user" ? "#fff" : "var(--text)",
                                  fontSize: "0.83rem", lineHeight: 1.55,
                                }}>
                                  <div style={{ fontSize: "0.68rem", opacity: 0.6, marginBottom: 3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                    {msg.role === "user" ? "User" : "Bot"}
                                  </div>
                                  {msg.text}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%",
          background: "#1e293b", color: "#fff", padding: "10px 20px",
          borderRadius: 8, fontSize: 14, zIndex: 9999,
          boxShadow: "0 4px 16px rgba(0,0,0,0.35)", whiteSpace: "nowrap",
          animation: toastVisible
            ? "ap-toast-in 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards"
            : "ap-toast-out 0.3s ease forwards",
        }}>
          {toast}
        </div>
      )}
    </>
  );
}

export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState(EMPTY_FORM);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [thinkingStage, setThinkingStage] = useState(0);

  // UI state
  const [listening, setListening] = useState(false);
  const [language, setLanguage] = useState("en-US");
  const [langOpen, setLangOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [toast, setToast] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);

  // ── Call Agent state ────────────────────────────────────
  const [callMode, setCallMode] = useState(false);
  const [callStatus, setCallStatus] = useState("idle");

  const chatEndRef = useRef(null);
  const fullReplyRef = useRef("");
  const langRef = useRef(null);
  const menuRef = useRef(null);
  const thinkingTimerRef = useRef(null);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const editInputRef = useRef(null);
  const chatScrollRef = useRef(null);
  const tokenRef = useRef(token);
  const currentSessionIdRef = useRef(currentSessionId);

  // ── Call Agent refs ─────────────────────────────────────
  const callModeRef = useRef(false);
  const speakingRef = useRef(false);
  const callRecognitionRef = useRef(null);
  const adaptiveThresholdRef = useRef(0.025);

  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { currentSessionIdRef.current = currentSessionId; }, [currentSessionId]);

  const LANGUAGES = [
    { code: "en-US", label: "English", flag: "🇺🇸" },
    { code: "hi-IN", label: "Hindi", flag: "🇮🇳" },
    { code: "ta-IN", label: "Tamil", flag: "🇮🇳" },
    { code: "te-IN", label: "Telugu", flag: "🇮🇳" },
    { code: "fr-FR", label: "French", flag: "🇫🇷" },
    { code: "es-ES", label: "Spanish", flag: "🇪🇸" },
    { code: "de-DE", label: "German", flag: "🇩🇪" },
    { code: "ja-JP", label: "Japanese", flag: "🇯🇵" },
  ];

  const currentLang = LANGUAGES.find((l) => l.code === language);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => t === "dark" ? "light" : "dark");

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (token) { loadSessions(); startNewSession(); }
  }, [token]);

  useEffect(() => {
    const handleClick = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    return () => {
      stopThinkingAnimation();
      clearSilenceTimer();
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  // ── Session management ──────────────────────────────────
  const loadSessions = async () => {
    try {
      const res = await fetch(`${API}/sessions`, {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      const data = await res.json();
      if (data.sessions) setSessions(data.sessions);
    } catch (err) {
      console.error("Failed to load sessions", err);
    }
  };

  const saveCurrentSession = async (msgs = null) => {
    const msgsToSave = msgs;
    if (!msgsToSave || !msgsToSave.length) return;
    const title =
      msgsToSave.find((m) => m.role === "user")?.text?.slice(0, 50) || "New Chat";
    try {
      const sessId = currentSessionIdRef.current;
      if (sessId) {
        await fetch(`${API}/sessions/${sessId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenRef.current}`,
          },
          body: JSON.stringify({
            title,
            messages: msgsToSave.map((m) => ({ role: m.role, text: m.text, time: m.time })),
          }),
        });
      } else {
        const res = await fetch(`${API}/sessions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenRef.current}`,
          },
          body: JSON.stringify({
            title,
            messages: msgsToSave.map((m) => ({ role: m.role, text: m.text, time: m.time })),
          }),
        });
        const data = await res.json();
        if (data.session) {
          setCurrentSessionId(data.session._id);
          currentSessionIdRef.current = data.session._id;
        }
      }
      await loadSessions();
    } catch (err) {
      console.error("Failed to save session", err);
    }
  };

  const startNewSession = async () => {
    setMessages((prev) => {
      if (prev.length > 0) saveCurrentSession(prev).then(() => loadSessions());
      return [];
    });
    setCurrentSessionId(null);
    currentSessionIdRef.current = null;
    setDrawerOpen(false);
    setMenuOpen(false);
  };

  const loadSession = async (sessionId) => {
    try {
      setMessages((prev) => {
        if (prev.length > 0) saveCurrentSession(prev);
        return prev;
      });
      const res = await fetch(`${API}/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      const data = await res.json();
      if (data.session) {
        const formatted = data.session.messages.map((m, i) => ({
          role: m.role, text: m.text, time: new Date(m.time), id: sessionId + i,
        }));
        setMessages(formatted);
        setCurrentSessionId(sessionId);
        currentSessionIdRef.current = sessionId;
        setDrawerOpen(false);
        setMenuOpen(false);
      }
    } catch (err) {
      console.error("Failed to load session", err);
    }
  };

  const deleteSession = async (sessionId) => {
    try {
      await fetch(`${API}/sessions/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      if (currentSessionIdRef.current === sessionId) {
        setMessages([]);
        setCurrentSessionId(null);
        currentSessionIdRef.current = null;
      }
      setDeleteConfirmId(null);
      await loadSessions();
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  };

  const toggleShare = async (sessionId) => {
    try {
      const res = await fetch(`${API}/sessions/${sessionId}/share`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      const data = await res.json();
      setSessions((prev) =>
        prev.map((s) =>
          s._id === sessionId ? { ...s, isShared: data.isShared, shareId: data.shareId } : s
        )
      );
      if (data.isShared) {
        const link = `${window.location.origin}/shared/${data.shareId}`;
        await navigator.clipboard.writeText(link);
        showToast("🔗 Share link copied to clipboard!");
      } else {
        showToast("🔒 Sharing disabled for this chat.");
      }
    } catch (err) {
      showToast("❌ Failed to toggle share.");
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    currentSessionIdRef.current = null;
    setMenuOpen(false);
  };

  // ── Thinking animation ──────────────────────────────────
  const startThinkingAnimation = () => {
    setThinkingStage(0);
    let stage = 0;
    thinkingTimerRef.current = setInterval(() => {
      stage = (stage + 1) % THINKING_STAGES.length;
      setThinkingStage(stage);
    }, 1200);
  };

  const stopThinkingAnimation = () => {
    if (thinkingTimerRef.current) {
      clearInterval(thinkingTimerRef.current);
      thinkingTimerRef.current = null;
    }
  };

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const resetSilenceTimer = () => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      if (recognitionRef.current) recognitionRef.current.stop();
    }, 2500);
  };

  // ── Auth ────────────────────────────────────────────────
  const handleAuthSubmit = async () => {
    setAuthError("");
    setAuthLoading(true);
    const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";
    const body = authMode === "login"
      ? { email: authForm.email, password: authForm.password }
      : { ...authForm };
    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Something went wrong");
      } else {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setToken(data.token);
        tokenRef.current = data.token;
        setUser(data.user);
        setAuthForm(EMPTY_FORM);
      }
    } catch (err) {
      setAuthError("Server not reachable. Is backend running?");
    }
    setAuthLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    tokenRef.current = "";
    setUser(null);
    setMessages([]);
    setSessions([]);
    setCurrentSessionId(null);
    currentSessionIdRef.current = null;
    setAuthForm(EMPTY_FORM);
    setAuthError("");
    setAuthMode("login");
    setMenuOpen(false);
    setDrawerOpen(false);
    setShowAdmin(false);
  };

  const switchAuthMode = () => {
    setAuthMode((m) => (m === "login" ? "register" : "login"));
    setAuthForm(EMPTY_FORM);
    setAuthError("");
  };

  // ── Edit message ────────────────────────────────────────
  const startEdit = (msg) => { setEditingId(msg.id); setEditText(msg.text); };
  const cancelEdit = () => { setEditingId(null); setEditText(""); };
  const submitEdit = (msgIndex) => {
    if (!editText.trim()) return;
    setMessages(messages.slice(0, msgIndex));
    setEditingId(null);
    setEditText("");
    sendMessage(editText.trim());
  };

  // ── Send message ────────────────────────────────────────
  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText) return;
    const now = new Date();
    const userId = "u" + Date.now();
    const botId = "b" + Date.now();
    const newUserMsg = { role: "user", text: userText, time: now, id: userId };
    const newBotMsg = { role: "bot", text: "", thinking: true, time: now, id: botId };
    setMessages((prev) => [...prev, newUserMsg]);
    setInput("");
    setLoading(true);
    startThinkingAnimation();
    fullReplyRef.current = "";
    setMessages((prev) => [...prev, newBotMsg]);
    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenRef.current}`,
        },
        body: JSON.stringify({ message: userText }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let firstChunk = true;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.trim());
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.replace("data: ", "").trim();
            if (jsonStr === "[DONE]") {
              stopThinkingAnimation();
              setLoading(false);
              speak(fullReplyRef.current);
              setMessages((prev) => {
                const updatedMessages = prev.map((m) =>
                  m.id === botId ? { ...m, text: fullReplyRef.current, thinking: false } : m
                );
                saveCurrentSession(updatedMessages);
                return updatedMessages;
              });
              break;
            }
            try {
              const parsed = JSON.parse(jsonStr);
              const token_text = parsed.token || "";
              if (token_text) {
                if (firstChunk) { firstChunk = false; stopThinkingAnimation(); setLoading(false); }
                fullReplyRef.current += token_text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    text: fullReplyRef.current, thinking: false,
                  };
                  return updated;
                });
              }
            } catch (e) { }
          }
        }
      }
    } catch (err) {
      stopThinkingAnimation();
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1], text: "Error reaching server.", thinking: false,
        };
        return updated;
      });
      setLoading(false);
    }
  };

  const speak = (text) => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = language;
    window.speechSynthesis.speak(utter);
  };

  const copyMessage = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const playMessage = (text, id) => {
    if (playingId === id) { window.speechSynthesis.cancel(); setPlayingId(null); return; }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = language;
    utter.onend = () => setPlayingId(null);
    utter.onerror = () => setPlayingId(null);
    setPlayingId(id);
    window.speechSynthesis.speak(utter);
  };

  // ── Call Agent ───────────────────────────────────────────
  const startCallListening = async () => {
    if (!callModeRef.current) return;
    setCallStatus("listening");
    speakingRef.current = false;
    try {
      const { stream, analyser } = await getSharedMicStream();
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      callRecognitionRef.current = mediaRecorder;
      let chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      const dataArray = new Float32Array(analyser.fftSize);
      const rmsHistory = [];
      const HISTORY_SIZE = 20;
      let adaptiveThreshold = 0.025;
      let speechDetected = false;
      let silenceStart = null;
      const SILENCE_DURATION = 2000;
      const MAX_DURATION = 8000;
      const silenceInterval = setInterval(() => {
        analyser.getFloatTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        rmsHistory.push(rms);
        if (rmsHistory.length > HISTORY_SIZE) rmsHistory.shift();
        if (!speechDetected && rmsHistory.length >= 5) {
          const sorted = [...rmsHistory].sort((a, b) => a - b);
          const noiseFloor = sorted[Math.floor(sorted.length * 0.5)];
          adaptiveThreshold = Math.max(0.025, noiseFloor * 3.0);
          adaptiveThresholdRef.current = adaptiveThreshold;
        }
        if (rms > adaptiveThreshold) {
          speechDetected = true;
          silenceStart = null;
        } else if (speechDetected) {
          if (!silenceStart) silenceStart = Date.now();
          if (Date.now() - silenceStart > SILENCE_DURATION) {
            clearInterval(silenceInterval);
            clearTimeout(maxTimer);
            if (mediaRecorder.state === "recording") mediaRecorder.stop();
          }
        }
      }, 100);
      const maxTimer = setTimeout(() => {
        clearInterval(silenceInterval);
        if (mediaRecorder.state === "recording") mediaRecorder.stop();
      }, MAX_DURATION);
      mediaRecorder.start();
      setTimeout(() => {
        if (mediaRecorder.state === "recording") mediaRecorder.stop();
      }, 5000);
      mediaRecorder.onstop = async () => {
        clearInterval(silenceInterval);
        clearTimeout(maxTimer);
        const blob = new Blob(chunks, { type: "audio/webm" });
        const lastRms = rmsHistory.length ? rmsHistory[rmsHistory.length - 1] : 0.05;
        if (lastRms < 0.025) {
          console.log("❌ No real speech — low energy:", lastRms.toFixed(4));
          setCallStatus("listening");
          setTimeout(() => startCallListening(), 500);
          return;
        }
        const formData = new FormData();
        formData.append("audio", blob, "chunk.webm");
        formData.append("language", language.split("-")[0]);
        try {
          setCallStatus("thinking");
          const res = await fetch(`${API}/call/transcribe`, {
            method: "POST",
            headers: { Authorization: `Bearer ${tokenRef.current}` },
            body: formData,
          });
          const data = await res.json();
          const transcript = data.transcript?.trim();
          if (!transcript) {
            setCallStatus("listening");
            setTimeout(() => startCallListening(), 500);
            return;
          }
          const isShortPhrase = transcript.split(" ").length <= 3;
          const isSameAsLast = transcript.toLowerCase() === window._lastCallTranscript;
          if (isShortPhrase && isSameAsLast && lastRms < 0.030) {
            console.log("❌ Repeated noise ignored:", transcript, "RMS:", lastRms.toFixed(4));
            window._lastCallTranscript = "";
            setCallStatus("listening");
            setTimeout(() => startCallListening(), 500);
            return;
          }
          window._lastCallTranscript = transcript.toLowerCase();
          sendCallMessage(transcript);
        } catch (err) {
          console.error("Transcription error:", err);
          setCallStatus("listening");
          setTimeout(() => startCallListening(), 1000);
        }
      };
    } catch (err) {
      console.error("Call listening error:", err);
      setCallStatus("idle");
    }
  };

  const sendCallMessage = async (text) => {
    if (!callModeRef.current) return;
    setCallStatus("thinking");
    const now = new Date();
    const userId = "u" + Date.now();
    const botId = "b" + Date.now();
    setMessages((prev) => [...prev, { role: "user", text, time: now, id: userId }]);
    const newBotMsg = { role: "bot", text: "", thinking: true, time: now, id: botId };
    setMessages((prev) => [...prev, newBotMsg]);
    fullReplyRef.current = "";
    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenRef.current}`,
        },
        body: JSON.stringify({ message: text }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.trim());
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.replace("data: ", "").trim();
            if (jsonStr === "[DONE]") {
              setMessages((prev) => {
                const updated = prev.map((m) =>
                  m.id === botId ? { ...m, text: fullReplyRef.current, thinking: false } : m
                );
                saveCurrentSession(updated);
                return updated;
              });
              if (callModeRef.current) speakCallReply(fullReplyRef.current);
              break;
            }
            try {
              const parsed = JSON.parse(jsonStr);
              const token_text = parsed.token || "";
              if (token_text) {
                fullReplyRef.current += token_text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    text: fullReplyRef.current, thinking: false,
                  };
                  return updated;
                });
              }
            } catch (e) { }
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          text: "Error reaching server.", thinking: false,
        };
        return updated;
      });
      if (callModeRef.current) setTimeout(() => startCallListening(), 500);
    }
  };

  const speakCallReply = async (text) => {
    if (!callModeRef.current) return;
    const sessionId = ++activeBargeSessionId;
    setCallStatus("speaking");
    speakingRef.current = true;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    let bargeInterval = null;
    let bargeAnalyser = null;
    let bargeSource = null;
    const cleanupBarge = () => {
      if (bargeInterval) { clearInterval(bargeInterval); bargeInterval = null; }
      if (bargeSource) { try { bargeSource.disconnect(); } catch {} bargeSource = null; }
      bargeAnalyser = null;
    };
    const startBargeDetection = async () => {
      try {
        if (sessionId !== activeBargeSessionId) return;
        const { stream, audioContext } = await getSharedMicStream();
        if (bargeSource) { try { bargeSource.disconnect(); } catch {} }
        bargeAnalyser = audioContext.createAnalyser();
        bargeAnalyser.fftSize = 512;
        bargeSource = audioContext.createMediaStreamSource(stream);
        bargeSource.connect(bargeAnalyser);
        const bargeData = new Float32Array(bargeAnalyser.fftSize);
        const currentAdaptiveThreshold = adaptiveThresholdRef?.current || 0.025;
        const bargeThreshold = Math.max(0.055, currentAdaptiveThreshold * 2.2);
        console.log("🎚️ Barge threshold:", bargeThreshold.toFixed(4), "| Session:", sessionId);
        bargeInterval = setInterval(() => {
          if (sessionId !== activeBargeSessionId) { cleanupBarge(); return; }
          bargeAnalyser.getFloatTimeDomainData(bargeData);
          let sum = 0;
          for (let i = 0; i < bargeData.length; i++) { sum += bargeData[i] * bargeData[i]; }
          const rms = Math.sqrt(sum / bargeData.length);
          if (!rms || rms < 0.001) return;
          console.log("🔍 Barge RMS:", rms.toFixed(4), "| Session:", sessionId);
          if (rms > bargeThreshold) {
            console.log("⚡ Barge-in! RMS:", rms.toFixed(4), "| Session:", sessionId);
            activeBargeSessionId++;
            cleanupBarge();
            window.speechSynthesis.cancel();
            speakingRef.current = false;
            setCallStatus("listening");
            setTimeout(() => startCallListening(), 300);
          }
        }, 50);
      } catch (err) {
        console.error("Barge-in error:", err);
        cleanupBarge();
      }
    };
    utterance.onstart = () => { setTimeout(() => startBargeDetection(), 100); };
    utterance.onend = () => {
      if (sessionId !== activeBargeSessionId) return;
      cleanupBarge();
      speakingRef.current = false;
      if (callModeRef.current) { setCallStatus("listening"); setTimeout(() => startCallListening(), 500); }
    };
    utterance.onerror = (e) => {
      console.error("TTS error:", e);
      if (sessionId !== activeBargeSessionId) return;
      cleanupBarge();
      speakingRef.current = false;
      if (callModeRef.current) { setCallStatus("listening"); setTimeout(() => startCallListening(), 500); }
    };
    window.speechSynthesis.speak(utterance);
  };

  const startCall = () => {
    callModeRef.current = true;
    setCallMode(true);
    setCallStatus("listening");
    stopListening();
    window.speechSynthesis.cancel();
    window._lastCallTranscript = "";
    if (window._audioWatchdog) clearTimeout(window._audioWatchdog);
    window._audioWatchdog = setTimeout(() => {
      if (callModeRef.current) { console.log("🔄 Audio watchdog reset"); cleanupSharedAudio(); }
    }, 20 * 60 * 1000);
    setTimeout(() => startCallListening(), 400);
  };

  const endCall = () => {
    activeBargeSessionId++;
    callModeRef.current = false;
    speakingRef.current = false;
    setCallMode(false);
    setCallStatus("idle");
    window._lastCallTranscript = "";
    if (callRecognitionRef.current?.state === "recording") {
      try { callRecognitionRef.current.stop(); } catch {}
    }
    callRecognitionRef.current = null;
    cleanupSharedAudio();
    window.speechSynthesis.cancel();
  };

  // ── Voice ───────────────────────────────────────────────
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Your browser doesn't support voice input."); return; }
    if (recognitionRef.current) recognitionRef.current.abort();
    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognitionRef.current = recognition;
    setListening(true);
    resetSilenceTimer();
    recognition.onstart = () => resetSilenceTimer();
    recognition.onspeechstart = () => clearSilenceTimer();
    recognition.onspeechend = () => resetSilenceTimer();
    recognition.onresult = (e) => {
      clearSilenceTimer();
      const isFinal = e.results[e.results.length - 1].isFinal;
      const transcript = e.results[e.results.length - 1][0].transcript;
      if (isFinal) { setListening(false); recognitionRef.current = null; sendMessage(transcript); }
    };
    recognition.onerror = () => { clearSilenceTimer(); setListening(false); recognitionRef.current = null; };
    recognition.onend = () => { clearSilenceTimer(); setListening(false); recognitionRef.current = null; };
    recognition.start();
  };

  const stopListening = () => {
    clearSilenceTimer();
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    setListening(false);
  };

  const groupedSessions = sessions.reduce((groups, session) => {
    const label = formatDate(session.updatedAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(session);
    return groups;
  }, {});

  if (window.location.pathname.startsWith("/shared/")) {
    return <SharedChatView />;
  }

  // ─── AUTH UI ─────────────────────────────────────────────
  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-glow" />
        <button className="theme-toggle auth-theme-toggle" onClick={toggleTheme} title="Toggle theme">
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-icon"><NeuralIcon size={30} /></div>
            <h1>AI Voice Bot</h1>
          </div>
          <p className="auth-subtitle">
            {authMode === "login" ? "Welcome back" : "Create your account"}
          </p>
          <div className="auth-fields">
            {authMode === "register" && (
              <div className="field-group">
                <label>Full Name</label>
                <input type="text" placeholder="Enter your full name"
                  value={authForm.name}
                  onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} />
              </div>
            )}
            <div className="field-group">
              <label>Email</label>
              <input type="email" placeholder="Enter your email"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
            </div>
            <div className="field-group">
              <label>Password</label>
              <input type="password" placeholder="Enter your password"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleAuthSubmit()} />
            </div>
          </div>
          {authError && <p className="auth-error">⚠ {authError}</p>}
          <button className="auth-submit" onClick={handleAuthSubmit} disabled={authLoading}>
            {authLoading ? <span className="btn-spinner" /> : authMode === "login" ? "Sign in" : "Create account"}
          </button>
          <p className="auth-toggle">
            {authMode === "login" ? "No account? " : "Have an account? "}
            <span onClick={switchAuthMode}>
              {authMode === "login" ? "Sign up" : "Sign in"}
            </span>
          </p>
        </div>
      </div>
    );
  }

  // ─── CHAT UI ─────────────────────────────────────────────
  return (
    <div className="chat-app">

      {showAdmin && <AdminPanel token={token} onClose={() => setShowAdmin(false)} />}

      {drawerOpen && <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />}

      {/* Left Drawer */}
      <aside className={`drawer ${drawerOpen ? "drawer--open" : ""}`}>
        <div className="drawer-header">
          <div className="drawer-logo">
            <NeuralIcon size={18} />
            <span>AI Voice Bot</span>
          </div>
          <button className="drawer-close" onClick={() => setDrawerOpen(false)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <button className="new-chat-btn" onClick={startNewSession}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New Chat
        </button>

        <div className="drawer-sessions">
          {sessions.length === 0 ? (
            <p className="drawer-empty">No chats yet</p>
          ) : (
            Object.entries(groupedSessions).map(([label, group]) => (
              <div key={label} className="session-group">
                <p className="session-group-label">{label}</p>
                {group.map((session) => (
                  <div key={session._id}
                    className={`session-item ${currentSessionId === session._id ? "session-item--active" : ""}`}>
                    <button className="session-title" onClick={() => loadSession(session._id)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>{session.title}</span>
                    </button>
                    {deleteConfirmId === session._id ? (
                      <div className="delete-confirm">
                        <button className="delete-yes" onClick={() => deleteSession(session._id)}>Delete</button>
                        <button className="delete-no" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 2 }}>
                        <button className="session-delete"
                          title={session.isShared ? "Disable share" : "Copy share link"}
                          onClick={(e) => { e.stopPropagation(); toggleShare(session._id); }}
                          style={{ color: session.isShared ? "#3b82f6" : "inherit" }}>
                          {session.isShared ? (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                              <path d="M13.5 10.5L21 3M3 21l7.5-7.5M9 15l-1.5 1.5a4.243 4.243 0 006 6L15 21a4.243 4.243 0 000-6M15 9l1.5-1.5a4.243 4.243 0 00-6-6L9 3a4.243 4.243 0 000 6"
                                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                              <path d="M13.5 10.5a4.5 4.5 0 010 6.364l-3 3a4.5 4.5 0 01-6.364-6.364l1.5-1.5"
                                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                              <path d="M10.5 13.5a4.5 4.5 0 010-6.364l3-3a4.5 4.5 0 016.364 6.364l-1.5 1.5"
                                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          )}
                        </button>
                        <button className="session-delete"
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(session._id); }}
                          title="Delete">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        <div className="drawer-footer">
          <div className="user-chip">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <span className="user-name">{user?.name}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Sign out</button>
        </div>
      </aside>

      {/* Topbar */}
      <header className="topbar">
        <div className="topbar-left">
          <button className="drawer-toggle" onClick={() => setDrawerOpen((o) => !o)} title="Chats">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9 3v18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M13 8h4M13 12h4M13 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <div className="topbar-logo"><NeuralIcon size={20} /></div>
          <span className="topbar-title">AI Voice Bot</span>
          <span className="online-dot" title="Online" />
        </div>

        {/* Desktop controls */}
        <div className="topbar-right desktop-only">
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          <div className="lang-dropdown" ref={langRef}>
            <button className="lang-trigger" onClick={() => setLangOpen((o) => !o)}>
              <span className="lang-flag">{currentLang?.flag}</span>
              <span className="lang-label-text">{currentLang?.label}</span>
              <svg className={`lang-chevron ${langOpen ? "open" : ""}`} width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {langOpen && (
              <div className="lang-menu">
                {LANGUAGES.map((l) => (
                  <button key={l.code}
                    className={`lang-option ${l.code === language ? "lang-option--active" : ""}`}
                    onClick={() => { setLanguage(l.code); setLangOpen(false); }}>
                    <span>{l.flag}</span><span>{l.label}</span>
                    {l.code === language && (
                      <svg className="lang-check" width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="icon-btn" onClick={startCall} title="Start Voice Call"
            style={{ color: "#22c55e", borderColor: "rgba(34,197,94,0.4)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.1 2.18 2 2 0 012.08.1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.11 7.91a16 16 0 006 6l1.17-1.17a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {user?.isAdmin && (
            <button className="icon-btn" onClick={() => setShowAdmin(true)} title="Admin Panel"
              style={{ color: "var(--accent3)", borderColor: "var(--accent)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <button className="icon-btn" onClick={startNewSession} title="New chat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <button className="icon-btn" onClick={handleClearChat} title="Clear chat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <div className="user-chip">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <span className="user-name">{user?.name}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Sign out</button>
        </div>

        {/* Mobile hamburger */}
        <div className="topbar-right mobile-only" ref={menuRef}>
          <button className="hamburger-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
            {menuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>
          {menuOpen && (
            <div className="mobile-menu">
              <div className="mobile-menu-user">
                <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
                <span className="mobile-menu-username">{user?.name}</span>
              </div>
              <div className="mobile-menu-divider" />
              <button className="mobile-menu-item" onClick={() => { toggleTheme(); setMenuOpen(false); }}>
                {theme === "dark" ? <SunIcon /> : <MoonIcon />}
                <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
              </button>
              <div className="mobile-menu-item mobile-lang-row">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" stroke="currentColor" strokeWidth="2" />
                </svg>
                <span>Language</span>
                <select className="mobile-lang-select" value={language}
                  onChange={(e) => { setLanguage(e.target.value); setMenuOpen(false); }}>
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
                  ))}
                </select>
              </div>
              <button className="mobile-menu-item" onClick={() => { startCall(); setMenuOpen(false); }}
                style={{ color: "#22c55e" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.1 2.18 2 2 0 012.08.1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.11 7.91a16 16 0 006 6l1.17-1.17a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Start Voice Call</span>
              </button>
              {user?.isAdmin && (
                <button className="mobile-menu-item" onClick={() => { setShowAdmin(true); setMenuOpen(false); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span>Admin Panel</span>
                </button>
              )}
              <button className="mobile-menu-item" onClick={startNewSession}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span>New chat</span>
              </button>
              <button className="mobile-menu-item" onClick={handleClearChat}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Clear chat</span>
              </button>
              <div className="mobile-menu-divider" />
              <button className="mobile-menu-item mobile-menu-logout" onClick={handleLogout}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Chat area */}
      <main className="chat-main">
        <div className="chat-scroll" ref={chatScrollRef}>
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon"><NeuralIcon size={44} /></div>
              <h2>How can I help you today?</h2>
              <p>Ask me anything or press the mic to speak</p>
              <div className="suggestion-chips">
                {["What can you do?", "Tell me a fun fact", "Help me write an email"].map((s) => (
                  <button key={s} className="chip" onClick={() => sendMessage(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={msg.id || i} className={`msg-row ${msg.role}`}>
              {msg.role === "bot" && (
                <div className={`bot-avatar ${msg.thinking ? "bot-avatar--thinking" : ""}`}>
                  <NeuralIcon size={14} />
                </div>
              )}
              <div className="msg-col">
                {msg.role === "user" && editingId === msg.id ? (
                  <div className="edit-wrap">
                    <textarea ref={editInputRef} className="edit-input" value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitEdit(i); }
                        if (e.key === "Escape") cancelEdit();
                      }} rows={3} />
                    <div className="edit-actions">
                      <button className="edit-cancel-btn" onClick={cancelEdit}>Cancel</button>
                      <button className="edit-submit-btn" onClick={() => submitEdit(i)}>Send</button>
                    </div>
                  </div>
                ) : (
                  <div className={`msg-bubble ${msg.role}`}>
                    {msg.thinking ? (
                      <div className="thinking-block">
                        <div className="thinking-orbs"><span /><span /><span /></div>
                        <span className="thinking-label">{THINKING_STAGES[thinkingStage]}</span>
                      </div>
                    ) : (msg.text || "")}
                  </div>
                )}
                {!msg.thinking && msg.text && editingId !== msg.id && (
                  <div className={`msg-meta ${msg.role}`}>
                    <span className="msg-time">{msg.time ? formatTime(msg.time) : ""}</span>
                    {msg.role === "user" && (
                      <button className="msg-action-btn" onClick={() => startEdit(msg)} title="Edit">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                          <path d="M11.5 2.5a1.414 1.414 0 012 2L5 13H3v-2L11.5 2.5z"
                            stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    )}
                    <button
                      className={`msg-action-btn ${copiedId === msg.id ? "action-success" : ""}`}
                      onClick={() => copyMessage(msg.text, msg.id)} title="Copy">
                      {copiedId === msg.id ? (
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                          <rect x="5" y="5" width="8" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                          <path d="M11 5V4a1 1 0 00-1-1H4a1 1 0 00-1 1v8a1 1 0 001 1h1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                      )}
                    </button>
                    {msg.role === "bot" && (
                      <button
                        className={`msg-action-btn ${playingId === msg.id ? "action-playing" : ""}`}
                        onClick={() => playMessage(msg.text, msg.id)}
                        title={playingId === msg.id ? "Stop" : "Play"}>
                        {playingId === msg.id ? (
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <rect x="3" y="3" width="4" height="10" rx="1" fill="currentColor" />
                            <rect x="9" y="3" width="4" height="10" rx="1" fill="currentColor" />
                          </svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <path d="M5 3.5l8 4.5-8 4.5V3.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </main>

      {/* Call Agent Overlay */}
      {callMode && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 500,
          background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 24,
        }}>
          <div style={{ position: "relative", width: 120, height: 120 }}>
            <div style={{
              position: "absolute", inset: -20, borderRadius: "50%",
              border: `2px solid ${callStatus === "listening" ? "rgba(34,197,94,0.4)" : callStatus === "speaking" ? "rgba(59,130,246,0.4)" : "rgba(251,191,36,0.4)"}`,
              animation: "call-ring-outer 1.8s ease-out infinite",
            }} />
            <div style={{
              position: "absolute", inset: -8, borderRadius: "50%",
              border: `2px solid ${callStatus === "listening" ? "rgba(34,197,94,0.6)" : callStatus === "speaking" ? "rgba(59,130,246,0.6)" : "rgba(251,191,36,0.6)"}`,
              animation: "call-ring-inner 1.8s ease-out infinite 0.3s",
            }} />
            <div style={{
              width: 120, height: 120, borderRadius: "50%",
              background: callStatus === "listening" ? "rgba(34,197,94,0.15)" : callStatus === "speaking" ? "rgba(59,130,246,0.15)" : "rgba(251,191,36,0.15)",
              border: `2px solid ${callStatus === "listening" ? "#22c55e" : callStatus === "speaking" ? "#3b82f6" : "#fbbf24"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.4s ease",
            }}>
              <NeuralIcon size={44} />
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#fff", marginBottom: 6 }}>
              AI Voice Agent
            </div>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontSize: "0.9rem", fontWeight: 500,
              color: callStatus === "listening" ? "#22c55e" : callStatus === "speaking" ? "#3b82f6" : "#fbbf24",
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: callStatus === "listening" ? "#22c55e" : callStatus === "speaking" ? "#3b82f6" : "#fbbf24",
                animation: "call-dot-pulse 1s ease-in-out infinite",
              }} />
              {callStatus === "listening" && "🎙️ Listening..."}
              {callStatus === "thinking" && "🤖 Thinking..."}
              {callStatus === "speaking" && "🔊 Speaking..."}
            </div>
          </div>
          {(callStatus === "listening" || callStatus === "speaking") && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, height: 32 }}>
              {[1, 1.6, 1.2, 1.8, 1, 1.4, 1.7, 1.1, 1.5, 1].map((h, i) => (
                <div key={i} style={{
                  width: 4, borderRadius: 4,
                  background: callStatus === "listening" ? "#22c55e" : "#3b82f6",
                  animation: `call-wave 0.8s ease-in-out infinite`,
                  animationDelay: `${i * 0.08}s`,
                  height: `${h * 14}px`,
                  opacity: 0.8,
                }} />
              ))}
            </div>
          )}
          <button onClick={endCall} style={{
            marginTop: 8, width: 60, height: 60, borderRadius: "50%",
            background: "#ef4444", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 20px rgba(239,68,68,0.5)",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 012 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.42 19.42 0 013.43 9.19 19.79 19.79 0 01.36 .54 2 2 0 012.35.54h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.33 8.45a16 16 0 004.35 4.86z"
                fill="white" />
              <line x1="1" y1="1" x2="23" y2="23" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem" }}>
            Tap red button to end call
          </p>
        </div>
      )}

      {listening && (
        <div className="voice-overlay">
          <div className="voice-modal">
            <div className="voice-ring">
              <div className="voice-ring-inner"><NeuralIcon size={28} /></div>
            </div>
            <div className="voice-waveform">
              <span /><span /><span /><span /><span />
              <span /><span /><span /><span />
            </div>
            <p className="voice-label">Listening…</p>
            <p className="voice-sublabel">Speak now. Stops after silence.</p>
            <button className="voice-stop-btn" onClick={stopListening}>Stop</button>
          </div>
        </div>
      )}

      <div className="input-dock">
        <div className="input-wrap">
          <input type="text" className="chat-input"
            placeholder={listening ? "Listening…" : "Message AI Voice Bot..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage()}
            disabled={listening} />
          <div className="input-actions">
            <button className={`mic-btn ${listening ? "mic-on" : ""}`}
              onClick={listening ? stopListening : startListening} disabled={loading}>
              {listening ? (
                <div className="mic-waveform"><span /><span /><span /></div>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <rect x="8" y="3" width="8" height="12" rx="4" stroke="currentColor" strokeWidth="2" />
                  <path d="M5 11C5 14.866 8.134 18 12 18C15.866 18 19 14.866 19 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M12 18V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M9 21H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </button>
            <button className="send-btn" onClick={() => sendMessage()}
              disabled={loading || !input.trim() || listening}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M12 19V5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                <path d="M6.5 10.5L12 5L17.5 10.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
        <p className="input-hint">
          {listening ? "🔴 Recording — tap mic or Stop to cancel" : "Hey there! How can I help you?"}
        </p>
      </div>

      {/* Floating Call Button */}
      {!callMode && (
        <button onClick={startCall} title="Start Voice Call" style={{
          position: "fixed", bottom: 28, left: 24, zIndex: 900,
          width: 56, height: 56, borderRadius: "50%",
          background: "linear-gradient(135deg, #22c55e, #16a34a)",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(34,197,94,0.5)",
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.12)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(34,197,94,0.7)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(34,197,94,0.5)"; }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.1 2.18 2 2 0 012.08.1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.11 7.91a16 16 0 006 6l1.17-1.17a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
              fill="white" />
          </svg>
          <span style={{
            position: "absolute", inset: -4, borderRadius: "50%",
            border: "2px solid rgba(34,197,94,0.4)",
            animation: "call-ring-outer 2s ease-out infinite",
            pointerEvents: "none",
          }} />
        </button>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#1e293b", color: "#fff", padding: "10px 20px",
          borderRadius: 8, fontSize: 14, zIndex: 9999,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)", whiteSpace: "nowrap",
        }}>
          {toast}
        </div>
      )}

    </div>
  );
}