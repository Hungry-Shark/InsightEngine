<div align="center">
  <h1>⚙️ InsightEngine</h1>
  <strong>An Autonomous Research AI Assistant</strong>
</div>
<br />

<div align="center">
  A state-of-the-art intelligent agentic research tool. Designed with a premium dark-mode aesthetic, powered by Next.js, FastAPI, and CrewAI.
</div>

---

## ✨ Features

- **🧠 Autonomous Research Agents**: Powered by CrewAI and Groq to conduct deep, context-aware research and handle complex queries.
- **💬 Seamless Conversation Flow**: Intelligent routing, responsive chat logic, and easy thread continuation without disrupting your workflow.
- **✨ Premium UI/UX**: Visually stunning dark mode interface with frosted glassmorphism elements, interactive micro-animations (like ClickSpark), and dynamic gradients.
- **🗂️ History & Profiles**: Fully integrated chat history management, profile customization, and responsive state synchronization.

## 🛠️ Tech Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | Next.js, React, TypeScript |
| **Backend** | Python, FastAPI, CrewAI, LangChain |
| **LLM Inference** | Groq API (High Speed), Gemini |
| **Styling** | Vanilla CSS, Custom Animations, Glassmorphism |

## 🚀 Getting Started

### Prerequisites
- Node.js (for the Next.js frontend)
- Python 3.10+ (for the FastAPI backend)
- API Keys (`GROQ_API_KEY` or `GEMINI_API_KEY`)

### 1. Backend Setup
Navigate to the \`backend\` directory and start the server:
```bash
cd backend
python -m venv venv

# Activate Virtual Environment (Windows)
venv\Scripts\activate

# Activate Virtual Environment (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python -m uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
Open a new terminal, navigate to the \`frontend\` directory, and start the app:
```bash
cd frontend
npm install
npm run dev
```

Navigate to [http://localhost:3000](http://localhost:3000) to access the InsightEngine interface.

## 🌌 Design Philosophy
InsightEngine is built with **visual excellence** in mind. We avoid generic visuals in favor of curated harmonious palettes, modern typography, sophisticated blurring effects, and micro-interactions that make the assistant feel alive and responsive.

---

<div align="center">
  Built with ❤️ by Hungry-Shark
</div>


