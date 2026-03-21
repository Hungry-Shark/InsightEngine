import os
import datetime
import importlib
import firebase_admin
from firebase_admin import credentials, firestore
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

# Ensure both key names work
if not os.environ.get("GOOGLE_API_KEY") and os.environ.get("GEMINI_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.environ["GEMINI_API_KEY"]

app = FastAPI(title="InsightEngine API", version="1.0.0")

# Allow origins from environment variable or default to localhost
allowed_origins: List[str] = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://insight-engine-007.vercel.app",
    "https://insight-engine-887.vercel.app"
]
env_origins = os.environ.get("ALLOWED_ORIGINS")
if env_origins:
    allowed_origins.extend(env_origins.split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(allowed_origins)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth Enforcement ──────────────────────────────────────────────
def get_authenticated_user(request: Request) -> str:
    """Dependency to enforce authentication. Returns user ID or raises 401."""
    uid = request.headers.get("X-User-Id")
    if not uid or uid in ["null", "undefined", "anonymous"]:
        raise HTTPException(
            status_code=401, 
            detail="Authentication required. Please sign up or sign in to use InsightEngine features."
        )
    return uid

def get_user_id(request: Request) -> str:
    """Extract user ID from X-User-Id header, fallback to 'anonymous' (for public routes)."""
    uid = request.headers.get("X-User-Id")
    if not uid or uid in ["null", "undefined", "anonymous"]:
        return "anonymous"
    return uid

# ── Keep-Alive Background Task ──────────────
import threading
import time
import urllib.request
import urllib.error

def keep_alive_loop():
    url = os.environ.get("RENDER_EXTERNAL_URL") or os.environ.get("KEEP_ALIVE_URL")
    if not url:
        print("Keep-alive loop bypassed: RENDER_EXTERNAL_URL not set.")
        return
    if not url.endswith("/api/status"):
        url = url.rstrip("/") + "/api/status"

    print(f"Keep-alive loop initialized. Will ping {url} every 14 minutes.")
    while True:
        time.sleep(14 * 60)  # Sleep for 14 minutes
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'KeepAlive/1.0'})
            urllib.request.urlopen(req, timeout=10)
            print(f"Keep-alive ping sent to {url}")
        except Exception as e:
            print(f"Keep-alive ping failed: {e}")

@app.on_event("startup")
def start_keep_alive():
    threading.Thread(target=keep_alive_loop, daemon=True).start()

import traceback
import logging

logger = logging.getLogger(__name__)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception on {request.url.path}: {exc}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected server error occurred. Our engineers have been notified."},
    )

# ── Firestore Initialization ──────────────
db = None

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
_state: Dict[str, Any] = {
    "chat_history": [],
    "my_stuff": [],
    "profile": {
        "name": "User",
        "email": "",
        "bio": "",
        "picture": "",
        "token": "",
    },
    "settings": {
        "model": "gemini-2.5-flash",
        "verbose": False,
        "theme": "Royal Purple",
    },
}

def generate_user_token() -> str:
    """Generate a unique 12-digit numeric token."""
    import random
    return "".join([str(random.randint(0, 9)) for _ in range(12)])

try:
    from kaggle_client import KaggleManager
except (ImportError, ValueError):
    try:
        from .kaggle_client import KaggleManager
    except Exception:
        # Final fallback or dummy if truly missing, but it should be there
        class KaggleManager:
            def is_configured(self): return False
            def start_notebook(self): return False
            def get_status(self): return "unconfigured"
kaggle_mgr = KaggleManager()

