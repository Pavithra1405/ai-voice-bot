import { useState, useEffect, useRef } from "react";
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

// ── Theme toggle icon ──
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

export default function App() {
  // ── Theme ──
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");

  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState(EMPTY_FORM);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [thinkingStage, setThinkingStage] = useState(0);
  const [listening, setListening] = useState(false);
  const [listenStatus, setListenStatus] = useState("idle");
  const [language, setLanguage] = useState("en-US");
  const [langOpen, setLangOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const chatEndRef = useRef(null);
  const fullReplyRef = useRef("");
  const langRef = useRef(null);
  const thinkingTimerRef = useRef(null);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);

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

  // ── Apply theme to <html> ──
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => t === "dark" ? "light" : "dark");

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (token) loadHistory();
  }, [token]);

  useEffect(() => {
    const handleClick = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
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

  const loadHistory = async () => {
    try {
      const res = await fetch(`${API}/chat/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.history) {
        const formatted = data.history.reverse().flatMap((h) => [
          { role: "user", text: h.userMessage, time: new Date(h.createdAt), id: h._id + "u" },
          { role: "bot",  text: h.botReply,    time: new Date(h.createdAt), id: h._id + "b" },
        ]);
        setMessages(formatted);
      }
    } catch (err) {
      console.error("History load failed", err);
    }
  };

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
    setUser(null);
    setMessages([]);
    setAuthForm(EMPTY_FORM);
    setAuthError("");
    setAuthMode("login");
  };

  const switchAuthMode = () => {
    setAuthMode((m) => (m === "login" ? "register" : "login"));
    setAuthForm(EMPTY_FORM);
    setAuthError("");
  };

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText) return;
    const now = new Date();
    const userId = "u" + Date.now();
    const botId  = "b" + Date.now();
    setMessages((prev) => [...prev, { role: "user", text: userText, time: now, id: userId }]);
    setInput("");
    setLoading(true);
    startThinkingAnimation();
    fullReplyRef.current = "";
    setMessages((prev) => [...prev, { role: "bot", text: "", thinking: true, time: now, id: botId }]);

    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
    setListenStatus("listening");
    resetSilenceTimer();
    recognition.onstart = () => resetSilenceTimer();
    recognition.onspeechstart = () => clearSilenceTimer();
    recognition.onspeechend = () => resetSilenceTimer();
    recognition.onresult = (e) => {
      clearSilenceTimer();
      const isFinal = e.results[e.results.length - 1].isFinal;
      const transcript = e.results[e.results.length - 1][0].transcript;
      if (isFinal) {
        setListenStatus("processing");
        setListening(false);
        recognitionRef.current = null;
        sendMessage(transcript);
      }
    };
    recognition.onerror = () => {
      clearSilenceTimer();
      setListening(false);
      setListenStatus("idle");
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      clearSilenceTimer();
      setListening(false);
      setListenStatus("idle");
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
    setListenStatus("idle");
  };

  // ─── AUTH UI ─────────────────────────────────────────────
  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-glow" />

        {/* Theme toggle on auth page */}
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
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-logo"><NeuralIcon size={20} /></div>
          <span className="topbar-title">AI Voice Bot</span>
          <span className="online-dot" title="Online" />
        </div>
        <div className="topbar-right">

          {/* ── Theme toggle button ── */}
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
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
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

          <div className="user-chip">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <span className="user-name">{user?.name}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <main className="chat-main">
        <div className="chat-scroll">
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
                <div className={`msg-bubble ${msg.role}`}>
                  {msg.thinking ? (
                    <div className="thinking-block">
                      <div className="thinking-orbs"><span /><span /><span /></div>
                      <span className="thinking-label">{THINKING_STAGES[thinkingStage]}</span>
                    </div>
                  ) : (msg.text || "")}
                </div>

                {!msg.thinking && msg.text && (
                  <div className={`msg-meta ${msg.role}`}>
                    <span className="msg-time">
                      {msg.time ? formatTime(msg.time) : ""}
                    </span>
                    <button
                      className={`msg-action-btn ${copiedId === msg.id ? "action-success" : ""}`}
                      onClick={() => copyMessage(msg.text, msg.id)}
                      title="Copy"
                    >
                      {copiedId === msg.id ? (
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2.2"
                            strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                          <rect x="5" y="5" width="8" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                          <path d="M11 5V4a1 1 0 00-1-1H4a1 1 0 00-1 1v8a1 1 0 001 1h1"
                            stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                      )}
                    </button>
                    {msg.role === "bot" && (
                      <button
                        className={`msg-action-btn ${playingId === msg.id ? "action-playing" : ""}`}
                        onClick={() => playMessage(msg.text, msg.id)}
                        title={playingId === msg.id ? "Stop" : "Play"}
                      >
                        {playingId === msg.id ? (
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <rect x="3" y="3" width="4" height="10" rx="1" fill="currentColor" />
                            <rect x="9" y="3" width="4" height="10" rx="1" fill="currentColor" />
                          </svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <path d="M5 3.5l8 4.5-8 4.5V3.5z" stroke="currentColor" strokeWidth="1.4"
                              strokeLinejoin="round" />
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
              disabled={loading}
            >
              {listening ? (
                <div className="mic-waveform"><span /><span /><span /></div>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <rect x="8" y="3" width="8" height="12" rx="4" stroke="currentColor" strokeWidth="2" />
                  <path d="M5 11C5 14.866 8.134 18 12 18C15.866 18 19 14.866 19 11"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M12 18V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M9 21H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </button>
            <button
              className="send-btn"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim() || listening}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M12 19V5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                <path d="M6.5 10.5L12 5L17.5 10.5" stroke="currentColor" strokeWidth="2.4"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
        <p className="input-hint">
          {listening ? "🔴 Recording — tap mic or Stop to cancel" : "Hey there! How can I help you?"}
        </p>
      </div>
    </div>
  );
}