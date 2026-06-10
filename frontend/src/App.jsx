import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const THINKING_STAGES = [
  "Understanding your request…",
  "Searching knowledge base…",
  "Generating response…",
];

const EMPTY_FORM = { name: "", email: "", password: "" };

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

// ── Shared Chat View (public read-only) ─────────────────────
function SharedChatView() {
  const [messages, setMessages] = useState([]);
  const [title, setTitle]       = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(true);

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
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"100vh", fontSize:16 }}>
      <NeuralIcon size={28} /> &nbsp; Loading shared chat...
    </div>
  );

  if (error) return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"100vh", fontSize:16, color:"#ef4444" }}>
      ❌ {error}
    </div>
  );

  return (
    <div style={{ maxWidth:720, margin:"0 auto", padding:"32px 16px", fontFamily:"sans-serif" }}>
      <div style={{ marginBottom:24, paddingBottom:16, borderBottom:"1px solid #e2e8f0" }}>
        <h2 style={{ margin:0 }}>💬 {title}</h2>
        <p style={{ margin:"4px 0 0", color:"#94a3b8", fontSize:13 }}>Read-only shared conversation</p>
      </div>
      {messages.map((msg, i) => (
        <div key={i} style={{ display:"flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom:12 }}>
          <div style={{
            maxWidth:"75%", padding:"10px 14px", borderRadius:12,
            background: msg.role === "user" ? "#3b82f6" : "#f1f5f9",
            color: msg.role === "user" ? "#fff" : "#1e293b",
            fontSize:14, lineHeight:1.5,
          }}>
            <div style={{ fontSize:11, opacity:0.6, marginBottom:4 }}>
              {msg.role === "user" ? "You" : "AI Bot"}
            </div>
            {msg.text}
          </div>
        </div>
      ))}
    </div>
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

  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { currentSessionIdRef.current = currentSessionId; }, [currentSessionId]);

  const LANGUAGES = [
    { code: "en-US", label: "English", flag: "🇺🇸" },
    { code: "hi-IN", label: "Hindi",   flag: "🇮🇳" },
    { code: "ta-IN", label: "Tamil",   flag: "🇮🇳" },
    { code: "te-IN", label: "Telugu",  flag: "🇮🇳" },
    { code: "fr-FR", label: "French",  flag: "🇫🇷" },
    { code: "es-ES", label: "Spanish", flag: "🇪🇸" },
    { code: "de-DE", label: "German",  flag: "🇩🇪" },
    { code: "ja-JP", label: "Japanese",flag: "🇯🇵" },
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
    if (token) {
      loadSessions();
      startNewSession();
    }
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

  // ── Show toast helper ───────────────────────────────────
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
            messages: msgsToSave.map((m) => ({
              role: m.role,
              text: m.text,
              time: m.time,
            })),
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
            messages: msgsToSave.map((m) => ({
              role: m.role,
              text: m.text,
              time: m.time,
            })),
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
      if (prev.length > 0) {
        saveCurrentSession(prev).then(() => loadSessions());
      }
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
          role: m.role,
          text: m.text,
          time: new Date(m.time),
          id: sessionId + i,
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

  // ── Share session ───────────────────────────────────────
  const toggleShare = async (sessionId) => {
    try {
      const res = await fetch(`${API}/sessions/${sessionId}/share`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      const data = await res.json();
      setSessions((prev) =>
        prev.map((s) =>
          s._id === sessionId
            ? { ...s, isShared: data.isShared, shareId: data.shareId }
            : s
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
      console.error("Share toggle failed", err);
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
  };

  const switchAuthMode = () => {
    setAuthMode((m) => (m === "login" ? "register" : "login"));
    setAuthForm(EMPTY_FORM);
    setAuthError("");
  };

  // ── Edit message ────────────────────────────────────────
  const startEdit = (msg) => {
    setEditingId(msg.id);
    setEditText(msg.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const submitEdit = (msgIndex) => {
    if (!editText.trim()) return;
    const messagesUpToEdit = messages.slice(0, msgIndex);
    setMessages(messagesUpToEdit);
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
    const botId  = "b" + Date.now();

    const newUserMsg = { role: "user", text: userText, time: now, id: userId };
    const newBotMsg  = { role: "bot", text: "", thinking: true, time: now, id: botId };

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
                  m.id === botId
                    ? { ...m, text: fullReplyRef.current, thinking: false }
                    : m
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
                if (firstChunk) {
                  firstChunk = false;
                  stopThinkingAnimation();
                  setLoading(false);
                }
                fullReplyRef.current += token_text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    text: fullReplyRef.current,
                    thinking: false,
                  };
                  return updated;
                });
              }
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      stopThinkingAnimation();
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          text: "Error reaching server.",
          thinking: false,
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
    if (playingId === id) {
      window.speechSynthesis.cancel();
      setPlayingId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = language;
    utter.onend = () => setPlayingId(null);
    utter.onerror = () => setPlayingId(null);
    setPlayingId(id);
    window.speechSynthesis.speak(utter);
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
      if (isFinal) {
        setListening(false);
        recognitionRef.current = null;
        sendMessage(transcript);
      }
    };
    recognition.onerror = () => {
      clearSilenceTimer();
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      clearSilenceTimer();
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.start();
  };

  const stopListening = () => {
    clearSilenceTimer();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  };

  // Group sessions by date
  const groupedSessions = sessions.reduce((groups, session) => {
    const label = formatDate(session.updatedAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(session);
    return groups;
  }, {});

  // ── Shared page route guard ─────────────────────────────
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

      {/* ── Drawer overlay ── */}
      {drawerOpen && (
        <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
      )}

      {/* ── Left Drawer ── */}
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
                  <div
                    key={session._id}
                    className={`session-item ${currentSessionId === session._id ? "session-item--active" : ""}`}
                  >
                    <button
                      className="session-title"
                      onClick={() => loadSession(session._id)}
                    >
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
                      <div style={{ display:"flex", gap:2 }}>
                        {/* Share button */}
                        <button
                          className="session-delete"
                          title={session.isShared ? "Disable share link" : "Copy share link"}
                          onClick={(e) => { e.stopPropagation(); toggleShare(session._id); }}
                          style={{ color: session.isShared ? "#3b82f6" : "inherit" }}
                        >
                          {session.isShared ? (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                              <path d="M13.5 10.5L21 3M3 21l7.5-7.5M9 15l-1.5 1.5a4.243 4.243 0 006 6L15 21a4.243 4.243 0 000-6M15 9l1.5-1.5a4.243 4.243 0 00-6-6L9 3a4.243 4.243 0 000 6"
                                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                          ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                              <path d="M13.5 10.5a4.5 4.5 0 010 6.364l-3 3a4.5 4.5 0 01-6.364-6.364l1.5-1.5"
                                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                              <path d="M10.5 13.5a4.5 4.5 0 010-6.364l3-3a4.5 4.5 0 016.364 6.364l-1.5 1.5"
                                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                          )}
                        </button>

                        {/* Delete button */}
                        <button
                          className="session-delete"
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(session._id); }}
                          title="Delete"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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

      {/* ── Topbar ── */}
      <header className="topbar">
        <div className="topbar-left">
          <button className="drawer-toggle" onClick={() => setDrawerOpen((o) => !o)} title="Chats">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9 3v18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M13 8h4M13 12h4M13 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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

          <button className="icon-btn" onClick={startNewSession} title="New chat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <button className="icon-btn" onClick={handleClearChat} title="Clear chat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span>Language</span>
                <select className="mobile-lang-select" value={language}
                  onChange={(e) => { setLanguage(e.target.value); setMenuOpen(false); }}>
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
                  ))}
                </select>
              </div>
              <button className="mobile-menu-item" onClick={startNewSession}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span>New chat</span>
              </button>
              <button className="mobile-menu-item" onClick={handleClearChat}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Clear chat</span>
              </button>
              <div className="mobile-menu-divider" />
              <button className="mobile-menu-item mobile-menu-logout" onClick={handleLogout}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Chat area ── */}
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
                    <textarea
                      ref={editInputRef}
                      className="edit-input"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitEdit(i); }
                        if (e.key === "Escape") cancelEdit();
                      }}
                      rows={3}
                    />
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
                            stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
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
          <input
            type="text"
            className="chat-input"
            placeholder={listening ? "Listening…" : "Message AI Voice Bot..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage()}
            disabled={listening}
          />
          <div className="input-actions">
            <button
              className={`mic-btn ${listening ? "mic-on" : ""}`}
              onClick={listening ? stopListening : startListening}
              disabled={loading}>
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
            <button
              className="send-btn"
              onClick={() => sendMessage()}
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

      {/* ── Toast notification ── */}
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