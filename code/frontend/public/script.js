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
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    container.innerHTML = '';
    container.appendChild(message);
    
    setTimeout(() => {
        message.style.opacity = '0';
        setTimeout(() => container.removeChild(message), 500);
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
        .then((response) => response.text())
        .then((result) => {
            alert(result);
            window.location.href = `/sessions/${sessionName}/admin`;
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
                alert(result.message);
                document.getElementById("topicInput").value = "";
            } else {
                alert("Fehler: " + result.message);
            }
        })
        .catch((error) => {
            alert("Fehler beim Erstellen des Topics: " + error);
        });
}
