from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
from openai import OpenAI
from dotenv import load_dotenv
from collections import Counter
import json
import os
import requests
import re
from datetime import datetime
import asyncio
import math

load_dotenv()

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

#Configuration
FRONTEND_URL, SESSIONS_FOLDER, OPENAI_API_KEY, CHECK_INTERVAL = "http://localhost:3000", "sessions_folder", os.getenv("OPENAI_API_KEY"), 10 #seconds

os.makedirs(SESSIONS_FOLDER, exist_ok=True)

updated_topics, processing_active = [], True #Global state

#CATEGORIZATION FUNCTIONS
def categorize_texts(inputs, n_clusters=None):
    """Categorize texts using embeddings and clustering"""
    embedder = SentenceTransformer("all-MiniLM-L6-v2")
    embeddings = embedder.encode(inputs)
    if n_clusters is None: n_clusters = int(1.5 * math.log(len(inputs)+1) / math.log(3) + 2.1) # +1.6 +0.5 because of int
    
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    labels, client, results = kmeans.fit_predict(embeddings), OpenAI(api_key=OPENAI_API_KEY), {}

    for cluster_id in range(n_clusters):
        cluster_texts = [inputs[i] for i in range(len(inputs)) if labels[i] == cluster_id]
        if not cluster_texts: continue
        
        title = generate_title_with_gpt(cluster_texts, client)
        
        original_title, counter = title, 1 #Handle duplicate titles
        while title in results: title, counter = f"{original_title} ({counter})", counter + 1
        
        results[title] = cluster_texts

    return results

def generate_title_with_gpt(texts, client): #Generate category title using GPT
    sample_texts = texts[:5] if len(texts) > 5 else texts
    combined_text = "\n".join(f"- {text[:200]}" for text in sample_texts)
    
    prompt = f"""Analyze these text snippets and generate a short, descriptive category title (2-4 words maximum).

Text snippets:
{combined_text}

Requirements:
- Maximum 4 words
- Capitalize each word
- Be specific and descriptive
- No articles (a, an, the)
- Examples: "Machine Learning Research", "Climate Policy", "Space Exploration"

Category title:"""

    try:
        response = client.chat.completions.create(model="gpt-4o-mini", messages=[{"role": "system", "content": "You are a text categorization expert. Generate concise, accurate category titles."}, {"role": "user", "content": prompt}])
        
        title = response.choices[0].message.content.strip().strip('"\'')
        title = ' '.join(word.capitalize() for word in title.split())
        
        if len(title.split()) > 4 or not title: return extract_fallback_title(texts)
        
        return title
        
    except Exception as e:
        print(f"GPT API error: {e}")
        return extract_fallback_title(texts)

def extract_fallback_title(texts): #Fallback title generation if GPT fails
    combined = " ".join(texts)
    words = combined.lower().split()
    stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'them', 'their', 'its'}
    
    word_freq = Counter()
    for word in words:
        clean = re.sub(r'[^\w]', '', word)
        if clean not in stop_words and len(clean) > 3 and not clean.isdigit(): word_freq[clean] += 1
    if not word_freq: return "General Topics"
    
    top_words = [word for word, _ in word_freq.most_common(2)]
    return ' '.join(word.capitalize() for word in top_words)

