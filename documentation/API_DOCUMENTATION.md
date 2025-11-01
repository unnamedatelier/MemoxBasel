# Server.py API Endpoint Documentation

## Complete Data Type Reference for All Endpoints

---

## 1. GET `/init`

**Method:** GET  
**Parameters:** Query parameters

### Input Data Type:
```python
session_uid: str  # Query parameter
```

### Example Request:
```bash
GET /init?session_uid=my-session-123
```

### Example with requests:
```python
requests.get("http://127.0.0.1:8000/init", params={"session_uid": "my-session-123"})
```

---

## 2. POST `/topic`

**Method:** POST  
**Content-Type:** application/json

### Input Data Type:
```python
{
    "session_uid": str,  # Required
    "topic_uid": str     # Required
}
```

### Example Request:
```json
POST /topic
Content-Type: application/json

{
    "session_uid": "my-session-123",
    "topic_uid": "math-notes"
}
```

### Example with requests:
```python
requests.post(
    "http://127.0.0.1:8000/topic",
    json={
        "session_uid": "my-session-123",
        "topic_uid": "math-notes"
    }
)
```

---

## 3. POST `/input`

**Method:** POST  
**Content-Type:** application/json

### Input Data Type:
```python
{
    "session_uid": str,  # Required
    "topic_uid": str,    # Required
    "text": str          # Required
}
```

### Example Request:
```json
POST /input
Content-Type: application/json

{
    "session_uid": "my-session-123",
    "topic_uid": "math-notes",
    "text": "Pythagorean theorem: a² + b² = c²"
}
```

### Example with requests:
```python
requests.post(
    "http://127.0.0.1:8000/input",
    json={
        "session_uid": "my-session-123",
        "topic_uid": "math-notes",
        "text": "Pythagorean theorem: a² + b² = c²"
    }
)
```

---

## 4. POST `/end-topic`

**Method:** POST  
**Content-Type:** application/json

### Input Data Type:
```python
{
    "session_uid": str,  # Required
    "topic_uid": str     # Required
}
```

### Example Request:
```json
POST /end-topic
Content-Type: application/json

{
    "session_uid": "my-session-123",
    "topic_uid": "math-notes"
}
```

### Example with requests:
```python
requests.post(
    "http://127.0.0.1:8000/end-topic",
    json={
        "session_uid": "my-session-123",
        "topic_uid": "math-notes"
    }
)
```

---

## 5. POST `/notify-update`

**Method:** POST  
**Content-Type:** application/json

### Input Data Type:
```python
{
    "session_uid": str,  # Required
    "topic_uid": str     # Required
}
```

### Example Request:
```json
POST /notify-update
Content-Type: application/json

{
    "session_uid": "my-session-123",
    "topic_uid": "math-notes"
}
```

### Example with requests:
```python
requests.post(
    "http://127.0.0.1:8000/notify-update",
    json={
        "session_uid": "my-session-123",
        "topic_uid": "math-notes"
    }
)
```

### What it does internally:
- Loads the topic file
- Extracts `formatted` data if available
- Forwards to frontend server at `http://localhost:3000/update` with:
```python
{
    "session_uid": str,
    "formatted": dict  # The categorized/formatted data
}
```

---

## 6. GET `/get-updates`

**Method:** GET  
**Parameters:** None

### Input Data Type:
```python
# No input required
```

### Example Request:
```bash
GET /get-updates
```

### Example with requests:
```python
requests.get("http://127.0.0.1:8000/get-updates")
```

### Response Data Type:
```python
{
    "updates": [
        {
            "session_uid": str,
            "topic_uid": str,
            "timestamp": str,  # ISO format datetime
            "data": {
                "session_uid": str,
                "topic_uid": str,
                "inputs": list[str],
                "checked": bool,
                "formatted": dict  # Optional, present after processing
            },
            "finished": bool  # Optional, true if file has _finished suffix
        }
    ],
    "count": int
}
```

---

## 7. GET `/get-topic-data`

**Method:** GET  
**Parameters:** Query parameters

### Input Data Type:
```python
session_uid: str  # Query parameter, required
topic_uid: str    # Query parameter, required
```

### Example Request:
```bash
GET /get-topic-data?session_uid=my-session-123&topic_uid=math-notes
```

