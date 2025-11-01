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
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

    // Mockup-Daten
    const topicsData = {
        "Reiseplanung": {
            "Flüge buchen": [
                "Überprüfe Preise auf Skyscanner",
                "Direkt bei Airline buchen für besseren Service",
                "Frühzeitig buchen spart Geld"
            ],
            "Unterkünfte": [
                "Hotels mit Stornierungsmöglichkeit wählen",
                "Airbnb Bewertungen prüfen",
                "Zentrale Lage bevorzugen"
            ]
        },
        "Projektarbeit": {
            "Meeting-Vorbereitung": [
                "Agenda vorher verschicken",
                "Fragen sammeln",
                "Rollen verteilen"
            ],
            "Dokumentation": [
                "Struktur mit Überschriften festlegen",
                "Screenshots einfügen",
                "Quellen korrekt angeben"
            ]
        },
        "Freizeitgestaltung": {
            "Sport": [
                "Fitnessstudio dreimal die Woche",
                "Joggen im Park",
                "Neue Sportarten ausprobieren"
            ],
            "Kunst & Kultur": [
                "Museumsbesuche planen",
                "Theaterkarten rechtzeitig kaufen",
                "Leseliste aktualisieren"
            ]
        }
    };

    const topicsFilePath = path.join(dirPath, 'topics.json');
    fs.writeFileSync(topicsFilePath, JSON.stringify({ topics: topicsData }, null, 2));

    const fileContent = `
<!DOCTYPE html>
<html lang="de">
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

    // Admin-Seite
    const adminPath = path.join(dirPath, 'admin');
    if (!fs.existsSync(adminPath)) fs.mkdirSync(adminPath, { recursive: true });

    const adminContent = `
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin - ${name}</title>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<h1>Admin - ${name}</h1>
<div>
<input type="text" id="topicInput" placeholder="Neues Topic">
<button onclick="createTopic()">Topic erstellen</button>
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
                    topicDiv.appendChild(subDiv);
                }
                container.appendChild(topicDiv);
            }
        })
        .catch(err => console.error(err));
}

function createTopic() {
    const topicName = document.getElementById('topicInput').value;
    if (!topicName) return alert('Bitte Topic Name eingeben.');
    fetch('/createTopic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: '${name}', topicName })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        updateTopics();
    });
}

updateTopics();
setInterval(updateTopics, 5000);
</script>
</body>
</html>`;

    fs.writeFileSync(path.join(adminPath, 'index.html'), adminContent);

    res.send(`Session "${name}" und Admin-Seite erstellt.`);
});

app.post('/createTopic', (req, res) => {
    const { sessionId, topicName } = req.body;
    if (!sessionId || !topicName) return res.status(400).send('Session ID und Topic Name erforderlich.');

    const topicsFilePath = path.join(sessionsPath, sessionId, 'topics.json');

    try {
        let data = { topics: {} };
        if (fs.existsSync(topicsFilePath)) {
            data = JSON.parse(fs.readFileSync(topicsFilePath, 'utf8'));
        }

        data.topics[topicName] = {
            "Allgemeines": [
                "Neuer Eintrag 1",
                "Neuer Eintrag 2",
                "Neuer Eintrag 3"
            ]
        };

        fs.writeFileSync(topicsFilePath, JSON.stringify(data, null, 2));
        res.json({ success: true, message: `Topic "${topicName}" wurde erstellt.` });
    } catch (error) {
        res.status(500).send('Fehler beim Speichern: ' + error.message);
    }
});

app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});
