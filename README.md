<div align="center">
  <h1>⚙️ InsightEngine</h1>
  <strong>Google Prompt War 2026 Submission</strong>
</div>
<br />
<div align="center">
  A state-of-the-art intelligent agentic research assistant. Designed with a premium dark-mode aesthetic, powered by Next.js, FastAPI, CrewAI, and Google Services.
</div>
---
## 🏆 Submission Details
### 📌 Chosen Vertical
**Smart Productivity & Research AI Assistant**
InsightEngine targets the challenge of building a smart, dynamic assistant. It operates as an autonomous researcher, capable of dynamically gathering, synthesizing, and formatting deep contextual data based on user queries and uploaded documents (RAG-less context injection).
### 🧠 Approach and Logic
Our approach utilizes a fault-tolerant, state-passing agentic pipeline rather than naive linear prompting:
1. **Context Ingestion**: Users supply a prompt or upload contextual documents (`.txt`, `.pdf`).
2. **Orchestration**: A routing engine evaluates the query to determine if simple retrieval or deep agentic search is required.
3. **Agent Delegation**: Specialized agents perform distinct roles (e.g., search, extraction, summarization). 
4. **Fault Tolerance**: The system intelligently handles rate limits, falling back between high-speed models (Groq) and high-reasoning models (Google Gemini) automatically.
### ⚙️ How the Solution Works
- **Frontend**: A highly polished, accessible Next.js application. Uses Vanilla CSS, Framer Motion-like micro-animations, and full semantic HTML for inclusive design.
- **Backend API**: A FastAPI application handles agent orchestration, websocket-based real-time collaboration, and streaming responses.
- **Google Services Ecosystem**:
  - **Firebase Firestore**: Used for secure, scalable syncing of user chat history, profile states, and "My Stuff" document library.
  - **Google Gemini API**: Integrated as a premier intelligent solver for complex multi-turn reasoning and parsing.
### ⚠️ Assumptions Made
- Users have valid API keys (`GEMINI_API_KEY`, `TAVILY_API_KEY`) configured in their `.env` file.
- `FIREBASE_CREDENTIALS_BASE64` or `firebase_credentials.json` is provided for permanent database storage. (If omitted, the system gracefully falls back to an ephemeral in-memory state).
- The host machine has network connectivity to execute real-time searches via the Tavily API.
---
## ✨ Evaluation Focus Areas Unpacked
- **Code Quality**: Modular architecture, separating logic (pipeline) from routing (FastAPI) and storage (Firestore adapter). 
- **Security**: Strict environment variable injection, robust Firebase Admin permission structures, and custom `X-User-Id` header-based authentication checks.
- **Efficiency**: Rolling summarizers prevent token-limit bloat; lazy-loading and edge-caching utilized on the frontend.
- **Testing**: Designed with clean interfaces to ensure logic components can be mocked and validated.
- **Accessibility**: Semantic UI structures, clear contrast (premium dark mode), keyboard-navigable elements, and screen-reader-friendly ARIA tags in Next.js.
- **Google Services**: Meaningful, deeply-coupled implementation of Firebase and Gemini API driving the core value loop.
---
## 🛠️ Tech Stack
| Layer | Technologies |
| --- | --- |
| **Frontend** | Next.js, React, TypeScript |
| **Backend** | Python, FastAPI, CrewAI, LangChain |
| **LLM Inference** | **Google Gemini API**, Groq |
| **Database & Auth** | **Firebase Firestore** |
## 🚀 Getting Started
### Prerequisites
- Node.js (18+)
- Python (3.10+)
- API Keys (`GEMINI_API_KEY`, `TAVILY_API_KEY`)
### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```
### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000)
---
<div align="center">
  Built with ❤️ for Google Prompt War 2026 by Hungry-Shark
</div>