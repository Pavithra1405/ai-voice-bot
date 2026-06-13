# Graph Report - .  (2026-06-13)

## Corpus Check
- Corpus is ~12,912 words - fits in a single context window. You may not need a graph.

## Summary
- 200 nodes · 205 edges · 23 communities (17 shown, 6 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Frontend Dependencies & Tooling|Frontend Dependencies & Tooling]]
- [[_COMMUNITY_Backend Auth & Session Management|Backend Auth & Session Management]]
- [[_COMMUNITY_Frontend App & AI Overview|Frontend App & AI Overview]]
- [[_COMMUNITY_Chat & Conversation Services|Chat & Conversation Services]]
- [[_COMMUNITY_Root Project Configuration|Root Project Configuration]]
- [[_COMMUNITY_Backend Package Configuration|Backend Package Configuration]]
- [[_COMMUNITY_Server Initialization & Routing|Server Initialization & Routing]]
- [[_COMMUNITY_Main App UI Components|Main App UI Components]]
- [[_COMMUNITY_Backend Runtime Dependencies|Backend Runtime Dependencies]]
- [[_COMMUNITY_Auth Controller & Routes|Auth Controller & Routes]]
- [[_COMMUNITY_Call Processing Routes|Call Processing Routes]]
- [[_COMMUNITY_Social Media Icon Set|Social Media Icon Set]]
- [[_COMMUNITY_Brand Favicon Assets|Brand Favicon Assets]]
- [[_COMMUNITY_Vite Build Tool|Vite Build Tool]]
- [[_COMMUNITY_Oxc Babel Plugin|Oxc Babel Plugin]]
- [[_COMMUNITY_SWC Plugin Alternative|SWC Plugin Alternative]]
- [[_COMMUNITY_Vercel Deployment Config|Vercel Deployment Config]]
- [[_COMMUNITY_Hero Image Asset|Hero Image Asset]]
- [[_COMMUNITY_React Logo Asset|React Logo Asset]]

## God Nodes (most connected - your core abstractions)
1. `React + Vite Template` - 8 edges
2. `ai-voice-bot` - 6 edges
3. `SVG Icon Sprite` - 6 edges
4. `scripts` - 5 edges
5. `Frontend App Shell (index.html)` - 5 edges
6. `Bluesky Icon` - 4 edges
7. `Discord Icon` - 4 edges
8. `GitHub Icon` - 4 edges
9. `X (Twitter) Icon` - 4 edges
10. `generateToken()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `ai-voice-bot` --conceptually_related_to--> `Frontend App Shell (index.html)`  [INFERRED]
  README.md → frontend/index.html
- `React + Vite Template` --references--> `Frontend App Shell (index.html)`  [INFERRED]
  frontend/README.md → frontend/index.html
- `React` --conceptually_related_to--> `/src/main.jsx Entry Script`  [INFERRED]
  frontend/README.md → frontend/index.html
- `handleChat()` --calls--> `generateGroqStream()`  [EXTRACTED]
  backend/controllers/chatController.js → backend/services/geminiService.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Frontend Development Stack** — frontend_readme_react, frontend_readme_vite, frontend_readme_hmr, frontend_readme_eslint [EXTRACTED 1.00]
- **ai-voice-bot Capabilities** — readme_ai_powered_voice_chatbot, readme_authentication, readme_real_time_conversation, readme_ai_integration, readme_grok_api [EXTRACTED 1.00]
- **Social Media Platform Icons** — public_icons_bluesky_icon, public_icons_discord_icon, public_icons_github_icon, public_icons_x_icon [INFERRED 0.95]

## Communities (23 total, 6 thin omitted)

### Community 0 - "Frontend Dependencies & Tooling"
Cohesion: 0.08
Nodes (24): dependencies, axios, react, react-dom, react-toastify, devDependencies, eslint, @eslint/js (+16 more)

### Community 1 - "Backend Auth & Session Management"
Cohesion: 0.09
Nodes (17): jwt, User, ChatSessionSchema, mongoose, { nanoid }, mongoose, userSchema, adminMiddleware (+9 more)

### Community 2 - "Frontend App & AI Overview"
Cohesion: 0.12
Nodes (18): favicon.svg, Frontend App Shell (index.html), /src/main.jsx Entry Script, #root Mount Div, ESLint, HMR (Hot Module Replacement), React, React Compiler (+10 more)

### Community 3 - "Chat & Conversation Services"
Cohesion: 0.15
Nodes (12): Conversation, { generateGroqStream }, getHistory(), handleChat(), conversationSchema, mongoose, auth, express (+4 more)

### Community 4 - "Root Project Configuration"
Cohesion: 0.12
Nodes (15): author, dependencies, cors, dotenv, express, mongoose, description, keywords (+7 more)

### Community 5 - "Backend Package Configuration"
Cohesion: 0.14
Nodes (13): author, description, devDependencies, nodemon, keywords, license, main, name (+5 more)

### Community 6 - "Server Initialization & Routing"
Cohesion: 0.14
Nodes (11): adminRoutes, app, authRoutes, callRoutes, chatRoutes, connectDB, cors, dotenv (+3 more)

### Community 7 - "Main App UI Components"
Cohesion: 0.15
Nodes (3): App(), EMPTY_FORM, THINKING_STAGES

### Community 8 - "Backend Runtime Dependencies"
Cohesion: 0.18
Nodes (11): dependencies, axios, bcryptjs, cors, dotenv, express, @google/generative-ai, jsonwebtoken (+3 more)

### Community 9 - "Auth Controller & Routes"
Cohesion: 0.25
Nodes (9): bcrypt, generateToken(), jwt, login(), register(), User, express, { register, login } (+1 more)

### Community 10 - "Call Processing Routes"
Cohesion: 0.20
Nodes (8): auth, axios, express, FormData, GARBAGE_ONLY, multer, router, upload

### Community 11 - "Social Media Icon Set"
Cohesion: 0.62
Nodes (7): Bluesky Icon, Discord Icon, Documentation Icon, GitHub Icon, Social Icon, SVG Icon Sprite, X (Twitter) Icon

### Community 12 - "Brand Favicon Assets"
Cohesion: 0.67
Nodes (3): Brand Color Palette (Purple Spectrum), Stylized Brand Icon Shape, Favicon Icon

## Knowledge Gaps
- **132 isolated node(s):** `mongoose`, `User`, `bcrypt`, `jwt`, `{ generateGroqStream }` (+127 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Backend Runtime Dependencies` to `Backend Package Configuration`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `mongoose`, `User`, `bcrypt` to the rest of the system?**
  _132 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend Dependencies & Tooling` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Backend Auth & Session Management` be split into smaller, more focused modules?**
  _Cohesion score 0.08666666666666667 - nodes in this community are weakly interconnected._
- **Should `Frontend App & AI Overview` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `Chat & Conversation Services` be split into smaller, more focused modules?**
  _Cohesion score 0.14705882352941177 - nodes in this community are weakly interconnected._
- **Should `Root Project Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._