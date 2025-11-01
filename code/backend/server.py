# server.py
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import json
import os
from datetime import datetime

app = FastAPI()

# Ensure sessions_folder exists
SESSIONS_FOLDER = "sessions_folder"
os.makedirs(SESSIONS_FOLDER, exist_ok=True)

# Store updated topics queue
updated_topics = []

@app.get("/init")
async def init(session_uid: str):
    """Create a new session folder for the given session UID"""
    session_path = os.path.join(SESSIONS_FOLDER, session_uid)
    
    # Create session folder
    os.makedirs(session_path, exist_ok=True)
    
    return JSONResponse(
        status_code=200,
        content={"message": f"Session {session_uid} created successfully", "session_uid": session_uid}
    )

@app.post("/topic")
async def create_topic(request: Request):
    """Create a new topic file within a session"""
    data = await request.json()
    session_uid = data.get("session_uid")
    topic_uid = data.get("topic_uid")
    
    if not session_uid:
        return JSONResponse(
            status_code=400,
            content={"error": "session_uid is required"}
        )
    
    if not topic_uid:
        return JSONResponse(
            status_code=400,
            content={"error": "topic_uid is required"}
        )
    
    session_path = os.path.join(SESSIONS_FOLDER, session_uid)
    
    # Check if session folder exists
    if not os.path.exists(session_path):
        return JSONResponse(
            status_code=404,
            content={"error": f"Session {session_uid} not found. Please call /init first."}
        )
    
    # Create topic file
    topic_file = os.path.join(session_path, f"{topic_uid}.json")
    with open(topic_file, "w") as f:
        json.dump({"session_uid": session_uid, "topic_uid": topic_uid, "inputs": [], "checked": False}, f, indent=2)
    
    return JSONResponse(
        status_code=200,
        content={"message": f"Topic {topic_uid} created in session {session_uid}", "session_uid": session_uid, "topic_uid": topic_uid}
    )

@app.post("/input")
async def add_input(request: Request):
    """Append text to the topic file within a session"""
    data = await request.json()
    session_uid = data.get("session_uid")
    topic_uid = data.get("topic_uid")
    text = data.get("text")
    
    if not session_uid:
        return JSONResponse(
            status_code=400,
            content={"error": "session_uid is required"}
        )
    
    if not topic_uid:
        return JSONResponse(
            status_code=400,
            content={"error": "topic_uid is required"}
        )
    
    if not text:
        return JSONResponse(
            status_code=400,
            content={"error": "text is required"}
        )
    
    topic_file = os.path.join(SESSIONS_FOLDER, session_uid, f"{topic_uid}.json")
    
    # Check if topic file exists
    if not os.path.exists(topic_file):
        return JSONResponse(
            status_code=404,
            content={"error": f"Topic {topic_uid} not found in session {session_uid}. Please call /topic first."}
        )
    
    # Read current content
    with open(topic_file, "r") as f:
        content = json.load(f)
    
    # Append new text
    content["inputs"].append(text)
    
    # Write updated content
    with open(topic_file, "w") as f:
        json.dump(content, f, indent=2)
    
    return JSONResponse(
        status_code=200,
        content={"message": f"Text added to topic {topic_uid} in session {session_uid}", "total_inputs": len(content["inputs"])}
    )

