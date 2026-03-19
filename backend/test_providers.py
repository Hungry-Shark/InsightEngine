import os
import sys
from dotenv import load_dotenv
from crewai import LLM

load_dotenv()

def test_provider(name, model, key):
    print(f"\n--- Testing {name} ---")
    if not key:
        print(f"SKIPPING {name}: No key found.")
        return
    
    try:
        llm = LLM(
            model=model,
            temperature=0.5,
            api_key=key
        )
        print(f"Attempting test call to {model}...")
        response = llm.call([{"role": "user", "content": "Say 'Provider OK'"}])
        print(f"SUCCESS: {response}")
    except Exception as e:
        print(f"FAILED {name}: {e}")

gemini_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
groq_key = os.getenv("GROQ_API_KEY")

test_provider("Gemini", "gemini/gemini-2.0-flash", gemini_key)
test_provider("Groq", "groq/llama-3.3-70b-versatile", groq_key)
