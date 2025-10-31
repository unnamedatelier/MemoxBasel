# server.py
from fastapi import FastAPI, Request
import json
import os

app = FastAPI()

@app.get("/init")
async def init(number: int):
    filename = f"{number}.json"
    with open(filename, "w") as f:
        json.dump({"uid": number, "inputs": []}, f)
    return {"message": f"Datei {filename} erstellt"}

@app.post("/input")
async def add_input(request: Request):
    data = await request.json()
    uid = data.get("uid")
    text = data.get("text")
    filename = f"{uid}.json"

    if not os.path.exists(filename):
        return {"error": "Datei nicht gefunden"}

    with open(filename, "r") as f:
        content = json.load(f)

    content["inputs"].append(text)

    with open(filename, "w") as f:
        json.dump(content, f)

    return {"message": f"Text zu {filename} hinzugefügt"}

# Server starten mit:
# uvicorn server:app --reload
