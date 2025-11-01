function joinConference() {
    const conferenceName = document.getElementById('joinInput').value.trim();
    if (!conferenceName) {
        alert('Bitte geben Sie einen Konferenznamen ein');
        return;
    }
    // Hier können Sie später die URL basierend auf dem Konferenznamen dynamisch generieren
    window.location.href = 'conferences/Gruppe1/';
}

function createConference() {
    const conferenceName = document.getElementById('createInput').value.trim();
    if (!conferenceName) {
        alert('Bitte geben Sie einen Konferenznamen ein');
        return;
    }
    // Hier können Sie später die URL basierend auf dem Konferenznamen dynamisch generieren
    window.location.href = 'conferences/Gruppe1/admin/';
}