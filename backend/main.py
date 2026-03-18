import os
import datetime
import importlib
import firebase_admin
from firebase_admin import credentials, firestore
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

# Ensure both key names work
if not os.environ.get("GOOGLE_API_KEY") and os.environ.get("GEMINI_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.environ["GEMINI_API_KEY"]

app = FastAPI(title="InsightEngine API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins dynamically (easier for Render to Vercel communication)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Firestore Initialization ──────────────
db = None
USER_ID = "default_user"
try:
    if os.environ.get("FIREBASE_CREDENTIALS_BASE64"):
        import base64
        import json
        # Decode base64 credentials injected by Render environment variables
        decoded_creds = base64.b64decode(os.environ["FIREBASE_CREDENTIALS_BASE64"]).decode('utf-8')
        cred_dict = json.loads(decoded_creds)
        cred = credentials.Certificate(cred_dict)
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("Firebase initialized successfully from environment variable.")
    elif os.environ.get("GOOGLE_APPLICATION_CREDENTIALS") or os.path.exists("firebase_credentials.json"):
        if os.path.exists("firebase_credentials.json"):
            cred = credentials.Certificate("firebase_credentials.json")
            if not firebase_admin._apps:
                firebase_admin.initialize_app(cred)
        else:
            if not firebase_admin._apps:
                firebase_admin.initialize_app()
        db = firestore.client()
        print("Firebase initialized successfully.")
    else:
        print("No Firebase credentials found. Falling back to in-memory state.")
except Exception as e:
    print(f"Firebase initialization failed: {e}")

# ── In-memory state (mirrors Streamlit session_state) ──────────────
_state = {
    "chat_history": [],
    "my_stuff": [],
    "profile": {
        "name": "User",
        "email": "",
        "bio": "",
    },
    "settings": {
        "model": "gemini-2.0-flash",
        "verbose": False,
        "theme": "Royal Purple",
    },
}

# ── Pydantic models ────────────────────────────────────────────────
class ResearchRequest(BaseModel):
    topic: str
    temporary: bool = False

class SaveHistoryRequest(BaseModel):
    topic: str
    report: str
    raw_data: str
    ts: str
    provider: Optional[str] = "gemini"

class ProfileUpdate(BaseModel):
    name: str
    email: str
    bio: str

class SettingsUpdate(BaseModel):
    model: str
    verbose: bool
    theme: str

# ── Routes ────────────────────────────────────────────────────────

@app.get("/api/status")
def get_status():
    google_ok = bool(os.environ.get("GOOGLE_API_KEY"))
    tavily_ok = bool(os.environ.get("TAVILY_API_KEY"))
    return {
        "google_api": google_ok,
        "tavily_api": tavily_ok,
    }


@app.post("/api/research")
def run_research(req: ResearchRequest):
    import time
    import logging

    logger = logging.getLogger(__name__)

    tavily_api = os.environ.get("TAVILY_API_KEY")
    google_api = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    groq_api = os.environ.get("GROQ_API_KEY")

    if not tavily_api:
        raise HTTPException(status_code=400, detail="Missing TAVILY_API_KEY in .env")

    if not google_api and not groq_api:
        raise HTTPException(
            status_code=400,
            detail="Missing API keys. Set at least one of GOOGLE_API_KEY or GROQ_API_KEY in .env"
        )

    import sys
    backend_dir = os.path.dirname(__file__)
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)

    from agents import create_agents
    from tasks import create_tasks
    from crewai import Crew, Process

    # Strategy: try Gemini first, fallback to Groq on rate limit
    providers = []
    if google_api:
        providers.append("gemini")
    if groq_api:
        providers.append("groq")
    if not providers:
        raise HTTPException(status_code=400, detail="No LLM API keys configured.")

    last_error = None
    for provider in providers:
        try:
            logger.info(f"Starting research with provider: {provider}")

            researcher, writer, validator, active_provider = create_agents(provider)
            research_task, validate_task, write_task = create_tasks(researcher, writer, validator)

            insight_crew = Crew(
                agents=[researcher, validator, writer],
                tasks=[research_task, validate_task, write_task],
                process=Process.sequential,
                max_rpm=8
            )
            result = insight_crew.kickoff(inputs={"topic": req.topic})

            raw = ""
            try:
                raw = str(research_task.output.raw)
            except Exception:
                raw = "Raw data captured successfully."

            entry = {
                "topic": req.topic,
                "report": result.raw,
                "raw_data": raw,
                "ts": datetime.datetime.now().strftime("%b %d, %H:%M"),
                "provider": active_provider,
            }
            if not req.temporary:
                if db:
                    entry["created_at"] = firestore.SERVER_TIMESTAMP
                    db.collection("users").document(USER_ID).collection("history").add(entry)
                    entry.pop("created_at")
                else:
                    _state["chat_history"].append(entry)

            return {
                "report": result.raw,
                "raw_data": raw,
                "topic": req.topic,
                "ts": entry["ts"],
                "provider": active_provider,
            }

        except Exception as e:
            error_str = str(e).lower()
            is_rate_limit = "429" in error_str or "resource_exhausted" in error_str or "quota" in error_str
            last_error = e

            if is_rate_limit and provider != providers[-1]:
                logger.warning(
                    f"{provider.title()} rate limit hit. Switching to next provider..."
                )
                continue
            elif is_rate_limit:
                raise HTTPException(
                    status_code=429,
                    detail=(
                        f"All LLM providers exhausted. Last error: {str(e)[:200]}. "
                        f"Please wait for quota reset or check your API dashboard."
                    )
                )
            else:
                raise HTTPException(status_code=500, detail=str(e))



# ── History ─────────────────────────────────────────────────────────
@app.get("/api/history")
def get_history():
    if db:
        docs = db.collection("users").document(USER_ID).collection("history").order_by("created_at").stream()
        history = [doc.to_dict() for doc in docs]
        for h in history:
            h.pop("created_at", None)
        return {"history": history}
    return {"history": _state["chat_history"]}


@app.delete("/api/history/{index}")
def delete_history(index: int):
    if db:
        docs = list(db.collection("users").document(USER_ID).collection("history").order_by("created_at").stream())
        if index < 0 or index >= len(docs):
            raise HTTPException(status_code=404, detail="History entry not found")
        docs[index].reference.delete()
        return {"ok": True}

    history = _state["chat_history"]
    if index < 0 or index >= len(history):
        raise HTTPException(status_code=404, detail="History entry not found")
    _state["chat_history"].pop(index)
    return {"ok": True}


@app.delete("/api/history")
def clear_history():
    if db:
        docs = db.collection("users").document(USER_ID).collection("history").stream()
        for doc in docs:
            doc.reference.delete()
        return {"ok": True}

    _state["chat_history"] = []
    return {"ok": True}

@app.post("/api/history/save")
def save_history(req: SaveHistoryRequest):
    entry = req.dict()
    if db:
        entry["created_at"] = firestore.SERVER_TIMESTAMP
        db.collection("users").document(USER_ID).collection("history").add(entry)
        entry.pop("created_at", None)
    else:
        _state["chat_history"].append(entry)
    return {"ok": True}

# ── My Stuff ─────────────────────────────────────────────────────────

class MyStuffItem(BaseModel):
    id: str
    type: str
    title: str
    source_topic: str
    content: str
    ts: str

@app.get("/api/mystuff")
def get_mystuff():
    if db:
        docs = db.collection("users").document(USER_ID).collection("mystuff").order_by("created_at", direction=firestore.Query.DESCENDING).stream()
        items = [doc.to_dict() for doc in docs]
        for it in items:
            it.pop("created_at", None)
        return {"items": items}
    return {"items": _state.get("my_stuff", [])}

@app.post("/api/mystuff")
def add_mystuff(item: MyStuffItem):
    entry = item.model_dump()
    if db:
        entry["created_at"] = firestore.SERVER_TIMESTAMP
        db.collection("users").document(USER_ID).collection("mystuff").document(item.id).set(entry)
        entry.pop("created_at", None)
    else:
        if "my_stuff" not in _state:
            _state["my_stuff"] = []
        if not any(existing.get("id") == item.id for existing in _state["my_stuff"]):
            _state["my_stuff"].insert(0, entry)
    return {"ok": True}

@app.delete("/api/mystuff/{item_id}")
def delete_mystuff(item_id: str):
    if db:
        db.collection("users").document(USER_ID).collection("mystuff").document(item_id).delete()
    else:
        if "my_stuff" in _state:
            _state["my_stuff"] = [it for it in _state["my_stuff"] if it.get("id") != item_id]
    return {"ok": True}

# ── Profile ──────────────────────────────────────────────────────────
@app.get("/api/profile")
def get_profile():
    if db:
        doc = db.collection("users").document(USER_ID).get()
        if doc.exists:
            data = doc.to_dict()
            return data.get("profile", _state["profile"])
    return _state["profile"]


@app.put("/api/profile")
def update_profile(body: ProfileUpdate):
    _state["profile"]["name"] = body.name
    _state["profile"]["email"] = body.email
    _state["profile"]["bio"] = body.bio
    if db:
        db.collection("users").document(USER_ID).set({"profile": _state["profile"]}, merge=True)
    return {"ok": True}


# ── Settings ─────────────────────────────────────────────────────────
@app.get("/api/settings")
def get_settings():
    if db:
        doc = db.collection("users").document(USER_ID).get()
        if doc.exists:
            data = doc.to_dict()
            return data.get("settings", _state["settings"])
    return _state["settings"]


@app.put("/api/settings")
def update_settings(body: SettingsUpdate):
    _state["settings"]["model"] = body.model
    _state["settings"]["verbose"] = body.verbose
    _state["settings"]["theme"] = body.theme
    if db:
        db.collection("users").document(USER_ID).set({"settings": _state["settings"]}, merge=True)
    return {"ok": True}


@app.post("/api/settings/reset")
def reset_settings():
    _state["settings"] = {
        "model": "gemini-1.5-flash",
        "verbose": False,
        "theme": "Royal Purple",
    }
    if db:
        db.collection("users").document(USER_ID).set({"settings": _state["settings"]}, merge=True)
    return {"ok": True}


@app.get("/api/export/pdf/{index}")
def export_pdf(index: int):
    if db:
        docs = list(db.collection("users").document(USER_ID).collection("history").order_by("created_at").stream())
        if index < 0 or index >= len(docs):
            raise HTTPException(status_code=404, detail="History entry not found")
        entry = docs[index].to_dict()
    else:
        history = _state["chat_history"]
        if index < 0 or index >= len(history):
            raise HTTPException(status_code=404, detail="History entry not found")
        entry = history[index]
    try:
        from utils import export_as_pdf
        pdf_bytes = export_as_pdf(entry["report"])
        filename = entry["topic"][:30].replace(" ", "_") + ".pdf"
        return StreamingResponse(
            iter([pdf_bytes]),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF export failed: {e}")
