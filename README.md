# Reşo – Stop-Bad-Behivor

Desktop-App, die Menschen auf dem Weg aus der Sucht begleitet: Zähler & Meilensteine,
Hilfe-Fenster mit Atemübung, Frühwarnsystem, Statistik, Community mit Vertrauenspersonen.

## Aufbau

- `electron/` – Desktop-Hülle (Node): Datenspeicher (`store.cjs`), lokales API
  (`core.cjs`), Tastatur-Erkennung (`monitor.cjs`), Google-Anmeldung (`google.cjs`),
  Fenster, Infobereich, Autostart (`main.cjs`).
- `gui/` – Oberfläche (HTML/CSS/JS), spricht per IPC mit `electron/`.
- `server/` – Community- und Backup-Server (FastAPI, läuft auf Render).

Es gibt keinen Python-Teil mehr auf dem Desktop. Die Daten liegen in
`%APPDATA%/reso-desktop/stats_data.json` (installierte Version: `%APPDATA%/Reşo`; gleiches Format wie früher, bestehender
Fortschritt bleibt erhalten).

```powershell
npm install
npm start      # App starten
npm test       # Tests der lokalen Logik
python tests/test_social.py   # Server-Tests (benötigt server/requirements.txt)
npm run build  # Windows-Installer nach dist/
```

`RESO_SERVER_URL` verbindet die App mit einem anderen Server (z. B. lokal
`http://127.0.0.1:8000`), `RESO_USER_DATA` startet eine getrennte Test-Instanz
mit eigenem Datenordner.

## Infobereich, Beenden und Autostart

Das X schließt nur das Fenster; Reşo läuft unten rechts im Infobereich weiter und
schützt weiter. Beenden geht über Rechtsklick auf das Symbol → „Beenden …“: Dann
läuft ein 30-Minuten-Countdown (abbrechbar über das Symbol oder das Banner in der
App). Beim Herunterfahren von Windows beendet sich Reşo sofort. Reşo startet
standardmäßig mit Windows (Einstellungen → Daten & System).

## Tastatur-Erkennung

`monitor.cjs` nutzt das native Modul `uiohook-napi`, um Trigger-Wörter und sehr
schnelles Tippen zu erkennen. Nur die letzten 50 Zeichen bleiben im Speicher; nichts
wird gespeichert oder versendet. Bei einem Trigger öffnet sich das Hilfe-Fenster,
optional werden Browser geschlossen (Einstellung, standardmäßig aus). Bei hektischem
Tippen erscheint „Kurz innehalten“ (`gui/pause.html`).

## Community

Gruppen pro Sucht, Freunde & Direktnachrichten, Bilder/GIFs (max. 500 KB), Emojis,
Reaktionen, Links nur mit Warnung und Rückfrage, Melden & Blockieren, gemeinsame
Challenges. Vertrauenspersonen: Wer in den Einstellungen „Ich bin
Vertrauensperson“ aktiviert (optional mit Tagen/Uhrzeiten), bekommt Hilfe-Anfragen
als eigenes Fenster und kann helfen oder weitersenden (danach 1 Stunde Ruhe). Antwortet
niemand innerhalb von 45 Sekunden, wird automatisch die nächste Person gefragt.
Meldungen landen in der Tabelle `community_reports` – eine Moderationsoberfläche gibt
es noch nicht.

## Community auf Render aktualisieren

Render baut den Dienst aus dem GitHub-Repository. Neue Server-Endpunkte
(`/community/social/*`) sind erst nach einem Deploy erreichbar:

1. Änderungen committen und nach GitHub pushen (`git push origin main`).
2. Im Render-Dashboard den Dienst „Stop-Bad-Behivor“ öffnen. Ist *Auto-Deploy*
   aktiv, startet der Deploy automatisch – sonst **Manual Deploy → Deploy latest
   commit**.
3. Prüfen: Root Directory `server`, Build Command `pip install -r requirements.txt`,
   Start Command `uvicorn main:app --host 0.0.0.0 --port $PORT`, Umgebungsvariable
   `DATABASE_URL` zeigt auf `reso-db`. Die neuen Tabellen legt der Server beim Start
   selbst an.
4. Test im Browser: `https://<dein-dienst>.onrender.com/docs` muss
   `/community/social/sync` auflisten.

Hinweis: Im kostenlosen Render-Tarif schläft der Dienst nach Inaktivität ein; die
erste Anfrage kann dann bis zu einer Minute dauern.

## Google-Konto, Kalender und Frühwarnsystem

Ein Klick auf den Namen unten links (oder Einstellungen → Konto) öffnet die
Google-Anmeldung im Browser. Ist noch keine Client-ID gesetzt, zeigt das
Konto-Fenster eine Schritt-für-Schritt-Einrichtung; die eingetragene Client-ID
(Typ „Desktop-App“) wird lokal gespeichert und nicht synchronisiert. Reşo fragt dabei zusätzlich den Bereich
`calendar.events` an, um Check-in-, Meilenstein- und Risikozeiten-Termine
einzutragen. Dieser Bereich gilt bei Google als „sensibel“: Solange die
OAuth-App nicht von Google verifiziert ist, können sich nur eingetragene
Testnutzer anmelden. Notfallkontakt, Auslöser-Muster und Reflexionen werden nie
synchronisiert.

Das Frühwarnsystem (`gui/insights.js`) ist ein lokales statistisches Modell: Es
lernt aus erkannten Auslösern, „Welle überstanden“-Einträgen und Check-ins, zu
welchen Wochentagen/Uhrzeiten es schwer wird, und meldet sich vorher. Es läuft,
solange Reşo im Infobereich aktiv ist. Test: `node tests/test_insights.mjs`.
