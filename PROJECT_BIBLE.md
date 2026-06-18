# PROJECT BIBLE — AI Voice Customer Support Agent

> **Generated:** June 18, 2026
> **Repository:** `ai-voice-customer-support-agent`

---

## 1. PROJECT OVERVIEW

### 1.1 Project Identity
- **Name:** AI Voice Customer Support Agent (AI Voice Bot)
- **Repository:** `ai-voice-customer-support-agent`
- **Owner:** Pavithra1405
- **License:** MIT

### 1.2 Objective
Build a full-stack, voice-enabled AI customer support chatbot with persistent memory, knowledge retrieval, session management, and a voice-call agent mode that mimics real phone support conversations.

### 1.3 Business Goal
Provide a production-ready, deployable AI customer support platform that businesses can use to:
- Automate customer support via text and voice chat
- Maintain user-specific memory across sessions
- Upload company-specific knowledge bases (FAQs, manuals, pricing docs)
- Allow admin control over users, bans, and knowledge documents
- Deliver voice-enabled customer service with real-time transcription and TTS
- Provide analytics and reporting capabilities via Graphify integration
- Ensure high availability through uptime monitoring and keep-alive automation

### 1.4 Target Users
- **End Users:** Customers seeking support via text or voice call
- **Admins:** Support managers who upload knowledge docs, manage users, monitor sessions
- **Businesses:** Any organisation wanting AI-powered multilingual support

### 1.5 Use Cases
- Text-based AI chat with context-aware answers
- Voice call mode with real-time speech-to-speech conversation
- Knowledge base querying (RAG-style semantic search)
- Session management with shareable chat links
- Admin user management (view, ban, delete users + view their sessions)
- Multilingual support (8 languages)

### 1.6 Current Status
All 5 phases are fully implemented and working in production:
- **Phases 1-4:** Memory system (pattern extraction, embeddings, knowledge base, context window + summarisation)
- **Phase 5:** Production hardening (Uptime Robot monitoring, Cron-job.org keep-alive, Graphify analytics)
- Frontend deployed on Vercel, backend on Render, MongoDB Atlas for data

### 1.7 opencode config Roadmap
- **Phase 6:** Reranking + BM25 hybrid search + source citations in AI replies

---

## 2. COMPLETE SYSTEM ARCHITECTURE

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                       │
│  Vercel · vercel.json (SPA rewrites)                            │
│  ├── Auth UI (login/register → JWT → localStorage)              │
│  ├── Chat UI (SSE streaming, message bubbles, edit/copy/tts)   │
│  ├── Session Drawer (create, load, delete, share sessions)      │
│  ├── Admin Panel (user list, sessions, ban/delete, KB upload)   │
│  ├── Voice Overlay (mic button → SpeechRecognition API)         │
│  ├── Call Agent Overlay (VAD → MediaRecorder → Whisper → LLM → │
│  │   TTS loop)                                                  │
│  └── Theme/Language controls                                    │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTP (REST + SSE)
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                     BACKEND (Express + Node.js)                   │
│  Render · PORT 5000                                              │
│  ├── JWT Auth Middleware                                         │
│  ├── Admin Middleware                                             │
│  ├── Routes: auth, chat, sessions, admin, call, memory, knowledge │
│  │              └── GET /api/health (uptime endpoint)             │
│  └── Services: geminiService, embeddingService, contextService    │
└──────┬───────────────────────┬───────────────────────┬───────────┘
       │                       │                       │
       ▼                       ▼                       ▼
┌──────────┐          ┌──────────────┐          ┌──────────────┐
│ MongoDB  │          │   Groq API   │          │ HuggingFace  │
│ Atlas    │          │   (LLaMA)    │          │  Inference   │
│ (primary)│          │  (Whisper)   │          │ (Embeddings) │
└──────────┘          └──────────────┘          └──────────────┘
       │
       ▼
┌───────────────────┐
│  Graphify         │
│  Analytics Engine │
│  (graphify-out/)  │
└───────────────────┘

           ┌────────────────────────────┐
           │   Uptime Robot             │
           │   └── pings /api/health    │
           │      every few minutes     │
           └───────────┬────────────────┘
                       │
                       ▼
           ┌────────────────────────────┐
           │   Cron-job.org             │
           │   └── scheduled keep-alive │
           │      HTTP requests         │
           └────────────────────────────┘
                       │
                       ▼
                  Backend (Render)
                  stays active / warm
```

### 2.2 Frontend Architecture

| Aspect | Technology |
|--------|-----------|
| **Framework** | React 19.2.6 |
| **Build Tool** | Vite 8.0.12 |
| **HTTP Client** | Fetch API (native), axios (dependency) |
| **Styling** | CSS Custom Properties (dark/light theme), 893-line App.css |
| **State Management** | React useState/useEffect (no external state library) |
| **Auth** | JWT stored in localStorage |
| **Routing** | None (SPA with pathname-based guard for `/shared/:shareId`) |
| **UI Components** | Custom-built (no component library) |
| **Notifications** | react-toastify (dependency), custom inline toast (used) |
| **TTS** | Web Speech API (SpeechSynthesisUtterance) |
| **STT (Text Chat)** | Web Speech API (SpeechRecognition) |
| **STT (Call Agent)** | MediaRecorder → Groq Whisper API |
| **VAD (Call Agent)** | Web Audio API (AnalyserNode, RMS threshold) |
| **Deployment** | Vercel |

#### Frontend Folder Structure
```
frontend/
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── README.md
├── vercel.json                    # SPA rewrites → index.html
├── vite.config.js                 # React plugin
├── public/
│   ├── favicon.svg                # Purple AI neural icon
│   └── icons.svg                  # Social SVG sprite
└── src/
    ├── main.jsx                   # Entry: ReactDOM.createRoot(App)
    ├── index.css                  # Root styles, CSS vars for light/dark
    ├── App.jsx                    # Single-file SPA (2114 lines)
    ├── App.css                    # All component styles (893 lines)
    └── assets/
        ├── hero.png               # Binary image
        ├── react.svg
        └── vite.svg
