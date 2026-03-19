import os
import sys
import logging

# Configure logging to see output
logging.basicConfig(level=logging.INFO)

# Diagnostic script for backend research endpoint
try:
    from main import app
    print("Main app imported successfully")
    
    # Check what key is actually loaded in os.environ
    print(f"DEBUG: GOOGLE_API_KEY in main: {os.environ.get('GOOGLE_API_KEY', 'MISSING')[:10]}...")
    
    from fastapi.testclient import TestClient
    client = TestClient(app)
    
    print("Testing /api/research with a sample topic...")
    # Triggering the actual logic inside main.py
    response = client.post("/api/research", json={"topic": "Test AI", "temporary": True})
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")

except Exception as e:
    print(f"DIAGNOSTIC CRASHED: {e}")
    import traceback
    traceback.print_exc()
