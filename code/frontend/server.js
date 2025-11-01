require('dotenv').config();
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
    <span class="theme-icon" id="themeIcon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/>
        </svg>
    </span>
    <span id="themeText">Dark</span>
</div>

<!-- Message Container -->
<div id="messageContainer"></div>

<!-- Refresh Button -->
<button class="refresh-button" onclick="updateTopics()" title="Refresh Topics">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 12C4 7.58172 7.58172 4 12 4C14.5264 4 16.7792 5.17108 18.2454 7M20 12C20 16.4183 16.4183 20 12 20C9.47362 20 7.22082 18.8289 5.75463 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M18 3V7H14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6 21V17H10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
</button>

<!-- QR Code Button -->
<button class="qr-code-button" onclick="showQRCode()" title="Show QR Code">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3H9V9H3V3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M15 3H21V9H15V3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M3 15H9V21H3V15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M15 15H21V21H15V15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
</button>

<!-- AI Summary Button -->
<button class="ai-summary-button" onclick="generateAISummary()" title="Generate AI Summary">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" fill="currentColor"/>
        <path d="M19 4L19.5 6.5L22 7L19.5 7.5L19 10L18.5 7.5L16 7L18.5 6.5L19 4Z" fill="currentColor"/>
        <path d="M19 14L19.5 16.5L22 17L19.5 17.5L19 20L18.5 17.5L16 17L18.5 16.5L19 14Z" fill="currentColor"/>
    </svg>
</button>

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
                <button onclick="refreshModalContent()" title="Refresh topics">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 12C4 7.58172 7.58172 4 12 4C14.5264 4 16.7792 5.17108 18.2454 7M20 12C20 16.4183 16.4183 20 12 20C9.47362 20 7.22082 18.8289 5.75463 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <path d="M18 3V7H14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M6 21V17H10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
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

<!-- AI Summary Modal -->
<div class="modal-overlay" id="ai-summary-modal" onclick="closeAISummaryModal(event)">
    <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header">
            <h2>✨ AI Summary</h2>
            <button class="modal-close" onclick="closeAISummaryModal()">✕</button>
        </div>
        <div class="modal-body">
            <div id="ai-summary-content" style="white-space: pre-wrap; line-height: 1.8; font-size: 15px;"></div>
        </div>
    </div>
</div>