```

#### Frontend Component Breakdown (App.jsx)

| Component | Lines | Purpose |
|-----------|-------|---------|
| `NeuralIcon` | 33-56 | SVG AI brain icon |
| `SharedChatView` | 92-145 | Public read-only shared chat (route `/shared/:shareId`) |
| `KnowledgeUpload` | 147-262 | Admin document upload with title, category, text/file input |
| `AdminPanel` | 265-758 | Full admin dashboard: user list with search, detail panel, session viewer, ban/delete, KB management |
| `App` (default) | 760-2114 | Main app: auth, chat, sessions, voice, call agent, all state/refs |

#### Auth Flow
1. User submits email/password (or name+email+password for register)
2. `POST /api/auth/login` or `/api/auth/register`
3. Backend returns JWT token + user object (id, name, email, isAdmin)
4. Token stored in `localStorage("token")`, user in `localStorage("user")`
5. All subsequent requests include `Authorization: Bearer <token>`
6. Logout clears localStorage, resets all state

### 2.3 Backend Architecture

| Aspect | Technology |
|--------|-----------|
| **Runtime** | Node.js |
| **Framework** | Express 5.2.1 |
| **Database** | MongoDB (Mongoose 9.6.3) |
| **Auth** | JWT (jsonwebtoken 9.0.3) + bcryptjs |
| **AI Provider** | Groq API (LLaMA models) |
| **Embeddings** | HuggingFace Inference API |
| **File Upload** | Multer (memory storage) |
| **Deployment** | Render (auto-deploy from GitHub main) |

#### Backend Folder Structure
```
backend/
├── .env                           # All secrets (see §12)
├── package.json
├── package-lock.json
├── server.js                      # Express entry point (40 lines)
├── testModels.js                  # Gemini model listing (unused)
├── config/
│   └── db.js                      # Mongoose connection (15 lines)
├── controllers/
│   ├── authController.js          # register, login (98 lines)
│   ├── chatController.js          # handleChat (SSE), getHistory (107 lines)
│   ├── knowledgeController.js     # upload, list, delete, chunk search (133 lines)
│   └── memoryController.js        # extract, save, retrieve memories (168 lines)
├── middleware/
│   ├── authMiddleware.js          # JWT verification (28 lines)
│   └── adminMiddleware.js         # isAdmin check (12 lines)
├── models/
│   ├── User.js                    # name, email, password, isAdmin, isBanned (33 lines)
│   ├── ChatSession.js             # userId, title, messages[], shareId, isShared (21 lines)
│   ├── Conversation.js            # userId, userMessage, botReply, timestamps (26 lines)
│   ├── Memory.js                  # userId, memory, category, importance, embedding (37 lines)
│   └── KnowledgeBase.js           # title, category, originalText, chunks[], uploadedBy (34 lines)
├── routes/
│   ├── authRoutes.js              # POST /register, /login (10 lines)
│   ├── chatRoutes.js              # POST / (auth), GET /history (auth) (11 lines)
│   ├── sessionRoutes.js           # CRUD sessions + share toggle (161 lines)
│   ├── adminRoutes.js             # GET/PATCH/DELETE users (100 lines)
│   ├── callRoutes.js              # POST /transcribe (auth, multer) (92 lines)
│   ├── knowledgeRoutes.js         # POST /upload, GET /, DELETE /:docId (16 lines)
│   └── memoryRoutes.js            # GET /, DELETE /clear, DELETE /:memoryId (10 lines)
└── services/
    ├── geminiService.js           # Groq non-stream + streaming (69 lines)
    ├── embeddingService.js        # HuggingFace embeddings (21 lines)
    └── contextService.js          # Conversation window + summarisation (83 lines)
```

#### Request Lifecycle (Chat)
```
1. Frontend POST /api/chat { message } + Bearer token
2. authMiddleware: verify JWT → attach req.user
3. handleChat controller:
   a. Call getRelevantMemories(userId, message) → semantic search
   b. Call formatMemoriesForPrompt → memory context string
   c. Call getRelevantChunks(message) → knowledge base semantic search
   d. Call formatChunksForPrompt → knowledge context string
   e. Call getRecentConversations(userId) → last 10 conversations
   f. Call summariseOldConversations → Groq summary of older convos
   g. Call formatConversationContext → conversation context string
   h. Fire-and-forget: extractAndSaveMemory(userId, message)
   i. Call generateGroqStream(message, res, combinedContext) → SSE
   j. Stream tokens to frontend via SSE data: { token } events
   k. On stream end: save Conversation to MongoDB
   l. Send data: [DONE] to close stream
```

#### Authentication Lifecycle
```
1. POST /api/auth/register { name, email, password }
   → bcrypt.hash(password, 10) → User.create → generate JWT (7d expiry)
   → Return { token, user: { id, name, email, isAdmin } }

2. POST /api/auth/login { email, password }
   → User.findOne → bcrypt.compare → generate JWT
   → Return { token, user: { id, name, email, isAdmin } }

3. All protected routes:
   → Extract Bearer token from Authorization header
   → jwt.verify(token, JWT_SECRET) → User.findById(decoded.id).select("-password")
   → req.user = user → next()
```

#### AI Request Lifecycle
```
1. System prompt: "You are a helpful AI customer support agent..."
2. Append memory context (known user info)
3. Append knowledge context (relevant KB chunks with source attributions)
4. Append conversation context (recent messages + old summary)
5. Send to Groq: model=llama-3.3-70b-versatile, stream=true, max_tokens=500
6. Process SSE response: parse delta content, send to frontend token by token
7. Save full reply as Conversation document
```

---

## 3. COMPLETE FILE STRUCTURE

### Root Level

| File | Purpose |
|------|---------|
| `.gitignore` | Ignores node_modules, .env, dist, graphify-out, logs, IDE files |
| `LICENSE` | MIT License, copyright 2026 Pavithra1405 |
| `README.md` | Brief 1-line description |
| `package.json` | Root package (cors, dotenv, express, mongoose) — appears unused |
| `PROJECT_BIBLE.md` | This document |

### backend/server.js
- **Purpose:** Express entry point. Loads env, connects MongoDB, registers all route modules, starts server.
- **Dependencies:** express, cors, dotenv, all route modules, db config
- **Interactions:** All controllers via routes. CORS allows localhost:5173 and Vercel frontend.

### backend/config/db.js
- **Purpose:** Mongoose connection to MongoDB Atlas using MONGO_URI env var.
- **Dependencies:** mongoose
- **Edge Cases:** Exits process on connection failure.

### backend/controllers/authController.js
- **Purpose:** User registration and login with bcrypt hashing and JWT generation.
- **Functions:** `register()`, `login()`, `generateToken()`
- **Dependencies:** User model, bcryptjs, jsonwebtoken
- **Edge Cases:** Duplicate email returns 400, missing fields returns 400, invalid credentials returns 400.

### backend/controllers/chatController.js
- **Purpose:** Orchestrates the full chat pipeline — memory retrieval, knowledge retrieval, context building, SSE streaming, conversation saving.
- **Functions:** `handleChat()`, `getHistory()`
- **Dependencies:** geminiService, Conversation model, memoryController, knowledgeController, contextService
- **Edge Cases:** Empty message returns 400, stream errors send [DONE] and close, empty reply not saved.

### backend/controllers/memoryController.js
- **Purpose:** Pattern-based memory extraction, embedding storage, semantic retrieval, CRUD.
- **Functions:** `extractMemoriesFromMessage()`, `extractAndSaveMemory()`, `getMemoriesForUser()`, `getRelevantMemories()`, `formatMemoriesForPrompt()`, `getUserMemories()`, `deleteMemory()`, `clearAllMemories()`
- **Dependencies:** Memory model, embeddingService
- **Patterns (6):** identity (name, called), profession (developer/designer/etc), project, building/working on, location
- **Edge Cases:** No patterns matched → silent skip, embedding fails → empty array, no memories → empty context.

### backend/controllers/knowledgeController.js
- **Purpose:** Document upload with chunking and embedding, semantic search, CRUD.
- **Functions:** `chunkText()`, `uploadDocument()`, `getAllDocuments()`, `deleteDocument()`, `getRelevantChunks()`, `formatChunksForPrompt()`
- **Dependencies:** KnowledgeBase model, embeddingService
- **Chunking:** 500 chars per chunk, 50 char overlap, min 20 chars
- **Edge Cases:** Title or text missing → 400, no chunks after filtering → saved but empty, embedding fails per chunk → still stored.

### backend/services/geminiService.js
- **Purpose:** Groq API interaction for both non-streaming and streaming completions.
- **Functions:** `generateGeminiResponse()`, `generateGroqStream()`
- **Model:** `llama-3.3-70b-versatile`
- **Dependencies:** axios
- **Edge Cases:** API error returns fallback message, stream response returned directly as raw stream.

### backend/services/embeddingService.js
- **Purpose:** Generate embeddings via HuggingFace Inference API.
- **Functions:** `generateEmbedding()`
- **Model:** `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions)
- **Dependencies:** @huggingface/inference
- **Edge Cases:** API error returns empty array, non-array result flattened.