### Example with requests:
```python
requests.get(
    "http://127.0.0.1:8000/get-topic-data",
    params={
        "session_uid": "my-session-123",
        "topic_uid": "math-notes"
    }
)
```

### Response Data Type:
```python
{
    "session_uid": str,
    "topic_uid": str,
    "data": {
        "session_uid": str,
        "topic_uid": str,
        "inputs": list[str],
        "checked": bool,
        "formatted": dict  # Optional, present after processing
    }
}
```

---

## Summary Table

| Endpoint | Method | Input Type | Required Fields |
|----------|--------|------------|----------------|
| `/init` | GET | Query params | `session_uid` (str) |
| `/topic` | POST | JSON body | `session_uid` (str), `topic_uid` (str) |
| `/input` | POST | JSON body | `session_uid` (str), `topic_uid` (str), `text` (str) |
| `/end-topic` | POST | JSON body | `session_uid` (str), `topic_uid` (str) |
| `/notify-update` | POST | JSON body | `session_uid` (str), `topic_uid` (str) |
| `/get-updates` | GET | None | None |
| `/get-topic-data` | GET | Query params | `session_uid` (str), `topic_uid` (str) |

---

## Data Type Definitions

### Topic File Structure (JSON):
```python
{
    "session_uid": str,
    "topic_uid": str,
    "inputs": list[str],  # Array of input strings
    "checked": bool,      # False initially, True after processing
    "formatted": dict     # Added by main.py after processing
}
```

### Formatted Data Structure (after main.py processing):
```python
{
    "Category Name 1": [
        "input text 1",
        "input text 2",
        ...
    ],
    "Category Name 2": [
        "input text 3",
        "input text 4",
        ...
    ]
}
```

### Example of Complete Topic File After Processing:
```json
{
  "session_uid": "my-session-123",
  "topic_uid": "math-notes",
  "inputs": [
    "Pythagorean theorem: a² + b² = c²",
    "Quadratic formula: x = (-b ± √(b²-4ac)) / 2a",
    "Area of circle: A = πr²"
  ],
  "checked": true,
  "formatted": {
    "Geometry": [
      "Pythagorean theorem: a² + b² = c²",
      "Area of circle: A = πr²"
    ],
    "Algebra": [
      "Quadratic formula: x = (-b ± √(b²-4ac)) / 2a"
    ]
  }
}
```

---

## Python Type Hints

If you want to use type hints in Python, here are the data types:

```python
from typing import Optional, List, Dict, Any

# /init
session_uid: str

# /topic
class TopicCreate:
    session_uid: str
    topic_uid: str

# /input
class InputCreate:
    session_uid: str
    topic_uid: str
    text: str

# /end-topic
class TopicEnd:
    session_uid: str
    topic_uid: str

# /notify-update
class NotifyUpdate:
    session_uid: str
    topic_uid: str

# /get-topic-data
session_uid: str
topic_uid: str

# Topic file content
class TopicData:
    session_uid: str
    topic_uid: str
    inputs: List[str]
    checked: bool
    formatted: Optional[Dict[str, List[str]]]
```

---

## JavaScript/TypeScript Types

For frontend integration:

```typescript
// /init
interface InitRequest {
    session_uid: string;
}

// /topic
interface TopicCreateRequest {
    session_uid: string;
    topic_uid: string;
}

// /input
interface InputCreateRequest {
    session_uid: string;
    topic_uid: string;
    text: string;
}

// /end-topic
interface EndTopicRequest {
    session_uid: string;
    topic_uid: string;
}

// /notify-update
interface NotifyUpdateRequest {
    session_uid: string;
    topic_uid: string;
}

// Topic data structure
interface TopicData {
    session_uid: string;
    topic_uid: string;
    inputs: string[];
    checked: boolean;
    formatted?: { [category: string]: string[] };
}

// /get-updates response
interface GetUpdatesResponse {
    updates: Array<{
        session_uid: string;
        topic_uid: string;
        timestamp: string;
        data: TopicData;
        finished?: boolean;
    }>;
    count: number;
}

// /get-topic-data response
interface GetTopicDataResponse {
    session_uid: string;
    topic_uid: string;
    data: TopicData;
}
```