<!-- QR Code Modal -->
<div class="modal-overlay" id="qr-code-modal" onclick="closeQRCodeModal(event)">
    <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header">
            <h2>📱 QR Code</h2>
            <button class="modal-close" onclick="closeQRCodeModal()">✕</button>
        </div>
        <div class="modal-body">
            <div id="qr-code-container" style="display: flex; justify-content: center; align-items: center; padding: 20px;"></div>
            <p style="text-align: center; margin-top: 20px; color: var(--text-secondary);">Scan to open the session</p>
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
            // Sun icon for light mode
            icon.innerHTML = \`
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="4" fill="currentColor"/>
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            \`;
            text.textContent = 'Light';
        } else {
            // Moon icon for dark mode
            icon.innerHTML = \`
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/>
                </svg>
            \`;
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
        // Sortiere Subtopics nach Anzahl der Inputs (absteigend - mehr Inputs = weiter oben)
        const sortedSubtopics = Object.entries(subtopics).sort((a, b) => b[1].length - a[1].length);
        
        for (const [subtopic, inputs] of sortedSubtopics) {
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

// Refresh Modal Function
function refreshModal() {
    if (currentTopic) {
        fetch('/getTopics/${name}')
            .then(res => res.json())
            .then(data => {
                topicsData = data;
                topicKeys = Object.keys(topicsData);
                openModal(currentTopicIndex);
                showMessage('Topics refreshed', 'success');
            })
            .catch(err => {
                console.error(err);
                showMessage('Failed to refresh topics', 'error');
            });
    }
}

// AI Summary Modal Functions
function closeAISummaryModal(event) {
    if (event && event.target.id !== 'ai-summary-modal') return;
    const modal = document.getElementById('ai-summary-modal');
    modal.classList.remove('active');
}

// AI Summary Function
async function generateAISummary() {
    if (Object.keys(topicsData).length === 0) {
        showMessage('No topics to summarize', 'error');
        return;
    }
    
    showMessage('Generating AI summary...', 'success');
    
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: JSON.stringify(topicsData, null, 2)
            })
        });
        
        if (!response.ok) throw new Error('Failed to generate summary');
        
        const data = await response.json();
        
        // Display summary in modal
        const summaryContent = document.getElementById('ai-summary-content');
        summaryContent.textContent = data.response;
        
        const modal = document.getElementById('ai-summary-modal');
        modal.classList.add('active');
        
        showMessage('Summary generated successfully!', 'success');
    } catch (err) {
        console.error(err);
        showMessage('Failed to generate summary', 'error');
    }
}

// Refresh Modal Content Function - reloads topics and reopens modal
function refreshModalContent() {
    fetch('/sessions/${name}/topics.json')
        .then(res => res.json())
        .then(data => {
            topicsData = data.topics || {};
            topicKeys = Object.keys(topicsData);
            renderTopicsGrid();
            // Re-open the current modal with refreshed data
            if (currentTopic) {
                openModal(currentTopicIndex);
            }
            showMessage('Topics refreshed', 'success');
        })
        .catch(err => {
            console.error(err);
            showMessage('Failed to refresh topics', 'error');
        });
}

// QR Code functions
function showQRCode() {
    const container = document.getElementById('qr-code-container');
    container.innerHTML = ''; // Clear previous QR code
    
    // Get the current URL without /admin
    const currentUrl = window.location.href.replace('/admin', '');
    
    // Generate QR code
    QRCode.toCanvas(container, currentUrl, {
        width: 256,
        margin: 2,
        color: {
            dark: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim(),
            light: getComputedStyle(document.documentElement).getPropertyValue('--background').trim()
        }
    }, function (error) {
        if (error) {
            console.error(error);
            showMessage('Failed to generate QR code', 'error');
            return;
        }
        document.getElementById('qr-code-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
    });
}

function closeQRCodeModal(event) {
    if (event && event.target.id !== 'qr-code-modal') return;
    document.getElementById('qr-code-modal').classList.remove('active');
    document.body.style.overflow = '';
}

// Add keyboard support for modals
document.addEventListener('keydown', (e) => {
    const aiModal = document.getElementById('ai-summary-modal');
    const qrModal = document.getElementById('qr-code-modal');
    
    if (aiModal.classList.contains('active') && e.key === 'Escape') {
        closeAISummaryModal();
    } else if (qrModal.classList.contains('active') && e.key === 'Escape') {
        closeQRCodeModal();
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
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.0/build/qrcode.min.js"></script>
</head>
<body>
<!-- Dark Mode Toggle -->
<div class="theme-toggle" onclick="toggleTheme()">
    <span class="theme-icon" id="themeIcon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/>
        </svg>
    </span>
    <span id="themeText">Dark</span>
</div>

<!-- Message Container -->
<div id="messageContainer"></div>

<!-- Refresh Button -->
<button class="refresh-button" onclick="updateTopics()" title="Refresh Topics">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 12C4 7.58172 7.58172 4 12 4C14.5264 4 16.7792 5.17108 18.2454 7M20 12C20 16.4183 16.4183 20 12 20C9.47362 20 7.22082 18.8289 5.75463 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M18 3V7H14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6 21V17H10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
</button>

<!-- QR Code Button (Admin only) -->
<button class="qr-code-button" onclick="showQRCode()" title="Show QR Code">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="7" height="7" stroke="currentColor" stroke-width="2" fill="none"/>
        <rect x="14" y="3" width="7" height="7" stroke="currentColor" stroke-width="2" fill="none"/>
        <rect x="3" y="14" width="7" height="7" stroke="currentColor" stroke-width="2" fill="none"/>
        <rect x="5" y="5" width="3" height="3" fill="currentColor"/>
        <rect x="16" y="5" width="3" height="3" fill="currentColor"/>
        <rect x="5" y="16" width="3" height="3" fill="currentColor"/>
        <rect x="14" y="14" width="2" height="2" fill="currentColor"/>
        <rect x="18" y="14" width="2" height="2" fill="currentColor"/>
        <rect x="14" y="18" width="2" height="2" fill="currentColor"/>
        <rect x="18" y="18" width="2" height="2" fill="currentColor"/>
    </svg>
</button>

<!-- AI Summary Button -->
<button class="ai-summary-button" onclick="generateAISummary()" title="Generate AI Summary">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" fill="currentColor"/>
        <path d="M19 4L19.5 6.5L22 7L19.5 7.5L19 10L18.5 7.5L16 7L18.5 6.5L19 4Z" fill="currentColor"/>
        <path d="M19 14L19.5 16.5L22 17L19.5 17.5L19 20L18.5 17.5L16 17L18.5 16.5L19 14Z" fill="currentColor"/>
    </svg>
</button>

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
                <button onclick="refreshModalContent()" title="Refresh topics">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 12C4 7.58172 7.58172 4 12 4C14.5264 4 16.7792 5.17108 18.2454 7M20 12C20 16.4183 16.4183 20 12 20C9.47362 20 7.22082 18.8289 5.75463 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <path d="M18 3V7H14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M6 21V17H10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
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

<!-- AI Summary Modal -->
<div class="modal-overlay" id="ai-summary-modal" onclick="closeAISummaryModal(event)">
    <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header">
            <h2>✨ AI Summary</h2>
            <button class="modal-close" onclick="closeAISummaryModal()">✕</button>
        </div>
        <div class="modal-body">
            <div id="ai-summary-content" style="white-space: pre-wrap; line-height: 1.8; font-size: 15px;"></div>
        </div>
    </div>
</div>

<!-- QR Code Modal -->
<div class="modal-overlay" id="qr-code-modal" onclick="closeQRCodeModal(event)">
    <div class="modal" onclick="event.stopPropagation()" style="max-width: 400px;">
        <div class="modal-header">
            <h2>📱 Session QR Code</h2>
            <button class="modal-close" onclick="closeQRCodeModal()">✕</button>
        </div>
        <div class="modal-body" style="display: flex; flex-direction: column; align-items: center; padding: 32px;">
            <div id="qr-code-container" style="background: white; padding: 16px; border-radius: 12px; margin-bottom: 16px;"></div>
            <p style="text-align: center; color: var(--text-secondary); font-size: 14px; margin: 0;">
                Scan to access this session
            </p>
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
        // Sortiere Subtopics nach Anzahl der Inputs (absteigend - mehr Inputs = weiter oben)
        const sortedSubtopics = Object.entries(subtopics).sort((a, b) => b[1].length - a[1].length);
        
        for (const [subtopic, inputs] of sortedSubtopics) {
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

// Refresh Modal Function
function refreshModal() {
    if (currentTopic) {
        fetch('/getTopics/${name}')
            .then(res => res.json())
            .then(data => {
                topicsData = data;
                topicKeys = Object.keys(topicsData);
                openModal(currentTopicIndex);
                showMessage('Topics refreshed', 'success');
            })
            .catch(err => {
                console.error(err);
                showMessage('Failed to refresh topics', 'error');
            });
    }
}

// AI Summary Modal Functions
function closeAISummaryModal(event) {
    if (event && event.target.id !== 'ai-summary-modal') return;
    const modal = document.getElementById('ai-summary-modal');
    modal.classList.remove('active');
}

// AI Summary Function
async function generateAISummary() {
    if (Object.keys(topicsData).length === 0) {
        showMessage('No topics to summarize', 'error');
        return;
    }
    
    showMessage('Generating AI summary...', 'success');
    
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: JSON.stringify(topicsData, null, 2)
            })
        });
        
        if (!response.ok) throw new Error('Failed to generate summary');
        
        const data = await response.json();
        
        // Display summary in modal
        const summaryContent = document.getElementById('ai-summary-content');
        summaryContent.textContent = data.response;
        
        const modal = document.getElementById('ai-summary-modal');
        modal.classList.add('active');
        
        showMessage('Summary generated successfully!', 'success');
    } catch (err) {
        console.error(err);
        showMessage('Failed to generate summary', 'error');
    }
}

// Refresh Modal Content Function - reloads topics and reopens modal
function refreshModalContent() {
    fetch('/sessions/${name}/topics.json')
        .then(res => res.json())
        .then(data => {
            topicsData = data.topics || {};
            topicKeys = Object.keys(topicsData);
            renderTopicsGrid();
            // Re-open the current modal with refreshed data
            if (currentTopic) {
                openModal(currentTopicIndex);
            }
            showMessage('Topics refreshed', 'success');
        })
        .catch(err => {
            console.error(err);
            showMessage('Failed to refresh topics', 'error');
        });
}

// QR Code functions
function showQRCode() {
    const container = document.getElementById('qr-code-container');
    container.innerHTML = ''; // Clear previous QR code
    
    // Create a canvas element
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    
    // Get the current URL without /admin
    const currentUrl = window.location.href.replace('/admin', '');
    
    // Generate QR code
    QRCode.toCanvas(canvas, currentUrl, {
        width: 256,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        }
    }, function (error) {
        if (error) {
            console.error(error);
            showMessage('Failed to generate QR code', 'error');
            return;
        }
        document.getElementById('qr-code-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
    });
}

function closeQRCodeModal(event) {
    if (event && event.target.id !== 'qr-code-modal') return;
    document.getElementById('qr-code-modal').classList.remove('active');
    document.body.style.overflow = '';
}

// Add keyboard support for AI Summary and QR Code modals
document.addEventListener('keydown', (e) => {
    const aiModal = document.getElementById('ai-summary-modal');
    const qrModal = document.getElementById('qr-code-modal');
    
    if (aiModal.classList.contains('active') && e.key === 'Escape') {
        closeAISummaryModal();
    } else if (qrModal.classList.contains('active') && e.key === 'Escape') {
        closeQRCodeModal();
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

// Conference-specific 404 handler
app.use('/sessions/:sessionName', (req, res, next) => {
    const sessionName = req.params.sessionName;
    const sessionPath = path.join(sessionsPath, sessionName);
    
    // Check if session exists
    if (!fs.existsSync(sessionPath)) {
        return res.status(404).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Session Not Found</title>
    <link rel="stylesheet" href="/style.css">
    <style>
        .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
            text-align: center;
        }
        .error-icon {
            font-size: 120px;
            margin-bottom: 24px;
            opacity: 0.3;
        }
        .error-code {
            font-size: 72px;
            font-weight: 700;
            color: var(--primary);
            margin-bottom: 16px;
        }
        .error-title {
            font-size: 32px;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 12px;
        }
        .error-message {
            font-size: 18px;
            color: var(--text-secondary);
            margin-bottom: 32px;
            max-width: 500px;
        }
        .error-session-name {
            font-family: monospace;
            background: var(--surface);
            padding: 4px 12px;
            border-radius: 6px;
            color: var(--primary);
            font-weight: 600;
        }
        .back-button {
            padding: 14px 32px;
            background: var(--primary);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            display: inline-block;
        }
        .back-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
        }
    </style>
</head>
<body>
    <button class="theme-toggle" id="theme-toggle" onclick="toggleTheme()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    </button>

    <div class="error-container">
        <div class="error-icon">🔍</div>
        <div class="error-code">404</div>
        <h1 class="error-title">Session Not Found</h1>
        <p class="error-message">
            The session <span class="error-session-name">${sessionName}</span> does not exist or has been removed.
        </p>
        <a href="/" class="back-button">Go to Home</a>
    </div>

    <script>
        // Theme management
        function initTheme() {
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.body.className = savedTheme;
            updateThemeIcon();
        }

        function toggleTheme() {
            const currentTheme = document.body.className || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            document.body.className = newTheme;
            localStorage.setItem('theme', newTheme);
            updateThemeIcon();
        }

        function updateThemeIcon() {
            const themeToggle = document.getElementById('theme-toggle');
            const isDark = document.body.className === 'dark';
            
            if (isDark) {
                themeToggle.innerHTML = \`
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
                        <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                \`;
            } else {
                themeToggle.innerHTML = \`
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                \`;
            }
        }

        // Initialize theme on page load
        initTheme();
    </script>
</body>
</html>
        `);
    }
    
    next();
});