### backend/services/contextService.js
- **Purpose:** Conversation context management — rolling window and summarisation.
- **Functions:** `getRecentConversations()`, `summariseOldConversations()`, `formatConversationContext()`
- **Window:** 10 recent conversations
- **Summarisation Model:** `llama-3.1-8b-instant` (Groq)
- **Dependencies:** Conversation model, groq-sdk
- **Edge Cases:** Fewer than 10 conversations → no summary, summary API failure → empty string.

### backend/models/User.js
- **Schema:** name (String, required), email (String, required, unique), password (String, required), isAdmin (Boolean, default false), isBanned (Boolean, default false)
- **Indexes:** email (unique)
- **Hooks:** timestamps: true

### backend/models/ChatSession.js
- **Schema:** userId (ObjectId, ref User, required), title (String, default "New Chat"), messages (array of {role: "user"|"bot", text, time}), shareId (String, nanoid(10) default), isShared (Boolean, default false)
- **Indexes:** userId, shareId
- **Hooks:** timestamps: true

### backend/models/Conversation.js
- **Schema:** userId (ObjectId, ref User, required), userMessage (String, required), botReply (String, required)
- **Indexes:** userId + createdAt (used for sorting)
- **Hooks:** timestamps: true

### backend/models/Memory.js
- **Schema:** userId (ObjectId, ref User, required, indexed), memory (String, required), category (enum: identity/profession/project/preference/location/other), importance (Number, 1-5), embedding ([Number])
- **Indexes:** { userId: 1, memory: 1 } unique compound index
- **Hooks:** timestamps: true

### backend/models/KnowledgeBase.js
- **Schema:** title (String, required), category (enum: faq/manual/pricing/custom), originalText (String, required), chunks (array of {text, embedding, chunkIndex}), uploadedBy (ObjectId, ref User)
- **Hooks:** timestamps: true

### frontend/src/App.jsx (2114 lines)
- **Purpose:** Single-file React SPA containing ALL frontend logic.
- **Components (internal):** NeuralIcon, SharedChatView, KnowledgeUpload, AdminPanel, App
- **State (useState):** theme, token, user, authMode, authForm, authError, authLoading, messages, currentSessionId, sessions, input, loading, thinkingStage, listening, language, langOpen, copiedId, playingId, menuOpen, drawerOpen, editingId, editText, deleteConfirmId, toast, showAdmin, callMode, callStatus
- **Refs (useRef):** chatEndRef, fullReplyRef, langRef, menuRef, thinkingTimerRef, recognitionRef, silenceTimerRef, editInputRef, chatScrollRef, tokenRef, currentSessionIdRef, callModeRef, callRecognitionRef
- **Key Functions:** sendMessage, speak, copyMessage, playMessage, startListening, stopListening, startCall, endCall, startCallListening, sendCallMessage, speakCallReply, loadSessions, saveCurrentSession, startNewSession, loadSession, deleteSession, toggleShare, handleAuthSubmit, handleLogout, startEdit, submitEdit
- **Call Agent:** VAD with adaptive threshold, MediaRecorder → Groq Whisper → LLM → TTS loop

### frontend/src/App.css (893 lines)
- **Purpose:** All component styling. Dark/light theme via `[data-theme="dark"]` and `[data-theme="light"]`. Animations for thinking, voice, call agent, skeletons, modals.
- **Sections:** Reset, Theme vars, Chat app layout, Drawer, Topbar, Theme toggle, Icon buttons, Language dropdown, User chip, Hamburger menu, Mobile menu, Auth page, Chat main, Empty state, Messages, Message meta, Edit, Thinking animation, Input dock, Voice overlay, Responsive breakpoints, Call agent animations

### frontend/src/index.css (111 lines)
- **Purpose:** Baseline styles for light/dark mode, typography, root layout.

### frontend/vite.config.js
- **Purpose:** Vite config with React plugin.

### frontend/vercel.json
- **Purpose:** SPA rewrites — all routes serve index.html.

### frontend/index.html
- **Purpose:** Vite entry HTML with `<div id="root">`.

---

## 4. AI AGENT WORKFLOW

### Complete Flow: User Message → Response

```
User types message in chat UI
        │
        ▼
sendMessage(text) in App.jsx
  │
  ├── Add "user" message to messages[] state
  ├── Set loading=true, start thinking animation
  ├── Add placeholder "bot" message with thinking=true
  │
  ▼
POST /api/chat { message } + Authorization: Bearer <token>
  │
  ▼
authMiddleware: verify JWT → req.user
  │
  ▼
handleChat controller:
  │
  ├── [1] MEMORY RETRIEVAL
  │   └── getRelevantMemories(userId, message)
  │       ├── Generate embedding of query via HuggingFace
  │       ├── Fetch all user memories with embeddings
  │       ├── Cosine similarity scoring
  │       └── Return top 3 most relevant memories
  │
  ├── [2] KNOWLEDGE RETRIEVAL
  │   └── getRelevantChunks(message)
  │       ├── Generate embedding of query via HuggingFace
  │       ├── Fetch ALL document chunks across docs
  │       ├── Cosine similarity scoring
  │       └── Return top 3 most relevant chunks
  │
  ├── [3] CONTEXT RETRIEVAL
  │   └── getRecentConversations(userId)
  │       ├── Get last 10 conversations (sorted by createdAt desc)
  │       └── Reverse to chronological order
  │
  ├── [4] MEMORY EXTRACTION (fire-and-forget)
  │   └── extractAndSaveMemory(userId, message)
  │       ├── Test against 6 regex patterns
  │       ├── For each match: generate embedding, upsert to Memory collection
  │       └── Errors are caught silently
  │
  ├── [5] SUMMARISATION (if >10 conversations)
  │   └── summariseOldConversations(userId)
  │       ├── Count total conversations
  │       ├── If > 10: fetch conversations beyond window (skip 10, limit 20)
  │       └── Groq call: llama-3.1-8b-instant to summarise
  │
  ├── [6] PROMPT BUILDING
  │   ├── memoryContext = formatMemoriesForPrompt(memories)
  │   │   → "\n\nWhat you know about this user...\n- {memory}\n..."
  │   ├── knowledgeContext = formatChunksForPrompt(chunks)
  │   │   → "\n\nRelevant knowledge base information:\n[{source}]: {text}\n..."
  │   └── conversationContext = formatConversationContext(conversations, summary)
  │       → "\n\nSummary of earlier conversation:\n{summary}\n\nRecent conversation:\nUser: ...\nAssistant: ..."
  │
  ├── [7] LLM CALL
  │   └── generateGroqStream(message, res, memoryContext + knowledgeContext + conversationContext)
  │       ├── System: "You are a helpful AI customer support agent. Be friendly, clear and concise." + contexts
  │       ├── User: message
  │       ├── Model: llama-3.3-70b-versatile
  │       ├── stream: true
  │       └── max_tokens: 500
  │
  ├── [8] RESPONSE (SSE)
  │   ├── For each delta: res.write(`data: ${JSON.stringify({ token })}\n\n`)
  │   ├── Frontend reads stream, accumulates tokens, updates bot message
  │   └── On [DONE]: stop loading, save session, speak (TTS)
  │
  └── [9] MEMORY SAVE
      └── On stream end: Conversation.create({ userId, userMessage, botReply })
```

