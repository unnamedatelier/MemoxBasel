const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ordner leeren beim Booten
const sessionsPath = path.join(__dirname, 'public', 'sessions');
if (fs.existsSync(sessionsPath)) {
    fs.rmSync(sessionsPath, { recursive: true, force: true });
}
fs.mkdirSync(sessionsPath, { recursive: true });

app.post('/createsession', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).send('Kein Name angegeben.');

    const dirPath = path.join(sessionsPath, name);

    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    // Erstelle topics.json
    const topicsFilePath = path.join(dirPath, 'topics.json');
    fs.writeFileSync(topicsFilePath, JSON.stringify({
        topics: {}
    }, null, 2));

    const filePath = path.join(dirPath, 'index.html');
    const content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name}</title>
    <script src="/script.js"></script>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <h1>${name}</h1>
    <div id="topics-container">
        <!-- Topics werden hier dynamisch eingefügt -->
    </div>

    <script>
        function updateTopics() {
            fetch('/sessions/${name}/topics.json')
                .then(response => response.json())
                .then(data => {
                    const container = document.getElementById('topics-container');
                    container.innerHTML = '';
                    
                    for (const [topic, subtopics] of Object.entries(data.topics)) {
                        const topicDiv = document.createElement('div');
                        topicDiv.className = 'topic';
                        
                        const topicTitle = document.createElement('h2');
                        topicTitle.textContent = topic;
                        topicDiv.appendChild(topicTitle);
                        
                        const subtopicsList = document.createElement('ul');
                        subtopics.forEach(subtopic => {
                            const li = document.createElement('li');
                            li.textContent = subtopic;
                            subtopicsList.appendChild(li);
                        });
                        
                        topicDiv.appendChild(subtopicsList);
                        container.appendChild(topicDiv);
                    }
                })
                .catch(error => console.error('Fehler beim Laden der Topics:', error));
        }

        // Initial laden und alle 5 Sekunden aktualisieren
        updateTopics();
        setInterval(updateTopics, 5000);
    </script>
</body>
</html>`;
    fs.writeFileSync(filePath, content);

    // Admin-Seite
    const adminPath = path.join(dirPath, 'admin');
    if (!fs.existsSync(adminPath)) {
        fs.mkdirSync(adminPath, { recursive: true });
    }
    const adminFilePath = path.join(adminPath, 'index.html');
    const adminContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin - ${name}</title>
    <script src="/script.js"></script>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <h1>Admin - ${name}</h1>
    <div class="topic-creation">
        <input type="text" id="topicInput" placeholder="Topic Name">
        <button onclick="createTopic('${name}')">Topic erstellen</button>
    </div>
    <div id="topics-container">
        <!-- Topics werden hier dynamisch eingefügt -->
    </div>

    <script>
        function updateTopics() {
            fetch('/sessions/${name}/topics.json')
                .then(response => response.json())
                .then(data => {
                    const container = document.getElementById('topics-container');
                    container.innerHTML = '';
                    
                    for (const [topic, subtopics] of Object.entries(data.topics)) {
                        const topicDiv = document.createElement('div');
                        topicDiv.className = 'topic';
                        
                        const topicTitle = document.createElement('h2');
                        topicTitle.textContent = topic;
                        topicDiv.appendChild(topicTitle);
                        
                        const subtopicsList = document.createElement('ul');
                        subtopics.forEach(subtopic => {
                            const li = document.createElement('li');
                            li.textContent = subtopic;
                            subtopicsList.appendChild(li);
                        });
                        
                        topicDiv.appendChild(subtopicsList);
                        container.appendChild(topicDiv);
                    }
                })
                .catch(error => console.error('Fehler beim Laden der Topics:', error));
        }

        // Initial laden und alle 5 Sekunden aktualisieren
        updateTopics();
        setInterval(updateTopics, 5000);
    </script>
</body>
</html>`;
    fs.writeFileSync(adminFilePath, adminContent);

    res.send(`Session "${name}" und Admin-Seite erstellt.`);
});

app.post('/createTopic', (req, res) => {
    const { sessionId, topicName } = req.body;
    if (!sessionId || !topicName) {
        return res.status(400).send('Session ID und Topic Name sind erforderlich.');
    }

    const topicsFilePath = path.join(sessionsPath, sessionId, 'topics.json');
    
    try {
        let data = { topics: {} };
        if (fs.existsSync(topicsFilePath)) {
            data = JSON.parse(fs.readFileSync(topicsFilePath, 'utf8'));
        }

        // Erstelle Boilerplate-Subtopics für das neue Topic
        data.topics[topicName] = [
            "Dieses Topic wurde erstellt und wartet auf Inhalte.",
            "Die Inhalte werden automatisch generiert.",
            "Bitte warten Sie einen Moment..."
        ];

        fs.writeFileSync(topicsFilePath, JSON.stringify(data, null, 2));

        res.json({ success: true, message: `Topic "${topicName}" wurde erstellt.` });
    } catch (error) {
        res.status(500).send('Fehler beim Speichern des Topics: ' + error.message);
    }
});

app.post('/update', (req, res) => {
    console.log("Got update")
    const { session_uid, formatted } = req.body;
    if (!session_uid || !formatted) {
        return res.status(400).send('Session UID und formatted Daten sind erforderlich.');
    }

    const topicsFilePath = path.join(sessionsPath, session_uid, 'topics.json');
    
    try {
        let data = { topics: {} };
        if (fs.existsSync(topicsFilePath)) {
            data = JSON.parse(fs.readFileSync(topicsFilePath, 'utf8'));
        }

        // Aktualisiere die Topics mit den formatierten Daten
        data.topics = formatted;

        fs.writeFileSync(topicsFilePath, JSON.stringify(data, null, 2));

        res.json({ success: true, message: 'Topics wurden aktualisiert.' });
    } catch (error) {
        res.status(500).send('Fehler beim Aktualisieren der Topics: ' + error.message);
    }
});

app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});
