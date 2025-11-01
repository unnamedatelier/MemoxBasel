async function joinSession() {
    const sessionName = document.getElementById('joinInput').value
        .trim()
        .replace(/\s+/g, '-'); // Ersetze Leerzeichen durch Bindestriche
    
    if (!sessionName) {
        alert('Please enter a session name');
        return;
    }
    window.location.href = `sessions/${sessionName}/`;
}

async function createSession() {
    const sessionName = document.getElementById('createInput').value
        .trim()
        .replace(/\s+/g, '-'); // Ersetze Leerzeichen durch Bindestriche
    
    if (!sessionName) {
        alert('Please enter a session name');
        return;
    }

    try {
        const response = await fetch('/createsession', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: sessionName })
        });

        if (!response.ok) {
            throw new Error('Error creating session');
        }

        // Nach erfolgreicher Erstellung zur Admin-Seite weiterleiten
        window.location.href = `sessions/${sessionName}/admin/`;
    } catch (error) {
        alert('Fehler: ' + error.message);
    }
}