// General 404 handler (must be last)
app.use((req, res) => {
    res.status(404).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Not Found</title>
    <link rel="stylesheet" href="/style.css">
    <style>
        .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
            text-align: center;
        }
        .error-icon {
            font-size: 120px;
            margin-bottom: 24px;
            opacity: 0.3;
        }
        .error-code {
            font-size: 72px;
            font-weight: 700;
            color: var(--primary);
            margin-bottom: 16px;
        }
        .error-title {
            font-size: 32px;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 12px;
        }
        .error-message {
            font-size: 18px;
            color: var(--text-secondary);
            margin-bottom: 32px;
            max-width: 500px;
        }
        .back-button {
            padding: 14px 32px;
            background: var(--primary);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            display: inline-block;
        }
        .back-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
        }
    </style>
</head>
<body>
    <button class="theme-toggle" id="theme-toggle" onclick="toggleTheme()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    </button>

    <div class="error-container">
        <div class="error-icon">🔍</div>
        <div class="error-code">404</div>
        <h1 class="error-title">Page Not Found</h1>
        <p class="error-message">
            The page you are looking for doesn't exist or has been moved.
        </p>
        <a href="/" class="back-button">Go to Home</a>
    </div>

    <script>
        // Theme management
        function initTheme() {
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.body.className = savedTheme;
            updateThemeIcon();
        }

        function toggleTheme() {
            const currentTheme = document.body.className || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            document.body.className = newTheme;
            localStorage.setItem('theme', newTheme);
            updateThemeIcon();
        }

        function updateThemeIcon() {
            const themeToggle = document.getElementById('theme-toggle');
            const isDark = document.body.className === 'dark';
            
            if (isDark) {
                themeToggle.innerHTML = \`
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
                        <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                \`;
            } else {
                themeToggle.innerHTML = \`
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                \`;
            }
        }

        // Initialize theme on page load
        initTheme();
    </script>
</body>
</html>
    `);
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