---

## 5. MEMORY SYSTEM (4 Phases)

### Phase 1: Pattern-Based Extraction
**File:** `backend/controllers/memoryController.js:4-56`

- 6 regex patterns extract structured info from user messages:
  1. **Identity (name):** `/my name is ([A-Za-z\s]+)/i` — importance 5
  2. **Identity (called):** `/(?:i am|i'm) called ([A-Za-z\s]+)/i` — importance 5
  3. **Profession:** `/i (?:am|'m) a ([a-z\s]+(?:developer|designer|engineer|...)[a-z\s]*)/i` — importance 4
     - Keywords: developer, designer, engineer, manager, student, teacher, analyst, architect, consultant, freelancer, founder
  4. **Project (explicit):** `/my project is ([^\.\!\?]+)/i` — importance 4
  5. **Project (implicit):** `/i(?:'m| am) (?:building|working on|developing|creating) ([^\.\!\?]+)/i` — importance 4
  6. **Location:** `/i(?:'m| am) (?:from|based in|living in) ([A-Za-z\s,]+)/i` — importance 3

Each pattern has a `formatter` function that produces the stored memory string (e.g., "User's name is John").

### Phase 2: HuggingFace Embeddings + Cosine Similarity
**File:** `backend/controllers/memoryController.js:131-158`, `backend/services/embeddingService.js`

- On save: extracted memory text is embedded via HuggingFace (`all-MiniLM-L6-v2`, 384 dims)
- On retrieval: query text is embedded, then compared against all user memories via cosine similarity:
  ```
  score = dotProduct(embeddingA, embeddingB) / (magnitude(A) * magnitude(B))
  ```
- Top 3 most similar memories returned (fallback: `getMemoriesForUser` sorted by importance if embedding fails)

### Phase 3: Document Knowledge Base
**File:** `backend/controllers/knowledgeController.js`

- Documents uploaded via admin panel are chunked (500 chars, 50 overlap) and each chunk is embedded
- On query: same cosine similarity search across ALL document chunks from all documents
- Top 3 most relevant chunks returned with source attribution (`[DocumentTitle]: chunk text`)
- No user-scoping (knowledge base is global)

### Phase 4: Rolling Context Window + Groq Summarisation
**File:** `backend/services/contextService.js`

- **Window size:** 10 most recent conversations
- If user has more than 10 conversations, older ones are fetched (skip 10, limit 20)
- Older conversations are concatenated and sent to Groq (`llama-3.1-8b-instant`, 150 tokens, temperature 0.3) for summarisation
- Summary is prepended to the conversation context
- Recent conversations (last 10, oldest first) are formatted as:
  ```
  User: message
  Assistant: reply
  ```

---

## 6. DATABASE DESIGN

### MongoDB Atlas
- **Cluster:** cluster0.d2dnrng.mongodb.net
- **Database:** voiceagent

### Collection: `users`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | auto | | |
| `name` | String | ✓ | | |
| `email` | String | ✓ | | `unique: true` |
| `password` | String | ✓ | | bcrypt hashed |
| `isAdmin` | Boolean | | `false` | |
| `isBanned` | Boolean | | `false` | |
| `createdAt` | Date | auto | | timestamps |
| `updatedAt` | Date | auto | | timestamps |

**Indexes:** `email` (unique)

**Query Patterns:**
- `User.findOne({ email })` — login/register
- `User.findById(id).select("-password")` — auth middleware
- `User.find({}).select("-password").sort({ createdAt: -1 })` — admin user list
- `User.findByIdAndDelete(id)` — admin delete user

### Collection: `chatsessions`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | auto | | |
| `userId` | ObjectId | ✓ | | ref: User |
| `title` | String | | "New Chat" | |
| `messages` | Array | | `[]` | `[{role, text, time}]` |
| `shareId` | String | | `nanoid(10)` | |
| `isShared` | Boolean | | `false` | |
| `createdAt` | Date | auto | | |
| `updatedAt` | Date | auto | | |

**Query Patterns:**
- `ChatSession.find({ userId }).sort({ updatedAt: -1 }).limit(50)` — list user sessions
- `ChatSession.findOne({ _id, userId })` — get/update/delete session
- `ChatSession.findOne({ shareId, isShared: true })` — public shared view
- `ChatSession.countDocuments({ userId })` — admin user stats
- `ChatSession.deleteMany({ userId })` — admin delete user

### Collection: `conversations`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | auto | | |
| `userId` | ObjectId | ✓ | | ref: User |
| `userMessage` | String | ✓ | | |
| `botReply` | String | ✓ | | |
| `createdAt` | Date | auto | | |
| `updatedAt` | Date | auto | | |

**Query Patterns:**
- `Conversation.find({ userId }).sort({ createdAt: -1 }).limit(10)` — recent conversations
- `Conversation.find({ userId }).sort({ createdAt: -1 }).skip(10).limit(20)` — old conversations for summary
- `Conversation.countDocuments({ userId })` — total count for summary trigger
- `Conversation.create({ userId, userMessage, botReply })` — save after stream

### Collection: `memories`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | auto | | |
| `userId` | ObjectId | ✓ | | ref: User, `index: true` |
| `memory` | String | ✓ | | trimmed |
| `category` | String | | "other" | enum: identity, profession, project, preference, location, other |
| `importance` | Number | | 3 | min: 1, max: 5 |
| `embedding` | [Number] | | `[]` | 384-dim vector |
| `createdAt` | Date | auto | | |
| `updatedAt` | Date | auto | | |

**Indexes:**
- `{ userId: 1, memory: 1 }` unique (prevents duplicate memories per user)
- `userId` (explicit index)

**Vector Search Index (Atlas):**
- Name: `memory_vector_index`
- Dimensions: 384
- Metric: cosine
- Path: `embedding`

