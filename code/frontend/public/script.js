// Dark Mode Toggle
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

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
});

function joinSession() {
    const sessionName = document
        .getElementById("joinInput")
        .value.trim()
        .replace(/\s+/g, "-");
    if (!sessionName) {
        showMessage('Please enter a session name', 'error');
        return;
    }
    window.location.href = `/sessions/${sessionName}`;
}

function showMessage(text, type) {
    const container = document.getElementById('messageContainer');
    if (!container) return;
    
    const message = document.createElement('div');
    message.className = `message ${type}`;
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

function createSession() {
    const sessionName = document
        .getElementById("createInput")
        .value.trim()
        .replace(/\s+/g, "-");
    if (!sessionName) {
        showMessage('Please enter a session name', 'error');
        return;
    }

    fetch("/createsession", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: sessionName }),
    })
        .then((response) => response.json())
        .then((result) => {
            if (result.success) {
                showMessage('Session created successfully!', 'success');
                setTimeout(() => {
                    window.location.href = `/sessions/${sessionName}/admin`;
                }, 1000);
            } else {
                showMessage('Failed to create session', 'error');
            }
        })
        .catch((error) => {
            showMessage('Error while creating a session', 'error');
        });
}

function createTopic(sessionId) {
    const topicName = document.getElementById("topicInput").value.trim();
    if (!topicName) {
        showMessage('Please enter a topic name', 'error');
        return;
    }

    fetch("/createTopic", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            sessionId,
            topicName,
        }),
    })
        .then((response) => response.json())
        .then((result) => {
            if (result.success) {
                showMessage('Topic created successfully!', 'success');
                document.getElementById("topicInput").value = "";
            } else {
                showMessage('Error: ' + result.message, 'error');
            }
        })
        .catch((error) => {
            showMessage('Error creating topic: ' + error, 'error');
        });
}
