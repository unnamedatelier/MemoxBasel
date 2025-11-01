const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;
const BACKEND_URL = 'http://localhost:8000';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store inputs temporarily (will be replaced with proper storage later)
let receivedInputs = [];

// Clear folder on startup
const sessionsPath = path.join(__dirname, 'public', 'sessions');
if (fs.existsSync(sessionsPath)) {
    fs.rmSync(sessionsPath, { recursive: true, force: true });
}
fs.mkdirSync(sessionsPath, { recursive: true });

app.post('/createsession', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).send('No name provided.');

    try {
        const initResponse = await fetch(`${BACKEND_URL}/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_uid: name })
        });


        if (!initResponse.ok) {
            throw new Error(`Backend initialization failed: ${initResponse.statusText}`);
        }

        const dirPath = path.join(sessionsPath, name);
        if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

        // Create empty topics file
        const topicsFilePath = path.join(dirPath, 'topics.json');
        fs.writeFileSync(topicsFilePath, JSON.stringify({ topics: {} }, null, 2));

        const fileContent = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${name}</title>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<h1>${name}</h1>
<div id="topics-container"></div>
<script>
function sendInput(topic, subtopic) {
    const inputField = document.getElementById(\`input-\${topic}-\${subtopic}\`);
    const input = inputField.value.trim();
    if (!input) return;

    fetch('${BACKEND_URL}/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            session_uid: '${name}',
            topic_name: topic,
            text: input
        })
    })
    .then(res => {
        if (!res.ok) throw new Error('Failed to send input to backend');
        inputField.value = '';
    })
    .catch(err => {
        console.error(err);
        alert('Failed to send input. Please try again.');
    });
}

function updateTopics() {
    fetch('/sessions/${name}/topics.json')
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('topics-container');
            container.innerHTML = '';
            for (const [topic, subtopics] of Object.entries(data.topics)) {
                const topicDiv = document.createElement('div');
                topicDiv.className = 'topic';
                const topicTitle = document.createElement('h2');
                topicTitle.textContent = topic;
                topicDiv.appendChild(topicTitle);

                for (const [subtopic, strings] of Object.entries(subtopics)) {
                    const subDiv = document.createElement('div');
                    subDiv.className = 'subtopic';
                    const subTitle = document.createElement('h3');
                    subTitle.textContent = subtopic;
                    subDiv.appendChild(subTitle);
                    const ul = document.createElement('ul');
                    strings.forEach(str => {
                        const li = document.createElement('li');
                        li.textContent = str;
                        ul.appendChild(li);
                    });
                    subDiv.appendChild(ul);

                    // Add input field and send button for each subtopic
                    const inputDiv = document.createElement('div');
                    inputDiv.className = 'input-container';
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.id = \`input-\${topic}-\${subtopic}\`;
                    input.placeholder = 'Enter your input...';
                    const sendButton = document.createElement('button');
                    sendButton.textContent = 'Send';
                    sendButton.onclick = () => sendInput(topic, subtopic);
                    inputDiv.appendChild(input);
                    inputDiv.appendChild(sendButton);
                    subDiv.appendChild(inputDiv);

                    topicDiv.appendChild(subDiv);
                }
                container.appendChild(topicDiv);
            }
        })
        .catch(err => console.error(err));
}
updateTopics();
setInterval(updateTopics, 5000);
</script>
</body>
</html>`;

        fs.writeFileSync(path.join(dirPath, 'index.html'), fileContent);

        // Admin page
        const adminPath = path.join(dirPath, 'admin');
        if (!fs.existsSync(adminPath)) fs.mkdirSync(adminPath, { recursive: true });

        const adminContent = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin - ${name}</title>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<h1>Admin - ${name}</h1>
<div>
<input type="text" id="topicInput" placeholder="New Topic">
<button onclick="createTopic()">Create Topic</button>
</div>
<div id="topics-container"></div>

<script>
function updateTopics() {
    fetch('/sessions/${name}/topics.json')
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('topics-container');
            container.innerHTML = '';
            for (const [topic, subtopics] of Object.entries(data.topics)) {
                const topicDiv = document.createElement('div');
                topicDiv.className = 'topic';
                const topicTitle = document.createElement('h2');
                topicTitle.textContent = topic;
                topicDiv.appendChild(topicTitle);

                for (const [subtopic, strings] of Object.entries(subtopics)) {
                    const subDiv = document.createElement('div');
                    subDiv.className = 'subtopic';
                    const subTitle = document.createElement('h3');
                    subTitle.textContent = subtopic;
                    subDiv.appendChild(subTitle);
                    const ul = document.createElement('ul');
                    strings.forEach(str => {
                        const li = document.createElement('li');
                        li.textContent = str;
                        ul.appendChild(li);
                    });
                    subDiv.appendChild(ul);

                    // Add input field and send button for each subtopic
                    const inputDiv = document.createElement('div');
                    inputDiv.className = 'input-container';
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.id = \`input-\${topic}-\${subtopic}\`;
                    input.placeholder = 'Enter your input...';
                    const sendButton = document.createElement('button');
                    sendButton.textContent = 'Send';
                    sendButton.onclick = () => sendInput(topic, subtopic);
                    inputDiv.appendChild(input);
                    inputDiv.appendChild(sendButton);
                    subDiv.appendChild(inputDiv);

                    topicDiv.appendChild(subDiv);
                }
                container.appendChild(topicDiv);
            }
        })
        .catch(err => console.error(err));
}

function createTopic() {
    const topicName = document.getElementById('topicInput').value;
    if (!topicName) return alert('Please enter a topic name.');

    fetch('/createTopic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            sessionId: '${name}', 
            topicName: topicName 
        })
    })
    .then(res => {
        if (!res.ok) throw new Error('Failed to create topic');
        return res.json();
    })
    .then(() => {
        document.getElementById('topicInput').value = '';
        updateTopics();
    })
    .catch(err => {
        console.error(err);
        alert('Failed to create topic. Please try again.');
    });
}

function sendInput(topic, subtopic) {
    const inputField = document.getElementById(\`input-\${topic}-\${subtopic}\`);
    const input = inputField.value.trim();
    if (!input) return;

    fetch('${BACKEND_URL}/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            session_uid: '${name}',
            topic_name: topic,
            text: input
        })
    })
    .then(res => {
        if (!res.ok) throw new Error('Failed to send input to backend');
        inputField.value = '';
    })
    .catch(err => {
        console.error(err);
        alert('Failed to send input. Please try again.');
    });
}

updateTopics();
setInterval(updateTopics, 5000);
</script>
</body>
</html>`;

        fs.writeFileSync(path.join(adminPath, 'index.html'), adminContent);
        res.json({ success: true });
    } catch (error) {
        res.status(500).send('Error: ' + error.message);
    }
});

app.post('/createTopic', (req, res) => {
    const { sessionId, topicName } = req.body;
    if (!sessionId || !topicName) {
        return res.status(400).json({ error: 'Session ID and topic name required.' });
    }

    // Send to Python backend with the correct format
    fetch(`${BACKEND_URL}/topic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            session_uid: sessionId,
            topic_uid: topicName,
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Backend returned ${response.status}`);
        }
        return res.json({ success: true });
    })
    .catch(error => {
        console.error('Error creating topic:', error);
        res.status(500).json({ error: 'Failed to create topic' });
    });
});

// New endpoint to receive updates from Python server
app.post('/update', (req, res) => {
    const { session_uid, formatted } = req.body;
    if (!session_uid || !formatted) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const topicsFilePath = path.join(sessionsPath, session_uid, 'topics.json');
        if (!fs.existsSync(topicsFilePath)) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Read current topics file
        let sessionData = JSON.parse(fs.readFileSync(topicsFilePath, 'utf8'));

        // Update topics with the new formatted data
        sessionData.topics = formatted;

        // Write updated data back to file
        fs.writeFileSync(topicsFilePath, JSON.stringify(sessionData, null, 2));

        res.json({ success: true });
    } catch (error) {
        console.error('Error processing update:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