**Query Patterns:**
- `Memory.find({ userId, embedding: { $exists: true, $not: { $size: 0 } } })` — semantic search
- `Memory.find({ userId }).sort({ importance: -1, updatedAt: -1 }).limit(20)` — top memories
- `Memory.bulkWrite([{ updateOne: { filter: { userId, memory }, update: {$set: {...}}, upsert: true } }])` — save extracted memory
- `Memory.deleteMany({ userId })` — clear all
- `Memory.findOneAndDelete({ _id, userId })` — delete specific

### Collection: `knowledgebases`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | auto | | |
| `title` | String | ✓ | | trimmed |
| `category` | String | | "custom" | enum: faq, manual, pricing, custom |
| `originalText` | String | ✓ | | |
| `chunks` | Array | | `[]` | `[{text, embedding, chunkIndex}]` |
| `uploadedBy` | ObjectId | | | ref: User |
| `createdAt` | Date | auto | | |
| `updatedAt` | Date | auto | | |

**Query Patterns:**
- `KnowledgeBase.find().lean()` — get all docs + chunks for semantic search
- `KnowledgeBase.create({ title, category, originalText, chunks, uploadedBy })` — upload
- `KnowledgeBase.findByIdAndDelete(id)` — delete

---

## 7. API DOCUMENTATION

### Authentication Routes (`/api/auth`)

#### POST `/api/auth/register`
- **Auth:** None
- **Body:** `{ name: String, email: String, password: String }`
- **Response 201:** `{ token: String, user: { id, name, email, isAdmin } }`
- **Errors:** 400 (missing fields, duplicate email), 500 (server error)

#### POST `/api/auth/login`
- **Auth:** None
- **Body:** `{ email: String, password: String }`
- **Response 200:** `{ token: String, user: { id, name, email, isAdmin } }`
- **Errors:** 400 (missing fields, invalid credentials), 500 (server error)

### Chat Routes (`/api/chat`)

#### POST `/api/chat`
- **Auth:** Required (JWT)
- **Body:** `{ message: String }`
- **Response:** SSE stream of `data: { "token": "..." }` events, terminated by `data: [DONE]`
- **Errors:** 400 (no message), 401 (invalid token), 500 (server error)
- **Side Effects:** Extracts memories, retrieves knowledge, saves conversation

#### GET `/api/chat/history`
- **Auth:** Required (JWT)
- **Response 200:** `{ history: [{ userId, userMessage, botReply, createdAt }] }` (last 20)
- **Errors:** 401, 500

### Session Routes (`/api/sessions`)

#### GET `/api/sessions`
- **Auth:** Required (JWT)
- **Response 200:** `{ sessions: [{ _id, title, updatedAt, ... }] }` (last 50, sorted by updatedAt desc)

#### GET `/api/sessions/:id`
- **Auth:** Required (JWT)
- **Response 200:** `{ session: { _id, title, messages, shareId, isShared, timestamps } }`
- **Errors:** 404 (not found or not owner)

#### POST `/api/sessions`
- **Auth:** Required (JWT)
- **Body:** `{ title: String (optional), messages: Array (optional) }`
- **Response 200:** `{ session: { _id, title, messages, ... } }`

#### PATCH `/api/sessions/:id`
- **Auth:** Required (JWT)
- **Body:** `{ title: String (optional), messages: Array (optional) }`
- **Response 200:** `{ session: { updated session } }`
- **Errors:** 404 (not found or not owner)

#### DELETE `/api/sessions/:id`
- **Auth:** Required (JWT)
- **Response 200:** `{ success: true }`

#### PATCH `/api/sessions/:id/share`
- **Auth:** Required (JWT)
- **Response 200:** `{ isShared: Boolean, shareId: String }`
- **Side Effects:** Toggles isShared, copies share link to clipboard (frontend)

#### GET `/api/sessions/shared/:shareId`
- **Auth:** None (public)
- **Response 200:** Session object with messages
- **Errors:** 404 (invalid link or sharing disabled)

### Admin Routes (`/api/admin`)
- **All routes:** Auth (JWT) + Admin middleware required

#### GET `/api/admin/users`
- **Response 200:** `{ users: [{ _id, name, email, isAdmin, isBanned, sessionCount, createdAt }] }`

#### GET `/api/admin/users/:id/sessions`
- **Response 200:** `{ sessions: [{ _id, title, messages, updatedAt, createdAt }] }`

#### PATCH `/api/admin/users/:id/ban`
- **Response 200:** `{ isBanned: Boolean, userId: String }`
- **Errors:** 400 (self-ban, admin cannot ban admin)

#### DELETE `/api/admin/users/:id`
- **Response 200:** `{ success: true }`
- **Side Effects:** Deletes user + all their sessions
- **Errors:** 400 (self-delete, admin cannot delete admin)

### Call Routes (`/api/call`)

#### POST `/api/call/transcribe`
- **Auth:** Required (JWT)
- **Middleware:** Multer (memory storage, single file "audio")
- **Body:** multipart/form-data with `audio` file + `language` field
- **Backend validation:** file.size > 3000 bytes, transcript not empty/punctuation/garbage
- **Response 200:** `{ transcript: String, valid: Boolean }` or `{ transcript: "", valid: false, reason: "garbage"|"too_small" }`
- **Errors:** 400 (no file), 401, 500 (transcription failed)
- **Service:** Groq Whisper large-v3

### Memory Routes (`/api/memory`)
- **Auth:** Required (JWT)

#### GET `/api/memory`
- **Response 200:** `{ memories: [{ userId, memory, category, importance, timestamps }] }`

#### DELETE `/api/memory/clear`
- **Response 200:** `{ message: "Cleared N memories" }`

#### DELETE `/api/memory/:memoryId`
- **Response 200:** `{ message: "Memory deleted" }`
- **Errors:** 404 (not found or not owner)

### Knowledge Routes (`/api/knowledge`)
- **Auth:** Required (JWT) + Admin middleware

#### POST `/api/knowledge/upload`
- **Body:** `{ title: String, category: String (faq|manual|pricing|custom), text: String }`
- **Response 201:** `{ message, documentId, title, chunkCount }`
- **Errors:** 400 (no title or text), 500

#### GET `/api/knowledge`
- **Response 200:** `{ documents: [{ _id, title, category, chunkCount, uploadedBy }] }`

#### DELETE `/api/knowledge/:docId`
- **Response 200:** `{ message: "Document deleted" }`
- **Errors:** 404

### Health Check

#### GET `/api/health`
- **Auth:** None
- **Response 200:** `{ status: "ok" }`

---

## 8. THIRD PARTY SERVICES

### 8.1 Groq API
- **Provider:** Groq
- **Endpoints Used:**
  - `POST https://api.groq.com/openai/v1/chat/completions` — Chat completions (streaming + non-streaming)
  - `POST https://api.groq.com/openai/v1/audio/transcriptions` — Whisper STT
- **Models:**
  - `llama-3.3-70b-versatile` — Chat responses (max_tokens: 500)
  - `llama-3.1-8b-instant` — Conversational summary (max_tokens: 150, temperature: 0.3)
  - `whisper-large-v3` — Audio transcription (call agent)
