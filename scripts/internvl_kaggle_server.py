import os
import torch
import time
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import uvicorn
from transformers import AutoTokenizer, AutoModel, AutoConfig
import threading
import nest_asyncio
from pyngrok import ngrok

# 1. Configuration
MODEL_PATH = "Qwen/Qwen2-VL-7B-Instruct"
NGROK_TOKEN = "3BAQtnjOhTvzPfOOt3yKz4xipLn_23xPS5LiugdzNEErwSyoL"
PORT = 8000

# 2. Load Model
print(f"Loading model {MODEL_PATH}...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, trust_remote_code=True)
model = AutoModel.from_pretrained(
    MODEL_PATH,
    torch_dtype=torch.bfloat16,
    load_in_4bit=True,
    trust_remote_code=True,
    device_map="auto"
).eval()

app = FastAPI()
nest_asyncio.apply()

@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    data = await request.json()
    messages = data.get("messages", [])
    
    # Simple extraction for now (assuming last message is the prompt)
    if not messages:
        return JSONResponse({"error": "No messages provided"}, status_code=400)
    
    prompt = messages[-1]["content"]
    
    # InternVL2 Generation
    pixel_values = None # For multimodal, we'd process images here
    
    # Generation config
    generation_config = dict(max_new_tokens=1024, do_sample=True)
    
    # If the user wants to support images, they'd need to send base64 or URLs
    # For now, we handle text-based interaction for CrewAI compatibility
    response, history = model.chat(tokenizer, pixel_values, prompt, generation_config)
    
    return {
        "id": "chatcmpl-kaggle",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": MODEL_PATH,
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": response,
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
    return {"status": "ok", "model": MODEL_PATH}

def run_server():
    uvicorn.run(app, host="0.0.0.0", port=PORT)

# 3. Tunneling
if __name__ == "__main__":
    if NGROK_TOKEN != "YOUR_NGROK_AUTHTOKEN":
        ngrok.set_auth_token(NGROK_TOKEN)
    
    public_url = ngrok.connect(PORT).public_url
    print(f" * Public URL: {public_url}")
    print(f" * Use this URL in your InsightEngine .env as KAGGLE_INTERNVL_URL")
    
    # Start server in thread
    threading.Thread(target=run_server, daemon=True).start()
    
    # Keep alive loop
    print("Keep alive loop started...")
    while True:
        time.sleep(60)
        # print("Kaggle session active...") # Optional: spam console to prevent timeout
