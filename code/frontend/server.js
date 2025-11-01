const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

    // Mock data
    const topicsData = {
        "Travel Planning": {
            "Booking Flights": [
                "Check prices on Skyscanner",
                "Book directly with airlines for better service",
                "Booking early saves money"
            ],
            "Accommodations": [
                "Choose hotels with cancellation options",
                "Check Airbnb reviews",
                "Prefer central locations"
            ]
        },
        "Project Work": {
            "Meeting Preparation": [
                "Send agenda in advance",
                "Collect questions",
                "Assign roles"
            ],
            "Documentation": [
                "Organize structure with headings",
                "Include screenshots",
                "Cite sources correctly"
            ]
        },
        "Leisure Activities": {
            "Sports": [
                "Go to the gym three times a week",
                "Jog in the park",
                "Try new sports"
            ],
            "Arts & Culture": [
                "Plan museum visits",
                "Buy theater tickets early",
                "Update reading list"
            ]
        }
    };

    const topicsFilePath = path.join(dirPath, 'topics.json');
    fs.writeFileSync(topicsFilePath, JSON.stringify({ topics: topicsData }, null, 2));

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

    res.send(`Session "${name}" and admin page created.`);
});

app.post('/createTopic', (req, res) => {
    const { sessionId, topicName } = req.body;
    if (!sessionId || !topicName) return res.status(400).send('Session ID and Topic Name required.');

    const topicsFilePath = path.join(sessionsPath, sessionId, 'topics.json');

    try {
        let data = { topics: {} };
        if (fs.existsSync(topicsFilePath)) {
            data = JSON.parse(fs.readFileSync(topicsFilePath, 'utf8'));
        }

        data.topics[topicName] = {
            "General": [
                "New Entry 1",
                "New Entry 2",
                "New Entry 3"
            ]
        };

        fs.writeFileSync(topicsFilePath, JSON.stringify(data, null, 2));
        res.json({ success: true, message: `Topic "${topicName}" created.` });
    } catch (error) {
        res.status(500).send('Error saving: ' + error.message);
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