- **Auth:** Bearer token via `GROQ_API_KEY` env var
- **Package:** `groq-sdk` (used in contextService), `axios` (used in geminiService)

### 8.2 HuggingFace Inference
- **Provider:** HuggingFace
- **Model:** `sentence-transformers/all-MiniLM-L6-v2`
- **Use:** Generate 384-dimensional embeddings for memories and knowledge chunks
- **Package:** `@huggingface/inference` (v4.13.19)
- **Auth:** Bearer token via `HF_API_KEY` env var
- **Edge Cases:** Returns empty array on failure; non-array result flattened

### 8.3 MongoDB Atlas
- **Provider:** MongoDB Atlas
- **Cluster:** `cluster0.d2dnrng.mongodb.net`
- **Database:** `voiceagent`
- **Connection:** Mongoose 9.6.3 via `MONGO_URI` env var
- **Collections:** users, chatsessions, conversations, memories, knowledgebases
- **Vector Search Index:**
  - Name: `memory_vector_index`
  - Path: `embedding`
  - Dimensions: 384
  - Metric: cosine
- **Note:** Vector search index exists but currently unused (cosine similarity is computed in-app)

### 8.4 Render (Backend Hosting)
- **Service:** Web Service
- **Region:** Likely US (default)
- **Build Command:** `npm install` (in backend directory)
- **Start Command:** `node server.js`
- **Auto-deploy:** From GitHub main branch
- **Environment Variables:** GROQ_API_KEY, HF_API_KEY, MONGO_URI, JWT_SECRET, PORT

### 8.5 Vercel (Frontend Hosting)
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **SPA Rewrites:** All routes → `/index.html` (handles client-side `/shared/:shareId` routing)
- **Environment Variables:** `VITE_API_URL` set to Render backend URL

### 8.6 Uptime Robot
- **Provider:** Uptime Robot
- **Purpose:** Monitor backend availability, prevent Render free-tier cold starts, send periodic requests to `/api/health` endpoint
- **Implementation:** Configured to ping `GET /api/health` every few minutes. Acts as an uptime monitor. Sends alerts if backend becomes unavailable.
- **Business Value:** Reduces first-request latency by keeping the backend warm. Improves overall reliability. Keeps customer experience smooth by preventing timeouts.
- **Integration:** Points to `https://<render-backend-url>/api/health`

### 8.7 Cron-job.org
- **Provider:** Cron-job.org
- **Purpose:** Scheduled backend keep-alive requests to prevent the Render backend from sleeping during idle periods
- **Implementation:** Configured recurring HTTP requests that call the backend endpoint periodically. Functions as a heartbeat service.
- **Business Value:** Keeps the backend active and responsive. Reduces cold-start delays. Improves production availability for end users.

---

## 9. VOICE CALL AGENT

### 9.1 Complete Audio Flow

```
User clicks "Start Voice Call"
        │
        ▼
Mic capture: navigator.mediaDevices.getUserMedia({ audio: { echoCancellation, noiseSuppression, autoGainControl } })
        │
        ▼
AudioContext created (fresh per call)
        │
        ▼
AnalyserNode (fftSize: 2048) for VAD
        │
        ▼
MediaRecorder (audio/webm) started
        │
        ▼
VAD Loop (every 100ms):
  ├── Get RMS from getFloatTimeDomainData
  ├── Maintain RMS history (20 samples)
  ├── Adaptive threshold calibration:
  │   ├── First 8 frames of silence → sort RMS history
  │   ├── noiseFloor = 40th percentile
  │   └── adaptiveThreshold = max(0.010, noiseFloor * 2.5)
  ├── If RMS > threshold → speechDetected = true, reset silence timer
  └── If speechDetected & RMS < threshold for 1800ms → STOP
        │
        ▼
Max duration: 10000ms (safety timeout)
        │
        ▼
On recorder stop:
  ├── Release mic (stop tracks + close AudioContext)
  ├── Check peak RMS > 0.010 AND speechDetected flag
  │   └── If not → restart listening after 400ms
  ├── Create Blob from chunks
  ├── POST /api/call/transcribe (multipart: audio + language)
  │   └── Backend: Groq Whisper large-v3 → validate transcript
  ├── Debounce: ignore duplicate short phrases (≤3 words, same as last)
  ├── sendCallMessage(transcript)
  │   └── POST /api/chat → SSE stream → accumulate reply
  │       └── On [DONE]: speakCallReply(fullReply)
  │           └── SpeechSynthesisUtterance → onend → startCallListening()
  └── Loop continues until user taps "End Call"
```

### 9.2 Key Parameters
| Parameter | Value | Purpose |
|-----------|-------|---------|
| `fftSize` | 2048 | Frequency resolution for VAD |
| `RMS history size` | 20 | Rolling window for noise floor calibration |
| `Noise floor percentile` | 40th | Conservative noise floor estimate |
| `Threshold multiplier` | 2.5 | Signal must be 2.5x noise floor to count as speech |
| `Min adaptive threshold` | 0.010 | Absolute floor to prevent false triggers |
| `Silence duration` | 1800ms | How long silence must persist before stopping |
| `Max duration` | 10000ms | Absolute max recording length |
| `Min file size (backend)` | 3000 bytes | Reject silent audio at transport level |
| `Min file size (frontend)` | 4000 bytes | (implied by backend safety net) |
| `Post-speech restart delay` | 500ms | Gap between TTS end and next listen cycle |
| `Duplicate phrase debounce` | ≤3 words, exact match | Prevents noise loop artifacts |

### 9.3 Call Agent UI States
| Status | Color | Visual | Description |
|--------|-------|--------|-------------|
| `idle` | gray | — | Not in call |
| `listening` | green | Ring animation + wave bars | Mic active, VAD running |
| `thinking` | yellow | Static ring | Waiting for LLM response |
| `speaking` | blue | Wave bars | TTS playing reply |

### 9.4 Critical Design Decisions
- **Fresh AudioContext + stream per call** — avoids stale state bugs
- **Mic release immediately on stop** — prevents resource leaks
- **Peak RMS + speechDetected flag** — more reliable than last-sample check
- **Adaptive threshold** — adjusts to ambient noise dynamically
- **Debounce duplicate short phrases** — prevents echo/feedback loops

---

## 10. AUTHENTICATION SYSTEM

### 10.1 JWT Lifecycle
```
Registration
  ├── { name, email, password } → POST /api/auth/register
  ├── bcrypt.hash(password, 10)
  ├── User.create({ name, email, password: hashed })
  ├── jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" })
  └── Return { token, user: { id, name, email, isAdmin } }

Login
  ├── { email, password } → POST /api/auth/login
  ├── User.findOne({ email })
  ├── bcrypt.compare(password, user.password)
  ├── jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" })
  └── Return { token, user: { id, name, email, isAdmin } }
```

### 10.2 Auth Middleware
```javascript
// backend/middleware/authMiddleware.js
- Extract Bearer token from Authorization header
- jwt.verify(token, JWT_SECRET)
- User.findById(decoded.id).select("-password")
- Attach user to req.user
- On failure: 401 "Not authorized"
```

