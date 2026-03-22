"""
InternVL2.5-38B Kaggle Server
=============================
A Kaggle notebook script that serves InternVL2.5-38B-AWQ as an OpenAI-compatible API.
Deploy this on Kaggle with 2x T4 GPUs accelerator for free inference.

Requirements (install in first Kaggle cell):
    !pip install lmdeploy>=0.6.4 pyngrok fastapi uvicorn nest_asyncio

Usage:
    1. Create a new Kaggle notebook with GPU T4 x2 accelerator
    2. Paste this entire script into a code cell
    3. Run the cell — it will print a public ngrok URL
    4. Copy that URL into your InsightEngine .env as KAGGLE_INTERNVL38B_URL
"""

import os
import time
import threading
import nest_asyncio
from pyngrok import ngrok
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import uvicorn

# ── 1. Configuration ───────────────────────────────────────────────────
MODEL_ID = "OpenGVLab/InternVL2_5-38B-AWQ"
NGROK_TOKEN = os.environ.get("NGROK_AUTHTOKEN", "YOUR_NGROK_AUTHTOKEN")
PORT = 8000

# ── 2. Load Model via LMDeploy ─────────────────────────────────────────
print(f"🚀 Loading {MODEL_ID} with LMDeploy (AWQ 4-bit, tp=2)...")
from lmdeploy import pipeline, TurbomindEngineConfig

# tp=2 = tensor parallelism across both T4 GPUs
# session_len=8192 for a good balance of context vs memory
pipe = pipeline(
    MODEL_ID,
    backend_config=TurbomindEngineConfig(
        session_len=8192,
        tp=2,                    # Use both T4 GPUs
        cache_max_entry_count=0.4  # Conservative KV cache to avoid OOM
    )
)
print("✅ Model loaded successfully!")

# ── 3. FastAPI Server ──────────────────────────────────────────────────
app = FastAPI(title="InternVL2.5-38B API")
nest_asyncio.apply()


@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    """OpenAI-compatible chat completions endpoint."""
    data = await request.json()
    messages = data.get("messages", [])

    if not messages:
        return JSONResponse({"error": "No messages provided"}, status_code=400)

    # Extract the last user message
    prompt = messages[-1].get("content", "")
    if not prompt:
        return JSONResponse({"error": "Empty message content"}, status_code=400)

    # Build conversation history for multi-turn
    # LMDeploy pipeline expects a simple string prompt for text-only
    # For multi-turn, concatenate the conversation
    full_prompt = ""
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role == "system":
            full_prompt += f"System: {content}\n\n"
        elif role == "user":
            full_prompt += f"User: {content}\n\n"
        elif role == "assistant":
            full_prompt += f"Assistant: {content}\n\n"
    full_prompt += "Assistant: "

    try:
        response = pipe(full_prompt)
        response_text = response.text if hasattr(response, 'text') else str(response)
    except Exception as e:
        return JSONResponse(
            {"error": f"Inference failed: {str(e)}"},
            status_code=500
        )

    return {
        "id": f"chatcmpl-internvl38b-{int(time.time())}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": MODEL_ID,
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": response_text,
                },
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens": -1,
            "completion_tokens": -1,
            "total_tokens": -1
        }
    }


@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "ok", "model": MODEL_ID, "params": "38B (AWQ 4-bit)"}


@app.get("/v1/models")
def list_models():
    """OpenAI-compatible model listing."""
    return {
        "data": [
            {
                "id": MODEL_ID,
                "object": "model",
                "owned_by": "OpenGVLab",
            }
        ]
    }


def run_server():
    uvicorn.run(app, host="0.0.0.0", port=PORT)


# ── 4. Ngrok Tunnel & Keep-Alive ──────────────────────────────────────
if __name__ == "__main__":
    if NGROK_TOKEN and NGROK_TOKEN != "YOUR_NGROK_AUTHTOKEN":
        ngrok.set_auth_token(NGROK_TOKEN)

    public_url = ngrok.connect(PORT).public_url
    print(f"\n{'='*60}")
    print(f"  🌐 InternVL2.5-38B API is LIVE!")
    print(f"  📡 Public URL: {public_url}")
    print(f"  🔑 Set this in .env: KAGGLE_INTERNVL38B_URL={public_url}")
    print(f"{'='*60}\n")

    # Start server in background thread
    threading.Thread(target=run_server, daemon=True).start()

    # Keep-alive loop
    print("⏳ Keep-alive loop started (Ctrl+C to stop)...")
    while True:
        time.sleep(60)
