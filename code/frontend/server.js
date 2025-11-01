const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

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

app.post('/createsession', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).send('No name provided.');

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

    fetch('/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sessionId: '${name}',
            topic: topic,
            subtopic: subtopic,
            input: input
        })
    })
    .then(res => res.json())
    .then(() => {
        inputField.value = '';
    })
    .catch(err => console.error(err));
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
        body: JSON.stringify({ sessionId: '${name}', topicName })
    })
    .then(res => res.json())
    .then(() => {
        document.getElementById('topicInput').value = '';
        updateTopics();
    })
    .catch(err => console.error(err));
}

updateTopics();
setInterval(updateTopics, 5000);
</script>
</body>
</html>`;

    fs.writeFileSync(path.join(adminPath, 'index.html'), adminContent);
    res.json({ success: true });
});

app.post('/createTopic', (req, res) => {
    const { sessionId, topicName } = req.body;
    if (!sessionId) return res.status(400).send('Session ID required.');

    try {
        // Read test.json for the data
        const testJsonPath = path.join(__dirname, 'test.json');
        const testData = JSON.parse(fs.readFileSync(testJsonPath, 'utf8'));

        if (!testData.session_uid) {
            return res.status(400).send('No session_uid found in test.json');
        }

        // Read current session data using session_uid from test.json
        const topicsFilePath = path.join(sessionsPath, testData.session_uid, 'topics.json');
        if (!fs.existsSync(topicsFilePath)) {
            return res.status(404).send('Session not found');
        }

        let sessionData = JSON.parse(fs.readFileSync(topicsFilePath, 'utf8'));

        // Add all topics from test.json
        if (testData.formatted) {
            for (const [topic, strings] of Object.entries(testData.formatted)) {
                sessionData.topics[topic] = {
                    [testData.topic_uid]: strings
                };
            }
        }

        fs.writeFileSync(topicsFilePath, JSON.stringify(sessionData, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).send('Error saving: ' + error.message);
    }
});

// New endpoint to handle input submissions
app.post('/input', (req, res) => {
    const { sessionId, topic, subtopic, input } = req.body;
    if (!sessionId || !topic || !subtopic || !input) {
        return res.status(400).send('Missing required fields');
    }

    try {
        // Read test.json to get session_uid
        const testJsonPath = path.join(__dirname, 'test.json');
        const testData = JSON.parse(fs.readFileSync(testJsonPath, 'utf8'));

        // Store the input with session and topic information
        receivedInputs.push({
            session_uid: testData.session_uid,
            topic_uid: testData.topic_uid,
            input: input,
            timestamp: new Date().toISOString()
        });

        console.log('Received input:', receivedInputs[receivedInputs.length - 1]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).send('Error processing input: ' + error.message);
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