### 10.3 Admin Middleware
```javascript
// backend/middleware/adminMiddleware.js
- Check req.user exists (401)
- Check req.user.isAdmin === true (403)
- Pass to next()
```

### 10.4 Admin Controls
| Action | Endpoint | Protection |
|--------|----------|------------|
| List users | GET /api/admin/users | Auth + Admin |
| View user sessions | GET /api/admin/users/:id/sessions | Auth + Admin |
| Ban/unban user | PATCH /api/admin/users/:id/ban | Auth + Admin (cannot ban self/admin) |
| Delete user | DELETE /api/admin/users/:id | Auth + Admin (cannot delete self/admin) |

### 10.5 Token Storage (Frontend)
- `localStorage.setItem("token", token)` on auth success
- `localStorage.setItem("user", JSON.stringify(user))` on auth success
- All API calls: `Authorization: \`Bearer ${localStorage.getItem("token")}\``
- Logout: `localStorage.removeItem("token")` + `localStorage.removeItem("user")`

---

## 11. BUGS AND FIXES LOG

### Bug 1: VAD False Positives → Adaptive Thresholding
- **Problem:** VAD was using a fixed threshold, causing microphone noise to trigger speech detection. False positives led to empty/silent audio being sent to Whisper.
- **Fix:** Implemented adaptive thresholding — noise floor is calibrated from the 40th percentile of RMS history during the first ~2 seconds, then threshold = max(0.010, noiseFloor * 2.5). Added `speechDetected` flag and peak RMS check on stop.
- **Files affected:** `frontend/src/App.jsx` — `startCallListening()` function

### Bug 2: groq-sdk Missing on Render
- **Problem:** After deployment, `contextService.js` failed because `groq-sdk` was not in `package.json`.
- **Fix:** Added `"groq-sdk": "^1.2.1"` to `backend/package.json` dependencies and ran `npm install`.
- **Files affected:** `backend/package.json`

### Bug 3: llama3-8b-8192 Decommissioned
- **Problem:** Groq decommissioned the `llama3-8b-8192` model. Calls failed with model-not-found.
- **Fix:** Switched summarisation model from `llama3-8b-8192` to `llama-3.1-8b-instant`.
- **Files affected:** `backend/services/contextService.js`

### Bug 4: Git Changes Not Pushed
- **Problem:** Multiple bug fixes and features were committed locally but never pushed to GitHub. Render (which auto-deploys from `main`) was running old code.
- **Fix:** `git push origin main` to deploy all pending changes.
- **Files affected:** N/A (git workflow)

### Bug 5: HF_API_KEY Not on Render
- **Problem:** HuggingFace embedding calls were failing in production because `HF_API_KEY` was not set in Render environment variables.
- **Fix:** Added `HF_API_KEY` to Render dashboard environment variables.
- **Files affected:** Render configuration

### Bug 6: Memories Collection Empty on Atlas
- **Problem:** Knowledge base documents uploaded via localhost didn't persist to Atlas because the local backend was pointing to a different database. The `memories` collection was empty in production.
- **Fix:** Uploaded documents via the live site (Vercel frontend → Render backend) to ensure they went to the correct Atlas database.
- **Files affected:** N/A (operational/deployment issue)

---

## 12. ENVIRONMENT VARIABLES

| Variable | Value (example) | Used In | Purpose |
|----------|----------------|---------|---------|
| `PORT` | `5000` | `server.js` | Express server port |
| `MONGO_URI` | `mongodb+srv://admin:...@cluster0.../voiceagent` | `config/db.js` | MongoDB Atlas connection string |
| `GROQ_API_KEY` | `gsk_...` | `geminiService.js`, `contextService.js`, `callRoutes.js` | Groq API authentication |
| `JWT_SECRET` | `ai-chat-bot-1405@pavi` | `authMiddleware.js`, `authController.js` | JWT signing/verification secret |
| `HF_API_KEY` | `hf_...` | `embeddingService.js` | HuggingFace Inference API key |
| `VITE_API_URL` | `https://backend.onrender.com/api` | `frontend/src/App.jsx` | Backend API base URL (Vite env) |

### .env file location
```
backend/.env
```

### Frontend env
```javascript
// App.jsx line 4
const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
```

---

## 13. DEPLOYMENT

### 13.1 Backend: Render
- **Service Type:** Web Service
- **Build Command:** `npm install`
- **Start Command:** `node server.js`
- **Root Directory:** `backend/`
- **Auto-deploy:** Yes (from GitHub main branch)
- **Region:** US
- **Environment Variables:** PORT, MONGO_URI, GROQ_API_KEY, JWT_SECRET, HF_API_KEY

### 13.2 Frontend: Vercel
- **Framework:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Root Directory:** `frontend/`
- **SPA Rewrites:** `vercel.json` routes all paths to `/index.html`
- **Environment Variable:** `VITE_API_URL` = Render backend URL

### 13.3 CI/CD Pipeline
```
Developer pushes to GitHub main
        │
        ▼
Render detects push → npm install → node server.js → Backend live
        │
        ▼
Vercel detects push (if connected to same repo) → npm run build → deploy
```

### 13.4 Production Availability Strategy

#### Architecture
```
User
  │
  ▼
Frontend (Vercel)
  │
  ▼
Backend (Render)
  │
  ├── MongoDB Atlas
  ├── Groq API
  ├── HuggingFace Inference
  └── Graphify Analytics
```

#### Supporting Services
| Service | Role | Mechanism |
|---------|------|-----------|
| **Uptime Robot** | Availability monitoring | Periodically pings `GET /api/health` |
| **Cron-job.org** | Keep-alive automation | Scheduled recurring HTTP requests |

#### Workflow
1. Uptime Robot periodically pings the backend health endpoint (`/api/health`)
2. Cron-job.org periodically triggers backend HTTP requests
3. Render detects the activity and keeps the service awake
4. Backend remains active and responsive
5. Users experience lower first-response latency

#### Benefits
- Reduced cold-start delays (Render free tier spins down after inactivity)
- Better uptime and reliability
- Faster first API response for end users
- Proactive alerting if the backend goes down

---

## 14. ANALYTICS AND REPORTING SYSTEM

### 14.1 Graphify Integration
- **Purpose:** Transform raw chatbot data into visual insights and business intelligence analytics.
- **Tool:** Graphify (graph analysis engine) — output stored in `graphify-out/` directory

### 14.2 Data Sources
| Source | Data Collected |
|--------|---------------|
| **Users** | Registration count, active vs banned, admin accounts |
| **Sessions** | Total sessions, sessions per user, session growth over time |
| **Conversations** | Messages per session, conversation frequency, daily/weekly trends |
| **Memories** | Memory categories (identity, profession, project, location), memory growth |
| **Knowledge Base** | Document uploads, chunk counts, category distribution |

### 14.3 Analytics Generated
- Active users over time
- Daily conversation volume
- Session growth trends
- User engagement metrics
- Memory accumulation patterns
- Knowledge base utilisation stats

### 14.4 Benefits
- **Business intelligence:** Understand how customers use the platform
- **Customer support insights:** Identify common issues and peak usage times
- **Usage monitoring:** Track feature adoption (text chat vs voice call)
- **Performance tracking:** Measure system growth and data accumulation

