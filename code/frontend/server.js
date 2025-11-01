const express = require('express');
const path = require('path');
const fs = require('fs');
const { OpenAI } = require('openai');
const app = express();
const PORT = 3000;
const BACKEND_URL = 'http://localhost:8000';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
<title>${name} - Session</title>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<!-- Dark Mode Toggle -->
<div class="theme-toggle" onclick="toggleTheme()">
    <span class="theme-icon" id="themeIcon">🌙</span>
    <span id="themeText">Dark</span>
</div>

<!-- Message Container -->
<div id="messageContainer"></div>

<!-- Refresh Button -->
<button class="refresh-button" onclick="updateTopics()">🔄</button>

<div class="topics-page">
    <div class="page-header">
        <h1>${name}</h1>
        <p class="subtitle">View and contribute to topics</p>
    </div>
    
    <div class="topics-grid" id="topics-grid"></div>
    
    <div class="empty-state" id="empty-state" style="display: none;">
        <div class="empty-state-icon">📝</div>
        <p>No topics yet</p>
        <p style="font-size: 14px; margin-top: 8px;">Topics will appear here once they are created</p>
    </div>
</div>

<!-- Modal -->
<div class="modal-overlay" id="modal-overlay" onclick="closeModalOnOverlay(event)">
    <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header">
            <h2 id="modal-title">Topic</h2>
            <div class="modal-nav">
                <button onclick="navigateTopic(-1)" id="prev-btn">←</button>
                <button onclick="navigateTopic(1)" id="next-btn">→</button>
                <button class="modal-close" onclick="closeModal()">✕</button>
            </div>
        </div>
        <div class="modal-body">
            <div class="subtopics-list" id="subtopics-list"></div>
            <div class="input-container topic-input" id="topic-input-container">
                <input type="text" id="modal-input" placeholder="Add input to this topic..." />
                <button onclick="sendInput()">Send</button>
            </div>
        </div>
    </div>
</div>

<script>
let topicsData = {};
let currentTopicIndex = 0;
let topicKeys = [];
let currentTopic = null;

// Dark Mode
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    const text = document.getElementById('themeText');
    if (icon && text) {
        if (theme === 'dark') {
            icon.textContent = '☀️';
            text.textContent = 'Light';
        } else {
            icon.textContent = '🌙';
            text.textContent = 'Dark';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
});

