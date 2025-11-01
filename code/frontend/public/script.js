function joinConference() {
    const conferenceName = document.getElementById('joinInput').value.trim().replace(/\s+/g, '-');
    if (!conferenceName) {
        alert('Bitte geben Sie einen Konferenznamen ein.');
        return;
    }
    window.location.href = `/sessions/${conferenceName}`;
}

function createConference() {
    const conferenceName = document.getElementById('createInput').value.trim().replace(/\s+/g, '-');
    if (!conferenceName) {
        alert('Bitte geben Sie einen Konferenznamen ein.');
        return;
    }

    fetch('/createsession', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: conferenceName }),
    })
        .then((response) => response.text())
        .then((result) => {
            alert(result);
            window.location.href = `/sessions/${conferenceName}/admin`;
        })
        .catch((error) => {
            alert('Fehler beim Erstellen der Konferenz: ' + error);
        });
}

function createTopic(sessionId) {
    const topicName = document.getElementById('topicInput').value.trim();
    if (!topicName) {
        alert('Bitte geben Sie einen Topic-Namen ein.');
        return;
    }

    fetch('/createTopic', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            sessionId,
            topicName
        }),
    })
        .then((response) => response.json())
        .then((result) => {
            if (result.success) {
                alert(result.message);
                document.getElementById('topicInput').value = '';
            } else {
                alert('Fehler: ' + result.message);
            }
        })
        .catch((error) => {
            alert('Fehler beim Erstellen des Topics: ' + error);
        });
}