def process_topic_file(file_path): #Process a single topic file
    try:
        with open(file_path) as f: data = json.load(f)
        if data.get('checked', False): return False

        inputs = data.get('inputs', [])
        if not inputs: return False
        
        print(f"\nProcessing: {file_path}")
        input_count, data['formatted'] = len(inputs), categorize_texts(inputs) #Update file with results
        
        current_input_count = len(data.get('inputs', [])) #Check if inputs changed during processing
        if current_input_count == input_count:
            data['checked'] = True
        else:
            data['checked'] = False
            print(f"  ⚠ Input count changed ({input_count} -> {current_input_count}), will reprocess")
        
        with open(file_path, "w") as f: json.dump(data, f, indent=2, ensure_ascii=False)
        
        session_uid, topic_uid = data.get('session_uid'), data.get('topic_uid') #Notify about update
        
        if session_uid and topic_uid:
            updated_topics.append({"session_uid": session_uid, "topic_uid": topic_uid, "timestamp": datetime.now().isoformat()})
            if 'formatted' in data: forward_to_frontend(session_uid, {topic_uid: data['formatted']}) #Forward to frontend
        
        return True
        
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def forward_to_frontend(session_uid, formatted_data): #Forward formatted data to frontend
    try:
        response = requests.post(f"{FRONTEND_URL}/update", json={"session_uid": session_uid, "formatted": formatted_data}, timeout=5)
        if response.status_code == 200:
            print(f"  ✓ Forwarded to frontend: {session_uid}")
            return True
        else:
            print(f"  ✗ Frontend forward failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"  ✗ Frontend connection error: {e}")
        return False

async def background_processor(): #Background task to process unchecked files
    print("Background processor started")
    while processing_active:
        try:
            processed, skipped = 0, 0
            
            for folder in os.listdir(SESSIONS_FOLDER):
                folder_path = os.path.join(SESSIONS_FOLDER, folder)
                
                if not os.path.isdir(folder_path): continue
                
                for file in os.listdir(folder_path):
                    if file.endswith(".json") and not file.endswith("_finished.json"): 
                        file_path = os.path.join(folder_path, file)
                        
                        if process_topic_file(file_path): processed += 1
                        else: skipped += 1
            
            if processed > 0 or skipped > 0: print(f"Summary: {processed} processed, {skipped} skipped")
            
        except Exception as e: print(f"Background processor error: {e}")
        await asyncio.sleep(CHECK_INTERVAL)

@app.on_event("startup")
async def startup_event(): #Start background processing on server startup
    asyncio.create_task(background_processor())

#API ENDPOINTS
@app.post("/init")
async def init(request: Request): #Create a new session folder
    data = await request.json()
    session_uid = data.get("session_uid")
    if not session_uid: return JSONResponse(status_code=400, content={"error": "session_uid is required"})
    
    session_path = os.path.join(SESSIONS_FOLDER, session_uid)
    os.makedirs(session_path, exist_ok=True)
    
    return JSONResponse(status_code=200, content={"message": f"Session {session_uid} created", "session_uid": session_uid})

@app.post("/topic")
async def create_topic(request: Request): #Create a new topic file within a session
    data = await request.json()
    session_uid, topic_uid = data.get("session_uid"), data.get("topic_uid")
    if not session_uid or not topic_uid: return JSONResponse(status_code=400, content={"error": "session_uid and topic_uid required"})
    
    session_path = os.path.join(SESSIONS_FOLDER, session_uid)
    if not os.path.exists(session_path): return JSONResponse(status_code=404, content={"error": f"Session {session_uid} not found"})
    
    topic_file = os.path.join(session_path, f"{topic_uid}.json")
    topic_data = {"session_uid": session_uid, "topic_uid": topic_uid, "inputs": [], "checked": False}
    
    with open(topic_file, "w") as f: json.dump(topic_data, f, indent=2)
    
    initial_formatted = {topic_uid: {"Waiting for inputs": ["Add inputs to see categorized content."]}} #Send initial placeholder to frontend
    forward_success = forward_to_frontend(session_uid, initial_formatted)
    
    return JSONResponse(status_code=200, content={"message": f"Topic {topic_uid} created", "session_uid": session_uid, "topic_uid": topic_uid, "forwarded_to_frontend": forward_success})

@app.post("/input")
async def add_input(request: Request): #Add input text to a topic
    data = await request.json()
    session_uid, topic_uid, text = data.get("session_uid"), data.get("topic_uid"), data.get("text")
    if not session_uid or not topic_uid or not text: return JSONResponse(status_code=400, content={"error": "session_uid, topic_uid and text required"})
    
    topic_file = os.path.join(SESSIONS_FOLDER, session_uid, f"{topic_uid}.json")
    if not os.path.exists(topic_file): return JSONResponse(status_code=404, content={"error": f"Topic {topic_uid} not found"})
    
    with open(topic_file, "r") as f: content = json.load(f)
    
    content["inputs"].append(text)
    content["checked"] = False  #Mark for reprocessing
    
    with open(topic_file, "w") as f: json.dump(content, f, indent=2)
    
    return JSONResponse(status_code=200, content={"message": f"Text added to topic {topic_uid}", "total_inputs": len(content["inputs"])})

@app.post("/end-topic")
async def end_topic(request: Request): #Mark a topic as finished
    data = await request.json()
    session_uid, topic_uid = data.get("session_uid"), data.get("topic_uid")
    if not session_uid or not topic_uid: return JSONResponse(status_code=400, content={"error": "session_uid and topic_uid required"})
    
    topic_file = os.path.join(SESSIONS_FOLDER, session_uid, f"{topic_uid}.json")
    if not os.path.exists(topic_file): return JSONResponse(status_code=404, content={"error": f"Topic {topic_uid} not found"})
    
    new_topic_file = os.path.join(SESSIONS_FOLDER, session_uid, f"{topic_uid}_finished.json")
    if os.path.exists(new_topic_file): return JSONResponse(status_code=409, content={"error": f"Topic {topic_uid} already finished"})
    
    os.rename(topic_file, new_topic_file)
    return JSONResponse(status_code=200, content={"message": f"Topic {topic_uid} marked as finished", "session_uid": session_uid, "topic_uid": topic_uid})

@app.get("/get-updates")
async def get_updates(): #Get all updated topics
    global updated_topics
    
    if not updated_topics: return JSONResponse(status_code=200, content={"updates": [], "count": 0})
    
    updates_data = []
    for update in updated_topics:
        session_uid, topic_uid = update["session_uid"], update["topic_uid"]
        topic_file = os.path.join(SESSIONS_FOLDER, session_uid, f"{topic_uid}.json")
        
        try:
            with open(topic_file, "r") as f: topic_data = json.load(f)
            
            updates_data.append({"session_uid": session_uid, "topic_uid": topic_uid, "timestamp": update["timestamp"], "data": topic_data})
        except FileNotFoundError:
            topic_file_finished = os.path.join(SESSIONS_FOLDER, session_uid, f"{topic_uid}_finished.json")
            try:
                with open(topic_file_finished, "r") as f: topic_data = json.load(f)
                
                updates_data.append({"session_uid": session_uid, "topic_uid": topic_uid, "timestamp": update["timestamp"], "data": topic_data, "finished": True})
            except FileNotFoundError: continue
    
    updated_topics = []

    return JSONResponse(status_code=200, content={"updates": updates_data, "count": len(updates_data)})

@app.get("/get-topic-data")
async def get_topic_data(session_uid: str, topic_uid: str): #Get data for a specific topic
    if not session_uid or not topic_uid: return JSONResponse(status_code=400, content={"error": "session_uid and topic_uid required"})
    
    topic_file = os.path.join(SESSIONS_FOLDER, session_uid, f"{topic_uid}.json")
    if not os.path.exists(topic_file):
        topic_file = os.path.join(SESSIONS_FOLDER, session_uid, f"{topic_uid}_finished.json")
        if not os.path.exists(topic_file): return JSONResponse(status_code=404, content={"error": f"Topic {topic_uid} not found"})
    
    with open(topic_file, "r") as f: topic_data = json.load(f)
    
    return JSONResponse(status_code=200, content={"session_uid": session_uid, "topic_uid": topic_uid, "data": topic_data})

@app.get("/status")
async def status(): return JSONResponse(status_code=200, content={"status": "running", "processing_active": processing_active, "check_interval": CHECK_INTERVAL, "pending_updates": len(updated_topics)}) #Get server status

# Start mit: uvicorn combined_server:app --reload