### 14.5 Architecture

```
MongoDB Atlas
  │
  ├── users
  ├── chatsessions
  ├── conversations
  ├── memories
  └── knowledgebases
        │
        ▼
  Graphify Processing Engine
  (graphify-out/)
        │
        ▼
  Outputs:
  ├── GRAPH_REPORT.md     — Text analysis report
  ├── graph.html           — Interactive visualisation
  ├── graph.json           — Raw graph data (200+ nodes, 205 edges)
  └── cache/               — AST + semantic analysis caches
```

### 14.6 Possible Metrics Dashboard
| Metric | Source | Business Value |
|--------|--------|---------------|
| Total users | `users` collection | Track platform growth |
| Total sessions | `chatsessions` collection | Measure engagement |
| Conversations per day | `conversations` collection | Monitor activity trends |
| Most active users | Session counts per user | Identify power users |
| Average session length | Messages per session | Gauge conversation depth |
| Knowledge document usage | KB chunk retrieval frequency | Measure RAG effectiveness |
| Memory category distribution | `memories` category field | Understand user profiling |
| Language distribution | Frontend language selection | Multilingual adoption |

---

## 15. CURRENT PROJECT STATE

### Completed (All Phases 1-5 in production)

**Core Features:**
- [x] User authentication (JWT register/login)
- [x] Text chat with Groq LLM (streaming SSE)
- [x] Session management (create, load, delete, share)
- [x] Admin panel (users, sessions, ban, delete)

**Phase 1:** Pattern-based memory extraction (6 patterns)
**Phase 2:** HuggingFace embeddings + cosine similarity memory search
**Phase 3:** Document knowledge base with chunking and vector retrieval
**Phase 4:** Rolling 10-message context window + Groq summarisation

**Voice & Multilingual:**
- [x] Call Agent mode (VAD → Whisper → LLM → TTS loop)
- [x] Voice input via SpeechRecognition API
- [x] Text-to-speech for bot responses
- [x] Multilingual support (8 languages)
- [x] Dark/light theme toggle
- [x] Message edit, copy, play actions

**Production Hardening (Phase 5):**
- [x] Deployed: Frontend (Vercel) + Backend (Render) + DB (Atlas)
- [x] Uptime Robot integration for availability monitoring
- [x] Cron-job.org keep-alive automation
- [x] Production monitoring and alerting
- [x] Graphify analytics integration

### Pending (Phase 6)
- [ ] Reranking of retrieved chunks
- [ ] BM25 hybrid search (combine keyword + vector)
- [ ] Source citations in AI replies (inline references)
- [ ] Real IT support documents upload (not placeholder docs)

### Development History

#### Phase 1-4: Core AI & Memory System
- Implemented pattern-based memory extraction
- Integrated HuggingFace embeddings for semantic search
- Built document knowledge base with chunking
- Added rolling context window + Groq summarisation

#### Phase 5: Production Hardening and Monitoring
- **Implemented:** Uptime Robot integration, Cron-job.org keep-alive automation, production monitoring, backend availability improvements, Graphify analytics integration
- **Problems Faced:** Render backend sleeping during idle periods, slow first API response after cold starts, lack of production monitoring visibility, no business analytics
- **Solutions:** Automated keep-alive pings via Uptime Robot and Cron-job.org, health monitoring endpoints, analytics dashboards via Graphify, infrastructure monitoring setup
- **Results:** Faster API availability, better uptime, improved production reliability, actionable business insights from graph analysis

---

## 16. FUTURE ROADMAP

### Phase 6: Reranking + Hybrid Search + Citations
- **Reranking:** After initial vector retrieval, use a cross-encoder model to rerank chunks for improved precision
- **BM25 Hybrid Search:** Combine keyword-based (BM25) and vector-based retrieval using weighted scoring to capture both semantic and exact-match results
- **Source Citations:** LLM will output inline citations `[1]`, `[2]` referencing the source document chunks, displayed in the UI
- **IT Support Docs:** Upload real IT support documentation (troubleshooting guides, system architecture docs, policy manuals) to make the knowledge base genuinely useful

### Potential Future Enhancements
- WebSocket-based real-time chat (replace SSE polling)
- Streaming TTS for lower latency voice responses
- Voice activity detection using ML models (instead of RMS)
- Conversation branching and search
- Multi-tenant support (per-organisation knowledge bases)
- Rate limiting and abuse prevention
- Unit tests and integration tests
- Comprehensive error monitoring (Sentry)

---

## 17. HOW TO EXPLAIN THIS PROJECT

### Simple Explanation
"I built a full-stack AI customer support platform that allows users to communicate through text and voice. The system remembers important user information, searches company documents for answers, and responds intelligently using AI. The platform includes authentication, memory management, semantic search, knowledge retrieval, voice calling, admin controls, analytics dashboards, and production monitoring."

### Key Technologies and Purpose
| Technology | Purpose |
|-----------|---------|
| **React** | Frontend user interface |
| **Node.js + Express** | Backend API server |
| **MongoDB Atlas** | Persistent data storage |
| **Groq Llama Models** | AI response generation (`llama-3.3-70b-versatile`) |
| **Whisper** | Speech-to-text conversion (`whisper-large-v3`) |
| **Text-to-Speech** | Voice response generation (Web Speech API) |
| **Hugging Face Embeddings** | Semantic understanding (`all-MiniLM-L6-v2`) |
| **Vector Search** | Memory and knowledge retrieval (cosine similarity) |
| **RAG** | Document-based AI answers (Retrieval Augmented Generation) |
| **JWT** | Authentication and token-based sessions |
| **Vercel** | Frontend hosting |
| **Render** | Backend hosting |
| **Uptime Robot** | Availability monitoring |
| **Cron-job.org** | Keep-alive automation |
| **Graphify** | Analytics and reporting |

### Platform Capabilities Summary
The platform now includes:
- **Authentication** — JWT-based login/register with admin roles
- **Session Management** — Create, load, delete, share chat sessions with unique links
- **Semantic Memory** — Pattern-based extraction + vector embeddings for user profiling
- **Vector Search** — Cosine similarity search across memories and knowledge chunks
- **Knowledge Base Retrieval** — Document upload with chunking and RAG pipeline
- **RAG Pipeline** — Full retrieval-augmented generation with context injection
- **Voice Agent** — End-to-end voice call mode with VAD, Whisper STT, LLM, and TTS
- **VAD** — Adaptive noise floor voice activity detection
- **Whisper STT** — Groq Whisper large-v3 speech-to-text
- **TTS** — Browser-native text-to-speech with multilingual support
- **Admin Dashboard** — User management, ban/delete, session viewer, knowledge document upload
- **Analytics Dashboard (Graphify)** — Business intelligence and usage insights
- **Uptime Monitoring (Uptime Robot)** — Availability tracking and alerting
- **Keep-Alive Automation (Cron-job.org)** — Prevents Render cold starts
- **Production Deployment** — Render (backend) + Vercel (frontend) + MongoDB Atlas (database)

---

*End of Project Bible*