@app.post("/end-topic")
async def end_topic(request: Request):
    """Mark a topic as finished by renaming the file with _finished suffix"""
    data = await request.json()
    session_uid = data.get("session_uid")
    topic_uid = data.get("topic_uid")
    
    if not session_uid:
        return JSONResponse(
            status_code=400,
            content={"error": "session_uid is required"}
        )
    
    if not topic_uid:
        return JSONResponse(
            status_code=400,
            content={"error": "topic_uid is required"}
        )
    
    topic_file = os.path.join(SESSIONS_FOLDER, session_uid, f"{topic_uid}.json")
    
    # Check if topic file exists
    if not os.path.exists(topic_file):
        return JSONResponse(
            status_code=404,
            content={"error": f"Topic {topic_uid} not found in session {session_uid}."}
        )
    
    # Create new filename with _finished suffix
    new_topic_file = os.path.join(SESSIONS_FOLDER, session_uid, f"{topic_uid}_finished.json")
    
    # Check if finished file already exists
    if os.path.exists(new_topic_file):
        return JSONResponse(
            status_code=409,
            content={"error": f"Topic {topic_uid} has already been marked as finished."}
        )
    
    # Rename the file
    os.rename(topic_file, new_topic_file)
    
    return JSONResponse(
        status_code=200,
        content={
            "message": f"Topic {topic_uid} marked as finished in session {session_uid}", 
            "session_uid": session_uid, 
            "topic_uid": topic_uid,
            "new_filename": f"{topic_uid}_finished.json"
        }
    )

@app.post("/notify-update")
async def notify_update(request: Request):
    """Receive notification that a topic has been processed"""
    data = await request.json()
    session_uid = data.get("session_uid")
    topic_uid = data.get("topic_uid")
    
    if not session_uid or not topic_uid:
        return JSONResponse(
            status_code=400,
            content={"error": "session_uid and topic_uid are required"}
        )
    
    # Add to updated topics queue
    updated_topics.append({
        "session_uid": session_uid,
        "topic_uid": topic_uid,
        "timestamp": datetime.now().isoformat()
    })
    
    return JSONResponse(
        status_code=200,
        content={"message": "Update notification received", "session_uid": session_uid, "topic_uid": topic_uid}
    )

@app.get("/get-updates")
async def get_updates():
    """Get all updated topics and their data"""
    global updated_topics
    
    if not updated_topics:
        return JSONResponse(
            status_code=200,
            content={"updates": [], "count": 0}
        )
    
    # Retrieve data for all updated topics
    updates_data = []
    for update in updated_topics:
        session_uid = update["session_uid"]
        topic_uid = update["topic_uid"]
        topic_file = os.path.join(SESSIONS_FOLDER, session_uid, f"{topic_uid}.json")
        
        try:
            with open(topic_file, "r") as f:
                topic_data = json.load(f)
            
            updates_data.append({
                "session_uid": session_uid,
                "topic_uid": topic_uid,
                "timestamp": update["timestamp"],
                "data": topic_data
            })
        except FileNotFoundError:
            # File might have been renamed to _finished
            topic_file_finished = os.path.join(SESSIONS_FOLDER, session_uid, f"{topic_uid}_finished.json")
            try:
                with open(topic_file_finished, "r") as f:
                    topic_data = json.load(f)
                
                updates_data.append({
                    "session_uid": session_uid,
                    "topic_uid": topic_uid,
                    "timestamp": update["timestamp"],
                    "data": topic_data,
                    "finished": True
                })
            except FileNotFoundError:
                continue
    
    # Clear the queue after sending
    updated_topics = []
    
    return JSONResponse(
        status_code=200,
        content={"updates": updates_data, "count": len(updates_data)}
    )

@app.get("/get-topic-data")
async def get_topic_data(session_uid: str, topic_uid: str):
    """Get data for a specific topic"""
    if not session_uid or not topic_uid:
        return JSONResponse(
            status_code=400,
            content={"error": "session_uid and topic_uid are required"}
        )
    
    topic_file = os.path.join(SESSIONS_FOLDER, session_uid, f"{topic_uid}.json")
    
    # Check if topic file exists
    if not os.path.exists(topic_file):
        # Try with _finished suffix
        topic_file = os.path.join(SESSIONS_FOLDER, session_uid, f"{topic_uid}_finished.json")
        if not os.path.exists(topic_file):
            return JSONResponse(
                status_code=404,
                content={"error": f"Topic {topic_uid} not found in session {session_uid}"}
            )
    
    with open(topic_file, "r") as f:
        topic_data = json.load(f)
    
    return JSONResponse(
        status_code=200,
        content={"session_uid": session_uid, "topic_uid": topic_uid, "data": topic_data}
    )

# Server starten mit:
# uvicorn server:app --reload
