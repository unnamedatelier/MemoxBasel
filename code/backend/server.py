# server.py
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import json
import os

app = FastAPI()

# Ensure sessions_folder exists
SESSIONS_FOLDER = "sessions_folder"
os.makedirs(SESSIONS_FOLDER, exist_ok=True)

@app.get("/init")
async def init(uid: str):
    """Create a new session file for the given UID"""
    filename = os.path.join(SESSIONS_FOLDER, f"{uid}.json")
    
    # Create new session file
    with open(filename, "w") as f:
        json.dump({"uid": uid, "inputs": []}, f, indent=2)
    
    return JSONResponse(
        status_code=200,
        content={"message": f"Session {uid} created successfully", "uid": uid}
    )

@app.post("/input")
async def add_input(request: Request):
    """Append text to the session file matching the UID"""
    data = await request.json()
    uid = data.get("uid")
    text = data.get("text")
    
    if not uid:
        return JSONResponse(
            status_code=400,
            content={"error": "UID is required"}
        )
    
    if not text:
        return JSONResponse(
            status_code=400,
            content={"error": "Text is required"}
        )
    
    filename = os.path.join(SESSIONS_FOLDER, f"{uid}.json")

    # Check if session file exists
    if not os.path.exists(filename):
        return JSONResponse(
            status_code=404,
            content={"error": f"Session {uid} not found. Please call /init first."}
        )

    # Read current content
    with open(filename, "r") as f:
        content = json.load(f)

    # Append new text
    content["inputs"].append(text)

    # Write updated content
    with open(filename, "w") as f:
        json.dump(content, f, indent=2)

    return JSONResponse(
        status_code=200,
        content={"message": f"Text added to session {uid}", "total_inputs": len(content["inputs"])}
    )

# Server starten mit:
# uvicorn server:app --reload