# ── Websocket Connection Manager ─────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        # Dictionary mapping conversation IDs to a list of active WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, conv_id: str):
        await websocket.accept()
        if conv_id not in self.active_connections:
            self.active_connections[conv_id] = []
        self.active_connections[conv_id].append(websocket)

    def disconnect(self, websocket: WebSocket, conv_id: str):
        if conv_id in self.active_connections:
            self.active_connections[conv_id].remove(websocket)
            if conv_id in self.active_connections:
                self.active_connections.pop(conv_id, None)

    async def broadcast(self, message: dict, conv_id: str):
        if conv_id in self.active_connections:
            for connection in self.active_connections[conv_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    # Connection might be stale
                    pass

manager = ConnectionManager()

@app.websocket("/ws/chat/{conv_id}")
async def websocket_endpoint(websocket: WebSocket, conv_id: str):
    await manager.connect(websocket, conv_id)
    try:
        while True:
            # We expect JSON like: {"type": "chat", "user": "...", "text": "...", "picture": "..."}
            data = await websocket.receive_json()
            await manager.broadcast(data, conv_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, conv_id)
    except Exception as e:
        print(f"Websocket error: {e}")
        manager.disconnect(websocket, conv_id)

# ── Pydantic models ────────────────────────────────────────────────
class ResearchRequest(BaseModel):
    topic: str
    temporary: bool = False
    provider: Optional[str] = "gemini"

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
    picture: Optional[str] = ""
    token: Optional[str] = ""

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

@app.get("/api/diag_firebase")
def diag_firebase():
    global db
    if db:
        return {"status": "Connected to Firestore"}
    else:
        return {"status": "Fell back to in-memory dictionary. FIREBASE_CREDENTIALS_BASE64 may be invalid."}

@app.post("/api/research")
def run_research(req: ResearchRequest, user_id: str = Depends(get_authenticated_user)):
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

    # Strategy: Prioritize requested provider if keys exist, fallback in order
    providers = []
    
    if req.provider == "kaggle-qwen":
        providers.append("kaggle-qwen")
    elif req.provider == "groq" and groq_api:
        providers.append("groq")
    elif req.provider == "gemini" and google_api:
        providers.append("gemini")
    
    # Fill in remaining providers for fallback
    if google_api and "gemini" not in providers:
        providers.append("gemini")
    if groq_api and "groq" not in providers:
        providers.append("groq")
    # Always allow kaggle-qwen as a manual choice even if it doesn't have a 'google_api' style key
    if req.provider == "kaggle-qwen" and "kaggle-qwen" not in providers:
        providers.append("kaggle-qwen")

    if not providers:
        raise HTTPException(status_code=400, detail="No LLM API keys configured.")

    last_error = None
    for provider in providers:
        try:
            logger.info(f"Starting research with provider: {provider}")

            researcher, writer, validator, manager, active_provider = create_agents(provider)
            research_task, validate_task, write_task = create_tasks(researcher, writer, validator)

            insight_crew = Crew(
                agents=[researcher, validator, writer],
                tasks=[research_task, validate_task, write_task],
                process=Process.hierarchical,
                manager_agent=manager,
                memory=True, # Enable dual-layer memory
                verbose=True,
                max_rpm=10
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
                    db.collection("users").document(user_id).collection("history").add(entry)
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

            # Fallback to next provider on ANY error (rate limit, 403 forbidden, auth error, etc)
            if provider != providers[-1]:
                logger.warning(
                    f"{provider.title()} failed with error: {str(e)}. Switching to next provider..."
                )
                continue
            
            # If all providers failed, check if the last one was a rate limit
            if is_rate_limit:
                logger.error(f"All LLM providers exhausted. Final rate limit error: {str(e)}")
                raise HTTPException(
                    status_code=429,
                    detail="An issue has occurred on our end, we are facing unusually high traffic. Please try again in a few moments."
                )
            else:
                logger.error(f"Internal error with all providers. Final error: {str(e)}")
                raise HTTPException(
                    status_code=500, 
                    detail="An unexpected issue has occurred on our end. We will be right back!"
                )



# ── History ─────────────────────────────────────────────────────────
@app.get("/api/history")
def get_history(user_id: str = Depends(get_authenticated_user)):
    if db:
        docs = db.collection("users").document(user_id).collection("history").order_by("created_at").stream()
        history = [doc.to_dict() for doc in docs]
        for h in history:
            h.pop("created_at", None)
        return {"history": history}
    return {"history": _state["chat_history"]}


@app.delete("/api/history/{index}")
def delete_history(index: int, user_id: str = Depends(get_authenticated_user)):
    if db:
        docs = list(db.collection("users").document(user_id).collection("history").order_by("created_at").stream())
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
def clear_history(user_id: str = Depends(get_authenticated_user)):
    if db:
        docs = db.collection("users").document(user_id).collection("history").stream()
        for doc in docs:
            doc.reference.delete()
        return {"ok": True}

    _state["chat_history"] = []
    return {"ok": True}

@app.post("/api/history/save")
def save_history(req: SaveHistoryRequest, user_id: str = Depends(get_authenticated_user)):
    entry = req.model_dump()
    if db:
        entry["created_at"] = firestore.SERVER_TIMESTAMP
        db.collection("users").document(user_id).collection("history").add(entry)
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
def get_mystuff(user_id: str = Depends(get_authenticated_user)):
    if db:
        docs = db.collection("users").document(user_id).collection("mystuff").order_by("created_at", direction=firestore.Query.DESCENDING).stream()
        items = [doc.to_dict() for doc in docs]
        for it in items:
            it.pop("created_at", None)
        return {"items": items}
    return {"items": _state.get("my_stuff", [])}

@app.post("/api/mystuff")
def add_mystuff(item: MyStuffItem, user_id: str = Depends(get_authenticated_user)):
    entry = item.model_dump()
    if db:
        entry["created_at"] = firestore.SERVER_TIMESTAMP
        db.collection("users").document(user_id).collection("mystuff").document(item.id).set(entry)
        entry.pop("created_at", None)
    else:
        if "my_stuff" not in _state:
            _state["my_stuff"] = []
        if not any(existing.get("id") == item.id for existing in _state["my_stuff"]):
            _state["my_stuff"].insert(0, entry)
    return {"ok": True}

@app.delete("/api/mystuff/{item_id}")
def delete_mystuff(item_id: str, user_id: str = Depends(get_authenticated_user)):
    if db:
        db.collection("users").document(user_id).collection("mystuff").document(item_id).delete()
    else:
        if "my_stuff" in _state:
            _state["my_stuff"] = [it for it in _state["my_stuff"] if it.get("id") != item_id]
    return {"ok": True}

# ── Profile ──────────────────────────────────────────────────────────
@app.get("/api/profile")
def get_profile(user_id: str = Depends(get_authenticated_user)):
    profile = _state["profile"].copy()
    if db:
        doc = db.collection("users").document(user_id).get()
        if doc.exists:
            data = doc.to_dict()
            profile = data.get("profile", _state["profile"])
    
    # Ensure token exists
    if not profile.get("token"):
        profile["token"] = generate_user_token()
        if db:
            db.collection("users").document(user_id).set({"profile": profile}, merge=True)
        else:
            _state["profile"] = profile
            
    return profile


@app.put("/api/profile")
def update_profile(body: ProfileUpdate, user_id: str = Depends(get_authenticated_user)):
    profile = {
        "name": body.name,
        "email": body.email,
        "bio": body.bio,
        "picture": body.picture,
        "token": body.token if body.token else generate_user_token()
    }
    if db:
        db.collection("users").document(user_id).set({"profile": profile}, merge=True)
    else:
        _state["profile"] = profile
    return {"ok": True}


# ── Settings ─────────────────────────────────────────────────────────
@app.get("/api/settings")
def get_settings(user_id: str = Depends(get_authenticated_user)):
    if db:
        doc = db.collection("users").document(user_id).get()
        if doc.exists:
            data = doc.to_dict()
            return data.get("settings", _state["settings"])
    return _state["settings"]


@app.put("/api/settings")
def update_settings(body: SettingsUpdate, user_id: str = Depends(get_authenticated_user)):
    if db:
        db.collection("users").document(user_id).set({"settings": body.dict()}, merge=True)
    else:
        _state["settings"] = body.dict()
    return {"ok": True}


@app.post("/api/settings/reset")
def reset_settings(user_id: str = Depends(get_authenticated_user)):
    default_settings = {
        "model": "gemini-1.5-flash",
        "verbose": False,
        "theme": "Royal Purple"
    }
    if db:
        db.collection("users").document(user_id).set({"settings": default_settings}, merge=True)
    else:
        _state["settings"] = default_settings
    return {"ok": True}

# ── Collaboration ───────────────────────────────────────────────────
@app.get("/api/collaboration/join/{token}")
def join_by_token(token: str, user_id: str = Depends(get_authenticated_user)):
    """Find a user by their 12-digit token and return their active research."""
    if db:
        users = db.collection("users").where("profile.token", "==", token).limit(1).get()
        if users:
            user_doc = users[0]
            user_data = user_doc.to_dict()
            # For simplicity, we return the most recent history item as the "active" one
            history = user_doc.reference.collection("history").order_by("ts", direction=firestore.Query.DESCENDING).limit(1).get()
            if history:
                return {
                    "ok": True,
                    "host_name": user_data.get("profile", {}).get("name", "Someone"),
                    "host_id": user_doc.id,
                    "research": history[0].to_dict()
                }
    
    # Fallback to in-memory if no DB or token not found
    if _state["profile"].get("token") == token:
        return {
            "ok": True,
            "host_name": _state["profile"]["name"],
            "host_id": "anonymous",
            "research": _state["chat_history"][0] if _state["chat_history"] else None
        }
        
    raise HTTPException(status_code=404, detail="Conversation not found or token invalid.")


@app.post("/api/settings/reset")
def reset_settings(user_id: str = Depends(get_authenticated_user)):
    _state["settings"] = {
        "model": "gemini-2.5-flash",
        "verbose": False,
        "theme": "Royal Purple",
    }
    if db:
        db.collection("users").document(user_id).set({"settings": _state["settings"]}, merge=True)
    return {"ok": True}


@app.get("/api/export/pdf/{index}")
def export_pdf(index: int, user_id: str = Depends(get_authenticated_user)):
    if db:
        docs = list(db.collection("users").document(user_id).collection("history").order_by("created_at").stream())
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
        logger.error(f"PDF export failed: {e}")
        raise HTTPException(status_code=500, detail="PDF export failed due to an internal error.")

# ── Kaggle Management ────────────────────────────────────────────────
@app.post("/api/kaggle/wakeup")
def wakeup_kaggle():
    if not kaggle_mgr.is_configured():
        raise HTTPException(status_code=400, detail="Kaggle is not configured. Check your .env file.")
    success = kaggle_mgr.start_notebook()
    if success:
        return {"ok": True, "message": "Kaggle notebook triggered successfully."}
    else:
        raise HTTPException(status_code=500, detail="Failed to trigger Kaggle notebook.")

@app.get("/api/kaggle/status")
def get_kaggle_status():
    if not kaggle_mgr.is_configured():
        return {"configured": False}
    status = kaggle_mgr.get_status()
    return {"configured": True, "status": status}

