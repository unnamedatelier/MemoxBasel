# Testing Guide for MemoxBasel Backend System

## Quick Start - Running Everything

### Step 1: Start the Backend API Server (Terminal 1)
```powershell
cd c:\Users\Yuanh\OneDrive\Desktop\MemoxBasel\code\backend
uvicorn server:app --reload
```
Expected output: `Uvicorn running on http://127.0.0.1:8000`

### Step 2: Start the Processing Engine (Terminal 2)
```powershell
cd c:\Users\Yuanh\OneDrive\Desktop\MemoxBasel\code\backend
python main.py
```
Expected output: `Starting periodic processing (every 10 seconds)...`

### Step 3: (Optional) Start the Frontend Server (Terminal 3)
```powershell
cd c:\Users\Yuanh\OneDrive\Desktop\MemoxBasel\code\frontend
node server.js
```
Expected output: `Server läuft auf http://localhost:3000`

### Step 4: Run the Comprehensive Test (Terminal 4)
```powershell
cd c:\Users\Yuanh\OneDrive\Desktop\MemoxBasel\code\backend
python test_full_system.py
```

---

## Manual Testing Individual Components

### Test 1: Basic Input/Output Flow
```powershell
# Run the simple test
python input_function.py
```
This will:
- Create a session
- Create topics
- Add inputs
- End topics

### Test 2: Check Updates
```powershell
# Run the update checker
python example_get_updates.py
```
This demonstrates how server.js polls for updates.

---

## What Each Component Does

### server.py (FastAPI Backend)
**Endpoints:**
- `GET /init?session_uid=XXX` - Create session folder
- `POST /topic` - Create topic file (with checked=false)
- `POST /input` - Add text to topic
- `POST /end-topic` - Rename topic to _finished
- `POST /notify-update` - Receive processing notification & forward to frontend
- `GET /get-updates` - Get all pending updates
- `GET /get-topic-data` - Get specific topic data

### main.py (Processing Engine)
**Functions:**
- Runs every 10 seconds
- Finds unchecked topics
- Categorizes inputs using ML
- Marks topics as checked
- Notifies server.py

### Data Flow
```
1. User adds inputs → /input
2. main.py processes → categorizes texts
3. main.py notifies → /notify-update
4. server.py forwards → localhost:3000/update
5. Frontend updates → topics.json
6. User sees results → webpage auto-refresh
```

---

## Checking Results

### 1. Check Session Files
```powershell
# List session folders
dir code\backend\sessions_folder

# View a topic file
cat code\backend\sessions_folder\test-session-456\math-notes.json
```

### 2. Check if Processing Happened
Look for these fields in topic JSON files:
- `"checked": true` - Topic was processed
- `"formatted": {...}` - Categorized results
- `"inputs": [...]` - Original inputs

### 3. Check Frontend (if running)
Visit: http://localhost:3000/sessions/test-session-456/topics.json

### 4. Monitor Terminal Outputs

**main.py terminal should show:**
```
Processing: code/backend/sessions_folder/test-session-456/math-notes.json
✓ Notified server about update: test-session-456/math-notes
```

**server.py terminal should show:**
```
✓ Forwarded update to frontend: test-session-456
```

---

## Troubleshooting

### Issue: "Could not connect to server"
**Solution:** Make sure server.py is running in another terminal

### Issue: "No updates found"
**Solution:** 
1. Check if main.py is running
2. Wait at least 10 seconds for processing cycle
3. Verify topics have `"checked": false`

### Issue: "Could not connect to frontend server"
**Solution:** 
- Frontend is optional for testing backend
- If needed, start with `node server.js` in frontend folder

### Issue: Topics not being processed
**Solution:**
1. Check topic file has `"checked": false`
2. Check file doesn't end with `_finished.json`
3. Verify main.py is running and checking every 10 seconds
4. Check main.py terminal for error messages

---

## Expected Test Results

After running `test_full_system.py`, you should see:

1. ✓ Session created
2. ✓ 3 topics created (math-notes, science-notes, misc)
3. ✓ Multiple inputs added to each topic
4. ✓ Topic data retrieved successfully
5. ✓ After waiting, topics are processed
6. ✓ Updates are forwarded to frontend
7. ✓ Topic marked as finished

---

## File Structure After Testing
```
sessions_folder/
└── test-session-demo/
    ├── math-notes.json (with checked=true, formatted data)
    ├── science-notes_finished.json (renamed after /end-topic)
    └── misc.json (with checked=true, formatted data)
```

---

## Clean Up After Testing
```powershell
# Remove test session
Remove-Item -Recurse code\backend\sessions_folder\test-session-demo
Remove-Item -Recurse code\backend\sessions_folder\test-session-456

# Or delete all sessions
Remove-Item -Recurse code\backend\sessions_folder\*
```
