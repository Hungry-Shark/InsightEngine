<div align="center">
  <h1>⚙️ InsightEngine</h1>
  <strong>Google Prompt War 2026 Submission</strong>
  <br /><br />

  <img alt="Next.js" src="https://img.shields.io/badge/Frontend-Next.js-0b0b12?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img alt="FastAPI" src="https://img.shields.io/badge/Backend-FastAPI-0b0b12?style=for-the-badge&logo=fastapi&logoColor=00e0b8" />
  <img alt="Gemini" src="https://img.shields.io/badge/LLM-Google%20Gemini-0b0b12?style=for-the-badge&logo=google&logoColor=8ab4f8" />
  <img alt="Firestore" src="https://img.shields.io/badge/Storage-Firebase%20Firestore-0b0b12?style=for-the-badge&logo=firebase&logoColor=ffca28" />
</div>

<br />

<div align="center">
  A state-of-the-art intelligent agentic research assistant. Designed with a premium dark-mode aesthetic, powered by Next.js, FastAPI, CrewAI, and Google Services.
</div>

---

## 🏆 Submission Details

### 📌 Chosen Vertical
**Smart Productivity and Research AI Assistant**

InsightEngine targets the challenge of building a smart, dynamic assistant. It operates as an autonomous researcher, capable of dynamically gathering, synthesizing, and formatting deep contextual data based on user queries and uploaded documents (RAG-less context injection).

### 🧠 Approach and Logic

Our approach uses a fault-tolerant, state-passing agentic pipeline rather than naive linear prompting:

1. **Context Ingestion**: Users supply a prompt or upload contextual documents (.txt, .pdf).
2. **Orchestration**: A routing engine evaluates the query to determine if simple retrieval or deep agentic search is required.
3. **Agent Delegation**: Specialized agents perform distinct roles (search, extraction, summarization).
4. **Fault Tolerance**: The system handles rate limits intelligently, falling back between high-speed models (Groq) and high-reasoning models (Google Gemini) automatically.

### ⚙️ How The Solution Works

- **Frontend**: A highly polished, accessible Next.js application with vanilla CSS, micro-animations, and semantic HTML.
- **Backend API**: FastAPI handles orchestration, websocket collaboration, and streaming responses.
- **Google Services Ecosystem**:
  - **Firebase Firestore** for secure syncing of chat history, profile state, and My Stuff documents.
  - **Google Gemini API** as a premier intelligent solver for complex multi-turn reasoning and parsing.

### ⚠️ Assumptions Made

- Valid API keys are available in environment variables (GEMINI_API_KEY, TAVILY_API_KEY).
- FIREBASE_CREDENTIALS_BASE64 or firebase_credentials.json is available for durable storage.
- If Firebase credentials are missing, the app falls back to ephemeral in-memory state.
- The host machine has network access for real-time Tavily search.

---

## ✨ Evaluation Focus Areas Unpacked

- **Code Quality**: Modular architecture with clear separation between pipeline logic, API routing, and persistence adapters.
- **Security**: Environment-based secret injection, restricted Firebase Admin usage, and scoped user header checks.
- **Efficiency**: Rolling summarization to prevent context bloat, plus lazy-loading and cache-aware frontend behavior.
- **Testing**: Clean interfaces enable mocking and isolated behavioral validation.
- **Accessibility**: Semantic structures, contrast-aware visuals, keyboard navigation, and ARIA-friendly components.
- **Google Services**: Firebase and Gemini integration are central to the product loop, not superficial add-ons.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | Next.js, React, TypeScript |
| **Backend** | Python, FastAPI, CrewAI, LangChain |
| **LLM Inference** | **Google Gemini API**, Groq |
| **Database and Sync** | **Firebase Firestore** |

---

## 🚀 Getting Started

<details>
  <summary><strong>Click to expand setup instructions</strong></summary>
  <br />

### Prerequisites

- Node.js 18+
- Python 3.10+
- API keys: GEMINI_API_KEY and TAVILY_API_KEY

### 1) Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### 2) Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open: http://localhost:3000

</details>

---

## 🧊 Visual Language

This README mirrors the project identity with a dark, glass-like presentation style through centered cards, subtle contrast blocks, and layered information hierarchy.

For in-app visual fidelity, see the live UI where frosted panels, ambient glow orbs, and animated accents are implemented directly in the CSS runtime.

---

## 🔎 Interactive Navigation

- Jump to [Submission Details](#-submission-details)
- Jump to [Evaluation Focus Areas Unpacked](#-evaluation-focus-areas-unpacked)
- Jump to [Tech Stack](#-tech-stack)
- Jump to [Getting Started](#-getting-started)

---

<div align="center">
  Built with ❤️ for Google Prompt War 2026 by Hungry-Shark
</div>