function showMessage(text, type) {
    const container = document.getElementById('messageContainer');
    if (!container) return;
    const message = document.createElement('div');
    message.className = \`message \${type}\`;
    message.textContent = text;
    container.innerHTML = '';
    container.appendChild(message);
    setTimeout(() => {
        message.style.opacity = '0';
        setTimeout(() => {
            if (container.contains(message)) {
                container.removeChild(message);
            }
        }, 500);
    }, 3000);
}

function sendInput() {
    if (!currentTopic) return;
    const inputField = document.getElementById('modal-input');
    const input = inputField.value.trim();
    if (!input) {
        showMessage('Please enter some text', 'error');
        return;
    }

    fetch('${BACKEND_URL}/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            session_uid: '${name}',
            topic_uid: currentTopic,
            text: input
        })
    })
    .then(res => {
        if (!res.ok) throw new Error('Failed to send input');
        inputField.value = '';
        showMessage('Input sent successfully!', 'success');
    })
    .catch(err => {
        console.error(err);
        showMessage('Failed to send input', 'error');
    });
}

function updateTopics() {
    fetch('/sessions/${name}/topics.json')
        .then(res => res.json())
        .then(data => {
            topicsData = data.topics || {};
            topicKeys = Object.keys(topicsData);
            renderTopicsGrid();
        })
        .catch(err => console.error(err));
}

function renderTopicsGrid() {
    const grid = document.getElementById('topics-grid');
    const emptyState = document.getElementById('empty-state');
    
    if (topicKeys.length === 0) {
        grid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    grid.style.display = 'grid';
    emptyState.style.display = 'none';
    grid.innerHTML = '';
    
    topicKeys.forEach((topic, index) => {
        const subtopics = topicsData[topic];
        const subtopicCount = Object.keys(subtopics || {}).length;
        
        const card = document.createElement('div');
        card.className = 'topic-card';
        card.onclick = () => openModal(index);
        
        card.innerHTML = \`
            <h2>\${topic}</h2>
            <p class="subtopic-count">\${subtopicCount} subtopic\${subtopicCount !== 1 ? 's' : ''}</p>
        \`;
        
        grid.appendChild(card);
    });
}

function openModal(index) {
    currentTopicIndex = index;
    currentTopic = topicKeys[index];
    const subtopics = topicsData[currentTopic];
    
    document.getElementById('modal-title').textContent = currentTopic;
    
    const subtopicsList = document.getElementById('subtopics-list');
    subtopicsList.innerHTML = '';
    
    if (!subtopics || Object.keys(subtopics).length === 0) {
        subtopicsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No subtopics yet</p></div>';
    } else {
        for (const [subtopic, inputs] of Object.entries(subtopics)) {
            const subtopicItem = document.createElement('div');
            subtopicItem.className = 'subtopic-item';
            
            const header = document.createElement('div');
            header.className = 'subtopic-header';
            header.onclick = () => toggleSubtopic(subtopicItem);
            
            const title = document.createElement('h3');
            title.textContent = subtopic;
            
            const toggle = document.createElement('div');
            toggle.className = 'subtopic-toggle';
            toggle.textContent = '▼';
            
            header.appendChild(title);
            header.appendChild(toggle);
            
            const content = document.createElement('div');
            content.className = 'subtopic-content';
            
            const inputsDiv = document.createElement('div');
            inputsDiv.className = 'subtopic-inputs';
            
            const ul = document.createElement('ul');
            ul.className = 'input-list';
            
            inputs.forEach(input => {
                const li = document.createElement('li');
                li.className = 'input-item';
                li.textContent = input;
                ul.appendChild(li);
            });
            
            inputsDiv.appendChild(ul);
            content.appendChild(inputsDiv);
            
            subtopicItem.appendChild(header);
            subtopicItem.appendChild(content);
            subtopicsList.appendChild(subtopicItem);
        }
    }
    
    updateNavigationButtons();
    document.getElementById('modal-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function toggleSubtopic(element) {
    element.classList.toggle('active');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
    document.body.style.overflow = '';
    currentTopic = null;
}

function closeModalOnOverlay(event) {
    if (event.target.id === 'modal-overlay') {
        closeModal();
    }
}

function navigateTopic(direction) {
    currentTopicIndex += direction;
    if (currentTopicIndex < 0) currentTopicIndex = topicKeys.length - 1;
    if (currentTopicIndex >= topicKeys.length) currentTopicIndex = 0;
    openModal(currentTopicIndex);
}

function updateNavigationButtons() {
    document.getElementById('prev-btn').disabled = topicKeys.length <= 1;
    document.getElementById('next-btn').disabled = topicKeys.length <= 1;
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('modal-overlay');
    if (!modal.classList.contains('active')) return;
    
    if (e.key === 'Escape') {
        closeModal();
    } else if (e.key === 'ArrowLeft') {
        navigateTopic(-1);
    } else if (e.key === 'ArrowRight') {
        navigateTopic(1);
    }
});

updateTopics();
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
<!-- Dark Mode Toggle -->
<div class="theme-toggle" onclick="toggleTheme()">
    <span class="theme-icon" id="themeIcon">🌙</span>
    <span id="themeText">Dark</span>
</div>

<!-- Message Container -->
<div id="messageContainer"></div>

<!-- Refresh Button -->
<button class="refresh-button" onclick="updateTopics()">🔄</button>

<div class="topics-page">
    <div class="admin-header">
        <h1>Admin - ${name}</h1>
        <div class="admin-form">
            <input type="text" id="topicInput" placeholder="Enter new topic name" autocomplete="off">
            <button onclick="createTopic()">Create Topic</button>
        </div>
    </div>
    
    <div class="topics-grid" id="topics-grid"></div>
    
    <div class="empty-state" id="empty-state" style="display: none;">
        <div class="empty-state-icon">📝</div>
        <p>No topics yet</p>
        <p style="font-size: 14px; margin-top: 8px;">Create your first topic above</p>
    </div>
</div>

<!-- Modal -->
<div class="modal-overlay" id="modal-overlay" onclick="closeModalOnOverlay(event)">
    <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header">
            <h2 id="modal-title">Topic</h2>
            <div class="modal-nav">
                <button onclick="navigateTopic(-1)" id="prev-btn">←</button>
                <button onclick="navigateTopic(1)" id="next-btn">→</button>
                <button class="modal-close" onclick="closeModal()">✕</button>
            </div>
        </div>
        <div class="modal-body">
            <div class="subtopics-list" id="subtopics-list"></div>
            <div class="input-container topic-input" id="topic-input-container">
                <input type="text" id="modal-input" placeholder="Add input to this topic..." />
                <button onclick="sendInput()">Send</button>
            </div>
        </div>
    </div>
</div>

<script>
let topicsData = {};
let currentTopicIndex = 0;
let topicKeys = [];
let currentTopic = null;

// Dark Mode
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    const text = document.getElementById('themeText');
    if (icon && text) {
        if (theme === 'dark') {
            icon.textContent = '☀️';
            text.textContent = 'Light';
        } else {
            icon.textContent = '🌙';
            text.textContent = 'Dark';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
});

function showMessage(text, type) {
    const container = document.getElementById('messageContainer');
    if (!container) return;
    const message = document.createElement('div');
    message.className = \`message \${type}\`;
    message.textContent = text;
    container.innerHTML = '';
    container.appendChild(message);
    setTimeout(() => {
        message.style.opacity = '0';
        setTimeout(() => {
            if (container.contains(message)) {
                container.removeChild(message);
            }
        }, 500);
    }, 3000);
}

function createTopic() {
    const topicName = document.getElementById('topicInput').value.trim();
    if (!topicName) {
        showMessage('Please enter a topic name', 'error');
        return;
    }

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
        showMessage('Topic created successfully!', 'success');
        setTimeout(() => updateTopics(), 500);
    })
    .catch(err => {
        console.error(err);
        showMessage('Failed to create topic', 'error');
    });
}

function sendInput() {
    if (!currentTopic) return;
    const inputField = document.getElementById('modal-input');
    const input = inputField.value.trim();
    if (!input) {
        showMessage('Please enter some text', 'error');
        return;
    }

    fetch('${BACKEND_URL}/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            session_uid: '${name}',
            topic_uid: currentTopic,
            text: input
        })
    })
    .then(res => {
        if (!res.ok) throw new Error('Failed to send input');
        inputField.value = '';
        showMessage('Input sent successfully!', 'success');
    })
    .catch(err => {
        console.error(err);
        showMessage('Failed to send input', 'error');
    });
}

function updateTopics() {
    fetch('/sessions/${name}/topics.json')
        .then(res => res.json())
        .then(data => {
            topicsData = data.topics || {};
            topicKeys = Object.keys(topicsData);
            renderTopicsGrid();
        })
        .catch(err => console.error(err));
}

function renderTopicsGrid() {
    const grid = document.getElementById('topics-grid');
    const emptyState = document.getElementById('empty-state');
    
    if (topicKeys.length === 0) {
        grid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    grid.style.display = 'grid';
    emptyState.style.display = 'none';
    grid.innerHTML = '';
    
    topicKeys.forEach((topic, index) => {
        const subtopics = topicsData[topic];
        const subtopicCount = Object.keys(subtopics || {}).length;
        
        const card = document.createElement('div');
        card.className = 'topic-card';
        card.onclick = () => openModal(index);
        
        card.innerHTML = \`
            <h2>\${topic}</h2>
            <p class="subtopic-count">\${subtopicCount} subtopic\${subtopicCount !== 1 ? 's' : ''}</p>
        \`;
        
        grid.appendChild(card);
    });
}

function openModal(index) {
    currentTopicIndex = index;
    currentTopic = topicKeys[index];
    const subtopics = topicsData[currentTopic];
    
    document.getElementById('modal-title').textContent = currentTopic;
    
    const subtopicsList = document.getElementById('subtopics-list');
    subtopicsList.innerHTML = '';
    
    if (!subtopics || Object.keys(subtopics).length === 0) {
        subtopicsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No subtopics yet</p></div>';
    } else {
        for (const [subtopic, inputs] of Object.entries(subtopics)) {
            const subtopicItem = document.createElement('div');
            subtopicItem.className = 'subtopic-item';
            
            const header = document.createElement('div');
            header.className = 'subtopic-header';
            header.onclick = () => toggleSubtopic(subtopicItem);
            
            const title = document.createElement('h3');
            title.textContent = subtopic;
            
            const toggle = document.createElement('div');
            toggle.className = 'subtopic-toggle';
            toggle.textContent = '▼';
            
            header.appendChild(title);
            header.appendChild(toggle);
            
            const content = document.createElement('div');
            content.className = 'subtopic-content';
            
            const inputsDiv = document.createElement('div');
            inputsDiv.className = 'subtopic-inputs';
            
            const ul = document.createElement('ul');
            ul.className = 'input-list';
            
            inputs.forEach(input => {
                const li = document.createElement('li');
                li.className = 'input-item';
                li.textContent = input;
                ul.appendChild(li);
            });
            
            inputsDiv.appendChild(ul);
            content.appendChild(inputsDiv);
            
            subtopicItem.appendChild(header);
            subtopicItem.appendChild(content);
            subtopicsList.appendChild(subtopicItem);
        }
    }
    
    updateNavigationButtons();
    document.getElementById('modal-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function toggleSubtopic(element) {
    element.classList.toggle('active');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
    document.body.style.overflow = '';
    currentTopic = null;
}

function closeModalOnOverlay(event) {
    if (event.target.id === 'modal-overlay') {
        closeModal();
    }
}

function navigateTopic(direction) {
    currentTopicIndex += direction;
    if (currentTopicIndex < 0) currentTopicIndex = topicKeys.length - 1;
    if (currentTopicIndex >= topicKeys.length) currentTopicIndex = 0;
    openModal(currentTopicIndex);
}

function updateNavigationButtons() {
    document.getElementById('prev-btn').disabled = topicKeys.length <= 1;
    document.getElementById('next-btn').disabled = topicKeys.length <= 1;
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('modal-overlay');
    if (!modal.classList.contains('active')) return;
    
    if (e.key === 'Escape') {
        closeModal();
    } else if (e.key === 'ArrowLeft') {
        navigateTopic(-1);
    } else if (e.key === 'ArrowRight') {
        navigateTopic(1);
    }
});

updateTopics();
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
    console.log(formatted)
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

        // Merge topics instead of replacing - accumulate all topics
        sessionData.topics = { ...sessionData.topics, ...formatted };

        // Write updated data back to file
        fs.writeFileSync(topicsFilePath, JSON.stringify(sessionData, null, 2));

        res.json({ success: true });
    } catch (error) {
        console.error('Error processing update:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.post('/chat', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required.' });

    try {
    const response = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
            {
                role: "system",
                content: `You are an expert at summarizing conferences and discussions. 
                        You will receive a large JSON containing detailed information about topics, speakers, 
                        contributions, and discussions. 
                        Your task is to produce a clear and structured summary that highlights the key points, 
                        decisions, and important topics. 
                        Only return the summary text—do not include explanations, JSON, code, or any other content.`
            },
            { role: "user", content: message }
        ]
    });

        const output = response.choices[0].message.content;
        res.json({ response: output });
    } catch (err) {
        console.error('GPT error:', err);
        res.status(500).json({ error: 'Failed to get response from GPT' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
