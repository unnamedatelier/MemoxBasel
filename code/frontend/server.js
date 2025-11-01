const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ordner leeren beim Booten
const conferencesPath = path.join(__dirname, 'public', 'conferences');
if (fs.existsSync(conferencesPath)) {
    fs.rmSync(conferencesPath, { recursive: true, force: true });
}
fs.mkdirSync(conferencesPath, { recursive: true });

app.post('/createConference', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).send('Kein Name angegeben.');

    const dirPath = path.join(conferencesPath, name);

    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    const filePath = path.join(dirPath, 'index.html');
    const content = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${name}</title>
</head>
<body>
<h1>${name}</h1>
</body>
</html>`;
    fs.writeFileSync(filePath, content);

    // Admin-Ordner + Index
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
</head>
<body>
<h1>Admin - ${name}</h1>
</body>
</html>`;
    fs.writeFileSync(adminFilePath, adminContent);

    res.send(`Conference "${name}" und Admin-Seite erstellt.`);
});

app.post('/addInput', (req, res) => {
    const { input } = req.body;
    if (!input) return res.status(400).send('Kein Input angegeben.');

    console.log('Received input:', input);
    res.send('Input erhalten und geloggt.');
});

app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});
