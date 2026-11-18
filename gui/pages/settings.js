import { escapeHtml } from "../api.js";
import { prefs, setPref, resetPrefs, onPrefChange, ACCENTS } from "../prefs.js";
import { confirmSheet, chime, openSheet } from "../ui.js";
import { ADDICTIONS, BREATH_PATTERNS, QUOTE_INTERVALS, TRIGGER_CATALOG, ALL_CATALOG_WORDS } from "../recovery.js";
import { openAccount } from "../account.js";
import { LANGUAGES } from "../i18n.js";
import { requestWidgetEdit } from "../widgets.js";
import { openFeedback } from "../feedback.js";
import { openCheckin, openOnboarding, saveTriggerCategories, enabledCategories } from "../flows.js";
import { faith, loadFaith, saveFaith, deleteFaith, hashPin } from "../faith/state.js";
import { CHRISTIAN_TRADITIONS, ISLAM_TRADITIONS, QURAN_EDITIONS, BIBLE_TRANSLATIONS, RECITERS, SCENES } from "../faith/data.js";
import { METHODS } from "../faith/calc.js";
import { openLocationSheet, openAdjustSheet } from "../faith/ui.js";

let pendingJump = "";
window.addEventListener("reso:settings-section", (event) => { pendingJump = event.detail; });

const CHANNELS = [
  ["auto", "Passend zu meiner Sucht"], ["general", "Allgemein"], ["alcohol", "Alkohol"], ["nicotine", "Nikotin"],
  ["drugs", "Drogen"], ["gambling", "Glücksspiel"], ["gaming", "Gaming"], ["porn", "Pornografie"],
  ["social", "Social Media"], ["food", "Essen"], ["shopping", "Kaufsucht"], ["relatives", "Angehörige"],
];
const ACCENT_NAMES = {
  blue: "Blau", indigo: "Indigo", purple: "Lila", pink: "Pink", red: "Rot", orange: "Orange",
  yellow: "Gelb", green: "Grün", mint: "Mint", teal: "Türkis", graphite: "Graphit",
};

const SECTIONS = [
  {
    id: "account", title: "Konto & Synchronisierung", icon: "☁︎", tone: "var(--accent)", rows: [
      { key: "account", type: "action", label: "Google-Konto", hint: "Sichere deinen Fortschritt, mach auf jedem Gerät weiter und erhalte Erinnerungen im Google Kalender.", button: "Verwalten" },
    ],
  },
  {
    id: "profile", title: "Profil & Weg", icon: "🌱", tone: "var(--green)", rows: [
      { key: "communityName", store: "backend", type: "text", label: "Anzeigename", hint: "So sehen dich andere in der Community.", max: 32 },
      { key: "addiction", type: "select", label: "Wovon möchtest du frei werden?", hint: "Passt Gesundheits-Timeline, Chat und Texte an.", options: Object.entries(ADDICTIONS).map(([id, item]) => [id, `${item.emoji} ${item.label}`]) },
      { key: "streakStart", store: "backend", type: "datetime", label: "Frei seit", hint: "Trag ein, seit wann du schon frei bist." },
      { key: "why", type: "textarea", label: "Mein Warum", hint: "Wird auf der Übersicht und im Notfall-Fenster angezeigt.", max: 500, placeholder: "Für meine Kinder. Für meine Gesundheit. Für mich." },
      { key: "dailyHours", type: "number", label: "Zeitaufwand früher pro Tag", unit: "Std.", min: 0, max: 24, step: 0.5, hint: "Für die Berechnung zurückgewonnener Zeit." },
      { key: "onboarding", type: "action", label: "Einführung", hint: "Den Einrichtungs-Assistenten noch einmal durchgehen.", button: "Starten" },
    ],
  },
  {
    id: "ai", title: "Frühwarnsystem (KI)", icon: "✦", tone: "var(--purple, #AF52DE)", rows: [
      { key: "aiWarnings", type: "toggle", label: "Frühwarnungen", hint: "Eine lokale KI lernt aus deinen bisherigen Momenten, wann es für dich schwer wird, und unterstützt dich vorher. Alles bleibt auf diesem Gerät." },
      { key: "aiLeadMinutes", type: "select", label: "Vorwarnzeit", options: [[15, "15 Minuten vorher"], [30, "30 Minuten vorher"], [60, "1 Stunde vorher"]], numeric: true },
      { key: "aiNotify", type: "toggle", label: "Systembenachrichtigung", hint: "Auch melden, wenn Life im Hintergrund ist." },
      { key: "aiPatterns", type: "action", label: "Deine Muster", button: "Ansehen" },
    ],
  },
  {
    id: "checkin", title: "Check-in & Erinnerungen", icon: "🌱", tone: "var(--green)", rows: [
      { key: "checkinReminder", type: "toggle", label: "Tägliche Check-in-Erinnerung" },
      { key: "checkinTime", type: "time", label: "Uhrzeit", hint: "Am besten eine ruhige Zeit am Abend." },
      { key: "celebrations", type: "toggle", label: "Erfolge feiern", hint: "Konfetti und Glückwünsche bei Meilensteinen." },
      { key: "checkinNow", type: "action", label: "Heute einchecken", button: "Jetzt" },
    ],
  },
  {
    id: "finance", title: "Finanzen & Sparziel", icon: "€", tone: "var(--teal)", rows: [
      { key: "dailyExpense", store: "backend", type: "number", label: "Ausgaben früher pro Tag", unit: "€", min: 0, max: 1000000, step: 0.5 },
      { key: "goalName", store: "backend", type: "text", label: "Name des Sparziels", max: 80 },
      { key: "goalAmount", store: "backend", type: "number", label: "Zielbetrag", unit: "€", min: 0.01, max: 100000000, step: 1 },
      { key: "hourlyRate", store: "backend", type: "number", label: "Wert einer Stunde Fokus", unit: "€", min: 0, max: 10000, step: 0.5, hint: "Für den geschätzten Wert deiner Fokuszeit." },
      { key: "currency", type: "select", label: "Währung", options: [["EUR", "Euro (€)"], ["CHF", "Franken (CHF)"], ["USD", "US-Dollar ($)"], ["GBP", "Pfund (£)"]] },
      { key: "projectionMonths", type: "select", label: "Standard-Prognose", options: [[1, "1 Monat"], [3, "3 Monate"], [6, "6 Monate"], [12, "1 Jahr"], [24, "2 Jahre"], [60, "5 Jahre"]], numeric: true },
    ],
  },
  {
    id: "appearance", title: "Darstellung", icon: "◐", tone: "var(--indigo)", rows: [
      { key: "language", type: "select", label: "Sprache", hint: "Die App-Sprache. Gebetstexte, Verse und Trigger-Wörter bleiben im Original.", options: LANGUAGES },
      { key: "theme", type: "segmented", label: "Erscheinungsbild", options: [["auto", "Automatisch"], ["light", "Hell"], ["dark", "Dunkel"]] },
      { key: "accent", type: "color", label: "Akzentfarbe" },
      { key: "fontScale", type: "range", label: "Textgröße", min: 0.85, max: 1.3, step: 0.05, format: (value) => `${Math.round(value * 100)} %` },
      { key: "density", type: "segmented", label: "Dichte", options: [["comfortable", "Komfortabel"], ["compact", "Kompakt"]] },
      { key: "motion", type: "segmented", label: "Animationen", hint: "„Reduziert“ wird automatisch genutzt, wenn dein System weniger Bewegung wünscht.", options: [["full", "Voll"], ["reduced", "Reduziert"], ["off", "Aus"]] },
      { key: "glass", type: "toggle", label: "Transparenz-Effekte", hint: "Milchglas für Seitenleiste und Fenster." },
      { key: "highContrast", type: "toggle", label: "Erhöhter Kontrast" },
      { key: "sidebarCompact", type: "toggle", label: "Kompakte Seitenleiste", hint: "Nur Symbole anzeigen." },
      { key: "clock24", type: "toggle", label: "24-Stunden-Format" },
      { key: "startPage", type: "select", label: "Startseite", options: [["home", "Übersicht"], ["timer", "Fokus"], ["community", "Community"], ["stats", "Statistik"]] },
    ],
  },
  {
    id: "home", title: "Übersicht", icon: "⌂", tone: "var(--accent)", rows: [
      { key: "greeting", type: "toggle", label: "Persönliche Begrüßung" },
      { key: "counterStyle", type: "segmented", label: "Zähler-Stil", options: [["rings", "Ringe"], ["list", "Balken"]] },
      { key: "showSeconds", type: "toggle", label: "Sekunden anzeigen" },
      { key: "showWhy", type: "toggle", label: "„Mein Warum“ in der Seitenleiste" },
      { key: "homeWidgets", type: "action", label: "Widgets der Übersicht", hint: "Auf der Übersicht unter „Widgets anpassen“: Widgets hinzufügen, entfernen, verschieben und in der Größe ändern.", button: "Anpassen" },
      { key: "showQuote", type: "toggle", label: "Zitat in der Seitenleiste" },
      { key: "quoteInterval", type: "select", label: "Neues Zitat", hint: "Wie oft das Zitat unter „Mein Warum“ wechselt.", options: QUOTE_INTERVALS },
      { key: "privacyMode", type: "toggle", label: "Privatsphäre-Modus", hint: "Geldbeträge werden unscharf, bis du mit der Maus darüber fährst." },
    ],
  },
  {
    id: "focus", title: "Fokus-Timer", icon: "◷", tone: "var(--orange)", rows: [
      { key: "defaultTimer", store: "backend", type: "number", label: "Standard-Dauer", unit: "Min.", min: 1, max: 180, step: 1, integer: true },
      { key: "focusGoal", type: "number", label: "Tagesziel", unit: "Min.", min: 5, max: 720, step: 5 },
      { key: "breakMinutes", type: "number", label: "Pausenlänge", unit: "Min.", min: 1, max: 60, step: 1 },
      { key: "timerSound", type: "toggle", label: "Ton am Ende" },
      { key: "timerVolume", type: "range", label: "Lautstärke", min: 0, max: 1, step: 0.05, format: (value) => `${Math.round(value * 100)} %` },
      { key: "testSound", type: "action", label: "Ton testen", button: "Abspielen" },
      { key: "timerNotify", type: "toggle", label: "Systembenachrichtigung", hint: "Meldet sich auch, wenn die App im Hintergrund ist." },
    ],
  },
  {
    id: "community", title: "Community", icon: "💬", tone: "var(--pink)", rows: [
      { key: "showOnline", type: "toggle", label: "Online-Status teilen", hint: "Freunde sehen, wenn du gerade in der App bist." },
      { key: "defaultChannel", type: "select", label: "Standard-Gruppe", options: CHANNELS },
      { key: "chatEnterSend", type: "toggle", label: "Mit Enter senden", hint: "Aus: Strg + Enter sendet." },
      { key: "chatTimestamps", type: "toggle", label: "Uhrzeiten anzeigen" },
      { key: "chatCompact", type: "toggle", label: "Kompakte Nachrichten" },
      { key: "chatFontSize", type: "range", label: "Schriftgröße im Chat", min: 12, max: 22, step: 1, format: (value) => `${value} px` },
      { key: "chatSound", type: "toggle", label: "Ton bei neuen Nachrichten" },
      { key: "pollSeconds", type: "select", label: "Aktualisierung", options: [[2, "Alle 2 Sekunden"], [4, "Alle 4 Sekunden"], [10, "Alle 10 Sekunden"], [30, "Alle 30 Sekunden"]], numeric: true },
    ],
  },
  {
    id: "helper", title: "Vertrauensperson", icon: "🤝", tone: "var(--teal)", rows: [
      { key: "helperEnabled", type: "toggle", label: "Ich bin Vertrauensperson", hint: "Braucht jemand Hilfe, kann Life dich fragen. Du entscheidest jedes Mal selbst: helfen oder weitersenden (dann 1 Stunde Ruhe)." },
      { key: "helperDays", type: "days", label: "An diesen Tagen" },
      { key: "helperFrom", type: "time", label: "Ab", hint: "Leer lassen = den ganzen Tag." },
      { key: "helperTo", type: "time", label: "Bis" },
    ],
  },
  {
    id: "protection", title: "Schutz & Erkennung", icon: "🛡️", tone: "var(--red)", rows: [
      { key: "catalog", type: "catalog", label: "Schutz-Kategorien", hint: "Aktiviere Kategorien – Life erkennt die Begriffe beim Tippen und hilft dir genau in dem Moment." },
      { key: "triggerCustom", store: "backend", type: "textarea", label: "Eigene Begriffe", hint: "Zusätzlich zu den Kategorien, durch Komma oder Zeilen getrennt. Eigene Begriffe werden überall erkannt – auch als Teil eines Wortes („stri“ fängt „stripchat“). Mit „=“ davor nur als ganzes Wort (=meth).", max: 4000 },
      { key: "stressDetection", store: "backend", type: "toggle", label: "Tipp-Tempo-Erkennung", hint: "Bei sehr hektischem Tippen öffnet sich „Kurz innehalten“." },
      { key: "keyboardLayout", type: "select", label: "Tastatur", hint: "Damit Begriffe mit Umlauten und Y/Z richtig erkannt werden.", options: [["de", "Deutsch (QWERTZ)"], ["us", "Englisch (QWERTY)"]] },
      { key: "closeBrowsers", type: "toggle", label: "Alle Browser bei Auslöser schließen", hint: "Schließt Chrome, Edge, Firefox, Opera, Brave, Vivaldi und Discord sofort. Offene Tabs und ungespeicherte Eingaben gehen dabei verloren." },
    ],
  },
  {
    id: "faith", title: "Religion", icon: "🕊️", tone: "#c9a24a", rows: [
      { key: "enabled", store: "faith", type: "toggle", label: "Bereich Glaube aktivieren", hint: "Gebet, Bibel und Koran, Gebetszeiten, Kalender und Tagebuch. Alles wird verschlüsselt nur auf diesem Gerät gespeichert." },
      { key: "order", store: "faith", type: "select", label: "Reihenfolge, wenn beide aktiv sind", hint: "„Abwechselnd“ wechselt täglich, welche zuerst erscheint – so steht keine Seite immer hinten.", options: [["alternate", "Abwechselnd"], ["christian", "Christentum zuerst"], ["islam", "Islam zuerst"]] },
      { key: "tracker", store: "faith", type: "toggle", label: "Gebets-Tracker anzeigen", hint: "Abhaken, ob du deine Gebete gemacht hast. Ausgeschaltet wird er nirgends angezeigt." },
      { key: "trackerExtras", store: "faith", type: "toggle", label: "Mehr Punkte im Tracker", hint: "Z. B. Koran/Bibel gelesen, Dhikr, Tagesrückblick, Fasten, gute Tat." },
      { key: "fasting", store: "faith", type: "toggle", label: "Fasten-Begleiter", hint: "Ramadan mit Iftar-Zeit bzw. Fastenzeit bis Ostern." },
      { key: "homeCard", store: "faith", type: "toggle", label: "Auf der Übersicht anzeigen", hint: "Nächstes Gebet und Vers des Tages." },
      { key: "versesInQuotes", store: "faith", type: "select", label: "Verse im Zitat-Fenster", options: [["mixed", "Zitate und Verse gemischt"], ["only", "Nur Verse aus Bibel/Koran"], ["off", "Keine Verse"]] },
      { key: "community", store: "faith", type: "toggle", label: "Glaubensräume in der Community", hint: "Öffnet versteckte Räume zum Austausch unter Gläubigen." },
      { key: "fontSize", store: "faith", type: "range", label: "Schriftgröße beim Lesen", min: 14, max: 34, step: 1, format: (value) => `${value} px` },
      { key: "theme", store: "faith", type: "select", label: "Darstellung", options: [["auto", "Passend zum Hintergrund"], ["light", "Hell"], ["dark", "Dunkel"]] },
      { key: "scene", store: "faith", type: "select", label: "Hintergrund", options: Object.entries(SCENES).map(([id, item]) => [id, item.label]) },
      { key: "faithPhoto", type: "action", label: "Eigenes Foto als Hintergrund", hint: "Z. B. deine Moschee, deine Kirche, ein Ort der Ruhe. Bleibt verschlüsselt auf dem Gerät.", button: "Foto wählen" },
      { key: "navHidden", store: "faith", type: "toggle", label: "„Glaube“ in der Seitenleiste ausblenden" },
      { key: "faithPin", type: "action", label: "PIN-Schutz", hint: "Schützt den Bereich, wenn andere deinen PC benutzen.", button: "PIN festlegen" },
      { key: "faithDelete", type: "action", label: "Alle Glaubens-Daten löschen", hint: "Tagebuch, Tracker, Lesezeichen und Einstellungen dieses Bereichs.", button: "Löschen", danger: true },
    ],
  },
  {
    id: "faith-christian", title: "Christentum", icon: "✝", tone: "#c9a24a", rows: [
      { key: "christian", store: "faith", type: "toggle", label: "Christentum aktivieren", hint: "Bibel, Gebete, Kirchenjahr, Gebetsschnur und christlicher Raum." },
      { key: "christianTradition", store: "faith", type: "select", label: "Konfession", hint: "Bestimmt Feiertage, Gebete und Kirchenjahr.", options: CHRISTIAN_TRADITIONS },
      { key: "bibleTranslation", store: "faith", type: "select", label: "Bibelübersetzung", options: BIBLE_TRANSLATIONS },
      { key: "christianReminders", store: "faith", type: "toggle", label: "An Morgen- und Abendgebet erinnern" },
      { key: "morningPrayer", store: "faith", type: "time", label: "Morgengebet" },
      { key: "eveningPrayer", store: "faith", type: "time", label: "Abendgebet" },
      { key: "angelus", store: "faith", type: "toggle", label: "Angelus (6, 12 und 18 Uhr)" },
      { key: "sundayService", store: "faith", type: "toggle", label: "Gottesdienst am Sonntag", hint: "Erinnerung 45 Minuten vorher." },
      { key: "sundayTime", store: "faith", type: "time", label: "Beginn des Gottesdienstes" },
    ],
  },
  {
    id: "faith-islam", title: "Islam", icon: "☪", tone: "#c9a24a", rows: [
      { key: "islam", store: "faith", type: "toggle", label: "Islam aktivieren", hint: "Koran, Gebetszeiten, Hidschri-Kalender, Tasbīḥ und muslimischer Raum." },
      { key: "islamTradition", store: "faith", type: "select", label: "Rechtsschule", hint: "Bestimmt Asr-Zeit, Feiertage und Gebete.", options: ISLAM_TRADITIONS },
      { key: "faithPlace", type: "action", label: "Standort für Gebetszeiten", hint: "Stadt suchen oder Koordinaten selbst eingeben.", button: "Festlegen" },
      { key: "method", store: "faith", type: "select", label: "Berechnungsmethode", options: Object.entries(METHODS).map(([id, item]) => [id, item.label]) },
      { key: "highLat", store: "faith", type: "select", label: "Sommer in nördlichen Ländern", hint: "Wenn die Sonne nachts nicht tief genug sinkt (z. B. Juni in Deutschland).", options: [["angle", "Winkelbasiert (empfohlen)"], ["seventh", "Ein Siebtel der Nacht"], ["middle", "Mitte der Nacht"]] },
      { key: "faithAdjust", type: "action", label: "Gebetszeiten feinjustieren", hint: "An die Zeiten deiner Moschee angleichen.", button: "Anpassen" },
      { key: "hijriAdjust", store: "faith", type: "select", label: "Hidschri-Datum", hint: "Je nach Mondsichtung in deiner Gemeinde.", options: [[-2, "−2 Tage"], [-1, "−1 Tag"], [0, "Umm al-Qura (Standard)"], [1, "+1 Tag"], [2, "+2 Tage"]], numeric: true, min: -2, max: 2 },
      { key: "prayerReminders", store: "faith", type: "toggle", label: "An Gebetszeiten erinnern", hint: "Auch wenn Life im Hintergrund läuft." },
      { key: "remindPrayers", store: "faith", type: "chips", label: "Diese Gebete", options: [["fajr", "Fadschr"], ["dhuhr", "Dhuhr"], ["asr", "Asr"], ["maghrib", "Maghrib"], ["isha", "Ischa"]] },
      { key: "reminderLead", store: "faith", type: "select", label: "Erinnerung", options: [[0, "Zur Gebetszeit"], [5, "5 Minuten vorher"], [10, "10 Minuten vorher"], [15, "15 Minuten vorher"], [30, "30 Minuten vorher"]], numeric: true, min: 0, max: 30 },
      { key: "jumuah", store: "faith", type: "toggle", label: "Freitagsgebet (Dschumuʿa)", hint: "45 Minuten vor Dhuhr am Freitag." },
      { key: "tahajjudReminder", store: "faith", type: "toggle", label: "An das Nachtgebet (Tahadschud) erinnern", hint: "Zu Beginn des letzten Drittels der Nacht." },
      { key: "quranEdition", store: "faith", type: "select", label: "Koran-Übersetzung", options: QURAN_EDITIONS },
      { key: "showArabic", store: "faith", type: "toggle", label: "Arabischen Originaltext zeigen" },
      { key: "reciter", store: "faith", type: "select", label: "Koran-Rezitation", options: RECITERS },
    ],
  },
  {
    id: "emergency", title: "Notfall & Hilfe", icon: "🆘", tone: "var(--red)", rows: [
      { key: "sosButton", type: "toggle", label: "Hilfe-Button in der Seitenleiste", hint: "Empfohlen: immer eingeschaltet lassen." },
      { key: "helpRegion", type: "select", label: "Land für Hilfe-Nummern", options: [["de", "Deutschland"], ["at", "Österreich"], ["ch", "Schweiz"]] },
      { key: "breathPattern", type: "select", label: "Atemübung", options: Object.entries(BREATH_PATTERNS).map(([id, item]) => [id, item.label]) },
      { key: "contactName", type: "text", label: "Vertrauensperson", max: 60, placeholder: "z. B. Mama, Alex, Sponsor" },
      { key: "contactPhone", type: "text", label: "Telefonnummer", max: 40, hint: "Bleibt nur auf diesem Gerät und wird nie synchronisiert." },
      { key: "ifThenPlan", type: "textarea", label: "Mein Wenn-Dann-Plan", hint: "Eine Zeile pro Plan. Erscheint im Hilfe-Fenster und bei Frühwarnungen.", max: 600 },
      { key: "openSos", type: "action", label: "Notfall-Fenster", button: "Öffnen" },
    ],
  },
  {
    id: "feedback", title: "Feedback an Reşo", icon: "💌", tone: "var(--pink)", rows: [
      { key: "feedback", type: "action", label: "Fehler gefunden oder eine Idee?", hint: "Wähle den Bereich und schreib mir direkt. Ich lese jede Nachricht und verbessere Life damit.", button: "Feedback schreiben" },
    ],
  },
  {
    id: "data", title: "Daten & System", icon: "⚙︎", tone: "var(--graphite)", rows: [
      { key: "export", type: "action", label: "Daten exportieren", hint: "Einstellungen und Statistiken als JSON-Datei.", button: "Exportieren" },
      { key: "energySaver", store: "backend", type: "toggle", label: "Energiesparmodus", hint: "Life zeichnet ohne Grafikkarte und spart so rund die Hälfte an Arbeitsspeicher und Strom. Wirkt nach einem Neustart von Life." },
      { key: "autostart", store: "backend", type: "toggle", label: "Mit Windows starten", hint: "Life startet unauffällig im Infobereich (unten rechts) und schützt dich ab dem ersten Moment." },
      { key: "quit", type: "action", label: "Life beenden", hint: "Zum Schutz vor Kurzschluss-Entscheidungen beendet sich Life erst nach 30 Minuten. Abbrechen geht jederzeit.", button: "Beenden …", danger: true },
      { key: "reset", type: "action", label: "Darstellung zurücksetzen", hint: "Setzt alle Einstellungen dieser Oberfläche zurück. Dein Fortschritt bleibt erhalten.", button: "Zurücksetzen", danger: true },
    ],
  },
];

// Sections in groups – faith has one "Religion" heading with Christianity and Islam inside.
const GROUPS = [
  ["Allgemein", ["account", "profile", "appearance", "home"]],
  ["Dein Weg", ["checkin", "finance", "focus"]],
  ["Schutz & Hilfe", ["protection", "ai", "emergency", "helper"]],
  ["Gemeinschaft", ["community"]],
  ["Religion", ["faith", "faith-christian", "faith-islam"]],
  ["System", ["feedback", "data"]],
];
const GROUP_OF = new Map(GROUPS.flatMap(([name, ids], g) => ids.map((id, i) => [id, { name, order: g * 100 + i }])));
SECTIONS.sort((a, b) => (GROUP_OF.get(a.id)?.order ?? 999) - (GROUP_OF.get(b.id)?.order ?? 999));
const CHILD_SECTIONS = new Set(["faith-christian", "faith-islam"]);

function backendValues(data) {
  return {
    communityName: data.communityName || "",
    streakStart: data.streakStart ? String(data.streakStart).slice(0, 16) : "",
    dailyExpense: data.dailyExpense,
    goalName: data.goalName,
    goalAmount: data.goalAmount,
    hourlyRate: data.hourlyRate,
    defaultTimer: data.defaultTimer,
    triggerWords: data.triggerWords || [],
    triggerCustom: (data.triggerWords || []).filter((word) => !ALL_CATALOG_WORDS.has(word)).join(", "),
    stressDetection: Boolean(data.stressDetection),
    autostart: Boolean(data.autostart),
    energySaver: data.energySaver !== false,
  };
}

function control(row, value) {
  const attrs = `data-key="${row.key}" data-store="${row.store || "pref"}" id="field-${row.key}"`;
  switch (row.type) {
    case "toggle":
      return `<label class="switch"><input type="checkbox" ${attrs} ${value ? "checked" : ""}><span></span></label>`;
    case "segmented":
      return `<div class="segmented small" ${attrs} role="radiogroup">${row.options.map(([id, label]) =>
        `<button type="button" data-value="${id}" class="${String(value) === String(id) ? "is-selected" : ""}" role="radio" aria-checked="${String(value) === String(id)}">${escapeHtml(label)}</button>`).join("")}</div>`;
    case "select":
      return `<select ${attrs} ${row.numeric ? "data-numeric" : ""}>${row.options.map(([id, label]) =>
        `<option value="${id}" ${String(value) === String(id) ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select>`;
    case "range":
      return `<div class="range-control"><input type="range" ${attrs} min="${row.min}" max="${row.max}" step="${row.step}" value="${value}"
        style="--pct:${((value - row.min) / (row.max - row.min)) * 100}%"><output>${escapeHtml(row.format(value))}</output></div>`;
    case "number":
      return `<div class="number-control"><input type="number" ${attrs} min="${row.min}" max="${row.max}" step="${row.step}" value="${value ?? ""}" inputmode="decimal">${row.unit ? `<span>${escapeHtml(row.unit === "€" ? prefs.currency : row.unit)}</span>` : ""}</div>`;
    case "text":
      return `<input type="text" ${attrs} maxlength="${row.max || 200}" value="${escapeHtml(value ?? "")}" placeholder="${escapeHtml(row.placeholder || "")}">`;
    case "textarea":
      return `<textarea ${attrs} rows="3" maxlength="${row.max || 600}" placeholder="${escapeHtml(row.placeholder || "")}">${escapeHtml(value ?? "")}</textarea>`;
    case "datetime":
      return `<input type="datetime-local" ${attrs} value="${escapeHtml(value || "")}" max="${new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}">`;
    case "color":
      return `<div class="swatches" ${attrs} role="radiogroup">${Object.entries(ACCENTS).map(([id, [light, dark]]) =>
        `<button type="button" class="swatch ${value === id ? "is-selected" : ""}" data-value="${id}" style="--swatch:${document.documentElement.dataset.theme === "dark" ? dark : light}" title="${ACCENT_NAMES[id]}" aria-label="${ACCENT_NAMES[id]}" role="radio" aria-checked="${value === id}"></button>`).join("")}</div>`;
    case "time":
      return `<input type="time" ${attrs} value="${escapeHtml(value || "")}">`;
    case "chips": {
      const chosen = String(value).split(",");
      return `<div class="day-chips wide-chips" ${attrs}>${row.options.map(([id, label]) =>
        `<button type="button" data-day="${id}" class="${chosen.includes(String(id)) ? "is-selected" : ""}" aria-pressed="${chosen.includes(String(id))}">${escapeHtml(label)}</button>`).join("")}</div>`;
    }
    case "days": {
      const chosen = String(value).split(",");
      return `<div class="day-chips" ${attrs}>${["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((label, day) =>
        `<button type="button" data-day="${day}" class="${chosen.includes(String(day)) ? "is-selected" : ""}" aria-pressed="${chosen.includes(String(day))}">${label}</button>`).join("")}</div>`;
    }
    case "catalog": {
      const enabled = enabledCategories();
      return `<div class="catalog" ${attrs}>${TRIGGER_CATALOG.map((category) => `
        <div class="catalog-item ${enabled.includes(category.id) ? "is-on" : ""}" data-category="${category.id}">
          <div class="catalog-head">
            <span class="catalog-emoji">${category.emoji}</span>
            <span class="catalog-copy"><strong>${escapeHtml(category.label)}</strong><small>${category.words.length} Begriffe · <button type="button" class="link-button" data-expand>ansehen</button></small></span>
            <label class="switch"><input type="checkbox" data-catalog-toggle ${enabled.includes(category.id) ? "checked" : ""} aria-label="${escapeHtml(category.label)}"><span></span></label>
          </div>
          <div class="catalog-words" hidden>${category.words.map((word) => `<span>${escapeHtml(word.replace(/^=/, ""))}</span>`).join("")}</div>
        </div>`).join("")}</div>`;
    }
    case "action":
      return `<button type="button" class="button ${row.danger ? "button-danger-plain" : "button-secondary"} small" data-action="${row.key}">${escapeHtml(row.button)}</button>`;
    default:
      return "";
  }
}

export async function render(root, { api, showToast }) {
  const backend = backendValues(await api("/api/settings"));
  await loadFaith().catch(() => {});
  const valueOf = (row) => (row.store === "backend" ? backend[row.key] : row.store === "faith" ? faith()[row.key] : prefs[row.key]);
  const wide = (row) => row.type === "textarea" || row.type === "color" || row.type === "catalog";
  if (!prefs.triggerCategories) {
    // infer categories that are already fully part of the saved list
    const inferred = TRIGGER_CATALOG.filter((category) => category.words.filter((word) => backend.triggerWords.includes(word)).length >= Math.min(5, category.words.length)).map((category) => category.id);
    if (inferred.length) setPref("triggerCategories", inferred.join(","));
  }

  root.innerHTML = `
    <header class="page-header reveal">
      <div>
        <span class="eyebrow">Deine App, deine Regeln</span>
        <h1>Einstellungen</h1>
        <p class="subtitle">Änderungen werden automatisch gespeichert.</p>
      </div>
      <span class="save-state" id="save-state" aria-live="polite"></span>
    </header>

    <div class="settings-layout reveal">
      <nav class="settings-nav" aria-label="Kategorien">
        <label class="search-field">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input id="settings-search" type="search" placeholder="Einstellungen suchen">
        </label>
        ${SECTIONS.map((section, index) => `
          ${GROUP_OF.get(section.id)?.name !== GROUP_OF.get(SECTIONS[index - 1]?.id)?.name && GROUP_OF.get(section.id)?.name !== section.title ? `<span class="settings-nav-group">${escapeHtml(GROUP_OF.get(section.id)?.name || "")}</span>` : ""}
          <button type="button" class="settings-nav-item ${CHILD_SECTIONS.has(section.id) ? "is-child" : ""}" data-jump="${section.id}">
            <span class="settings-icon" style="--tone:${section.tone}">${section.icon}</span>${escapeHtml(section.title)}
          </button>`).join("")}
      </nav>

      <div class="settings-content" id="settings-content">
        ${SECTIONS.map((section) => `
          <section class="settings-group" id="group-${section.id}" data-group>
            <h2><span class="settings-icon" style="--tone:${section.tone}">${section.icon}</span>${escapeHtml(section.title)}</h2>
            <div class="card grouped-list">
              ${section.rows.map((row) => `
                <div class="setting-row ${wide(row) ? "is-wide" : ""}" data-row data-search="${escapeHtml(`${row.label} ${row.hint || ""} ${section.title}`.toLowerCase())}">
                  <label class="setting-copy" for="field-${row.key}">
                    <strong>${escapeHtml(row.label)}</strong>
                    ${row.hint ? `<small>${escapeHtml(row.hint)}</small>` : ""}
                  </label>
                  <div class="setting-control">${control(row, valueOf(row))}</div>
                </div>`).join("")}
            </div>
          </section>`).join("")}
        <p class="empty" id="settings-empty" hidden>Keine Einstellung gefunden.</p>
      </div>
    </div>`;

  // live account status in the first row: shows who is signed in and offers sign-out
  api("/api/account").then((account) => {
    const row = root.querySelector('[data-action="account"]')?.closest(".setting-row");
    if (!row) return;
    row.querySelector(".setting-copy small").textContent = account.connected
      ? `Angemeldet als ${account.email}. Deine Daten werden gesichert.`
      : account.configured ? "Nicht angemeldet. Sichere deinen Fortschritt und mach auf jedem Gerät weiter." : "Google-Anmeldung ist noch nicht eingerichtet – tippe auf „Verwalten“.";
    if (account.connected) {
      const logout = document.createElement("button");
      logout.type = "button";
      logout.className = "button button-danger-plain small";
      logout.textContent = "Abmelden";
      logout.addEventListener("click", async () => {
        const ok = await confirmSheet({ title: "Abmelden?", text: "Der Google-Zugriff wird widerrufen. Dein Fortschritt bleibt auf diesem Gerät und im Backup erhalten.", confirmLabel: "Abmelden", danger: true });
        if (!ok) return;
        await api("/api/account/logout", { method: "POST", body: {} });
        showToast("Abgemeldet.");
        setTimeout(() => window.dispatchEvent(new Event("reso:account")), 1500);
      });
      row.querySelector(".setting-control").prepend(logout);
    }
  }).catch(() => {});

  const saveState = root.querySelector("#save-state");
  let saveStateTimer;
  const flash = (text, error = false) => {
    saveState.textContent = text;
    saveState.classList.toggle("is-error", error);
    saveState.classList.add("is-visible");
    clearTimeout(saveStateTimer);
    saveStateTimer = setTimeout(() => saveState.classList.remove("is-visible"), 1800);
  };
  const stopListening = onPrefChange((key, value) => {
    if (key === "__saved") flash("✓ Gespeichert");
    if (key === "__error") flash(value, true);
  });

  // ---- backend saving (debounced per field) --------------------------------
  const timers = {};
  const payloadFor = (key) => {
    switch (key) {
      case "goalName":
      case "goalAmount":
        return { savingsGoal: { name: String(backend.goalName).trim(), amount: Number(backend.goalAmount) } };
      case "triggerCustom": {
        const custom = String(backend.triggerCustom).split(/[,;\n]+/).map((word) => word.trim().toLowerCase()).filter(Boolean);
        const catalog = backend.triggerWords.filter((word) => ALL_CATALOG_WORDS.has(word));
        backend.triggerWords = [...new Set([...custom, ...catalog])];
        return backend.triggerWords.length ? { triggerWords: backend.triggerWords } : null;
      }
      case "communityName":
        return { communityName: String(backend.communityName).trim() };
      case "streakStart":
        return backend.streakStart ? { streakStart: backend.streakStart } : null;
      case "autostart":
        return { autostart: backend.autostart };
      case "energySaver":
        return { energySaver: backend.energySaver };
      case "stressDetection":
        return { stressDetection: backend.stressDetection };
      default:
        return { [key]: Number(backend[key]) };
    }
  };
  const flushBackend = async (key) => {
    clearTimeout(timers[key]);
    delete timers[key];
    const body = payloadFor(key);
    if (!body) return;
    try {
      await api("/api/settings", { method: "POST", body });
      flash("✓ Gespeichert");
    } catch (error) {
      flash("Nicht gespeichert", true);
      showToast(error.message, true);
    }
  };
  const saveBackend = (key, delay = 600) => {
    clearTimeout(timers[key]);
    timers[key] = setTimeout(() => flushBackend(key), delay);
  };

  const rowFor = (key) => SECTIONS.flatMap((section) => section.rows).find((row) => row.key === key);
  const commit = (input, rawValue) => {
    const row = rowFor(input.dataset.key);
    let value = rawValue;
    if (row.type === "number" || row.type === "range" || (row.type === "select" && row.numeric)) {
      value = Number(rawValue);
      const invalid = rawValue === "" || !Number.isFinite(value) || value < row.min || value > row.max || (row.integer && !Number.isInteger(value));
      input.classList?.toggle("is-invalid", Boolean(invalid && row.type === "number"));
      if (invalid && row.type === "number") return;
    }
    if (row.store === "backend") {
      backend[row.key] = value;
      saveBackend(row.key, row.type === "toggle" ? 0 : 600);
    } else if (row.store === "faith") {
      saveFaith({ [row.key]: value }).then(() => flash("🔐 Verschlüsselt gespeichert")).catch((error) => showToast(error.message, true));
      if (["enabled", "christian", "islam", "community"].includes(row.key)) window.dispatchEvent(new Event("reso:faith"));
    } else {
      setPref(row.key, value);
    }
  };

  const content = root.querySelector("#settings-content");
  content.addEventListener("input", (event) => {
    const input = event.target.closest("[data-key]");
    if (!input || input.type === "checkbox" || input.tagName === "SELECT" || input.dataset.key === "catalog") return;
    if (input.type === "range") {
      const row = rowFor(input.dataset.key);
      input.style.setProperty("--pct", `${((input.value - row.min) / (row.max - row.min)) * 100}%`);
      input.nextElementSibling.textContent = row.format(Number(input.value));
    }
    commit(input, input.value);
  });
  content.addEventListener("change", async (event) => {
    const toggle = event.target.closest("[data-catalog-toggle]");
    if (toggle) {
      const item = toggle.closest("[data-category]");
      item.classList.toggle("is-on", toggle.checked);
      const ids = [...content.querySelectorAll("[data-category]")].filter((node) => node.querySelector("[data-catalog-toggle]").checked).map((node) => node.dataset.category);
      try {
        await saveTriggerCategories(api, ids, backend.triggerWords);
        const custom = backend.triggerWords.filter((word) => !ALL_CATALOG_WORDS.has(word));
        backend.triggerWords = [...new Set([...custom, ...TRIGGER_CATALOG.filter((category) => ids.includes(category.id)).flatMap((category) => category.words)])];
        flash(`✓ ${backend.triggerWords.length} Begriffe aktiv`);
      } catch (error) {
        toggle.checked = !toggle.checked;
        item.classList.toggle("is-on", toggle.checked);
        showToast(error.message, true);
      }
      return;
    }
    const input = event.target.closest("[data-key]");
    if (!input || input.dataset.key === "catalog") return;
    if (input.type === "checkbox") commit(input, input.checked);
    else if (input.tagName === "SELECT") commit(input, input.value);
  });
  content.addEventListener("click", async (event) => {
    const day = event.target.closest("[data-day]");
    if (day) {
      day.classList.toggle("is-selected");
      day.setAttribute("aria-pressed", String(day.classList.contains("is-selected")));
      const group = day.closest("[data-key]");
      commit(group, [...group.querySelectorAll(".is-selected")].map((item) => item.dataset.day).join(","));
      return;
    }
    const option = event.target.closest("[data-value]");
    const group = option?.closest("[data-key]");
    if (option && group) {
      group.querySelectorAll("[data-value]").forEach((item) => {
        item.classList.toggle("is-selected", item === option);
        item.setAttribute("aria-checked", String(item === option));
      });
      commit(group, option.dataset.value);
      return;
    }
    const expand = event.target.closest("[data-expand]");
    if (expand) {
      const words = expand.closest(".catalog-item").querySelector(".catalog-words");
      words.hidden = !words.hidden;
      expand.textContent = words.hidden ? "ansehen" : "ausblenden";
      return;
    }
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "account") openAccount({ api, showToast });
    if (action === "onboarding") openOnboarding({ api, showToast, onDone: () => window.dispatchEvent(new CustomEvent("reso:navigate", { detail: "home" })) });
    if (action === "checkinNow") openCheckin({ api, showToast });
    if (action === "aiPatterns") window.dispatchEvent(new CustomEvent("reso:navigate", { detail: "stats" }));
    if (action === "testSound") chime();
    if (action === "feedback") openFeedback();
    if (action === "homeWidgets") { requestWidgetEdit(); window.dispatchEvent(new CustomEvent("reso:navigate", { detail: "home" })); }
    if (action === "openSos") window.dispatchEvent(new Event("reso:sos"));
    if (action === "faithPlace") openLocationSheet({ showToast });
    if (action === "faithAdjust") openAdjustSheet({ showToast });
    if (action === "faithPhoto") {
      if (faith().photo) {
        const remove = await confirmSheet({ title: "Eigenes Foto", text: "Möchtest du dein Foto entfernen und wieder einen Hintergrund verwenden?", confirmLabel: "Foto entfernen" });
        if (remove) { saveFaith({ photo: "" }); showToast("Foto entfernt."); }
        return;
      }
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/png,image/jpeg,image/webp";
      input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) { showToast("Das Foto ist zu groß (höchstens 3 MB).", true); return; }
        const reader = new FileReader();
        reader.onload = () => {
          saveFaith({ photo: String(reader.result) }, { immediate: true }).then(() => showToast("Foto gespeichert. 🖼️")).catch((error) => showToast(error.message, true));
        };
        reader.readAsDataURL(file);
      });
      input.click();
    }
    if (action === "faithPin") {
      if (faith().pin) {
        const ok = await confirmSheet({ title: "PIN entfernen?", text: "Der Bereich Glaube ist danach ohne PIN erreichbar. Deine Daten bleiben verschlüsselt.", confirmLabel: "Entfernen", danger: true });
        if (ok) { saveFaith({ pin: "", pinSalt: "" }); showToast("PIN entfernt."); }
        return;
      }
      const { dialog, close } = openSheet({
        title: "PIN festlegen",
        body: `<p class="sheet-text">4 bis 8 Ziffern. Ohne PIN kommst du nicht mehr in den Bereich – merk sie dir gut.</p>
          <input id="pin-a" type="password" inputmode="numeric" maxlength="8" placeholder="PIN">
          <input id="pin-b" type="password" inputmode="numeric" maxlength="8" placeholder="PIN wiederholen">
          <div class="sheet-actions"><button class="button button-primary" id="pin-save" type="button">Speichern</button></div>`,
      });
      dialog.querySelector("#pin-save").addEventListener("click", async () => {
        const a = dialog.querySelector("#pin-a").value;
        if (!/^\d{4,8}$/.test(a)) return showToast("Bitte 4 bis 8 Ziffern.", true);
        if (a !== dialog.querySelector("#pin-b").value) return showToast("Die PINs stimmen nicht überein.", true);
        const salt = crypto.randomUUID();
        await saveFaith({ pin: await hashPin(a, salt), pinSalt: salt }, { immediate: true });
        close();
        showToast("PIN gespeichert. 🔒");
        return undefined;
      });
    }
    if (action === "faithDelete") {
      const ok = await confirmSheet({ title: "Alle Glaubens-Daten löschen?", text: "Tagebuch, Gebets-Tracker, Lesezeichen, Standort und alle Einstellungen dieses Bereichs werden endgültig gelöscht. Das kann nicht rückgängig gemacht werden.", confirmLabel: "Endgültig löschen", danger: true });
      if (ok) {
        await deleteFaith();
        showToast("Alle Glaubens-Daten wurden gelöscht.");
        window.dispatchEvent(new CustomEvent("reso:navigate", { detail: "settings" }));
      }
    }
    if (action === "quit") {
      const ok = await confirmSheet({ title: "Life beenden?", text: "Life beendet sich in 30 Minuten. Bis dahin kannst du es dir anders überlegen – über das Banner oben oder das Symbol unten rechts.", confirmLabel: "Countdown starten", danger: true });
      if (ok) {
        await api("/api/app/quit", { method: "POST", body: { action: "start" } });
        showToast("Countdown gestartet. Du kannst ihn jederzeit abbrechen.");
      }
    }
    if (action === "export") {
      try {
        const [settings, analytics] = await Promise.all([api("/api/settings"), api("/api/analytics")]);
        const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), preferences: prefs, settings, analytics }, null, 2)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `reso-export-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      } catch (error) {
        showToast(error.message, true);
      }
    }
    if (action === "reset") {
      const ok = await confirmSheet({
        title: "Darstellung zurücksetzen?",
        text: "Alle Einstellungen dieser Oberfläche werden auf die Standardwerte gesetzt. Dein Fortschritt, deine Streak und deine Ziele bleiben erhalten.",
        confirmLabel: "Zurücksetzen",
        danger: true,
      });
      if (ok) {
        await resetPrefs();
        window.dispatchEvent(new CustomEvent("reso:navigate", { detail: "settings" }));
      }
    }
  });

  // live preview of the sidebar width change
  const stopLayout = onPrefChange((key) => {
    if (key === "sidebarCompact") window.dispatchEvent(new Event("reso:layout"));
    if (key === "theme") {
      root.querySelectorAll(".swatch").forEach((swatch) => {
        const [light, dark] = ACCENTS[swatch.dataset.value];
        swatch.style.setProperty("--swatch", document.documentElement.dataset.theme === "dark" ? dark : light);
      });
    }
  });

  // ---- navigation & search ---------------------------------------------------
  root.querySelectorAll("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      root.querySelector(`#group-${button.dataset.jump}`)?.scrollIntoView({ behavior: document.documentElement.dataset.motion === "off" ? "auto" : "smooth", block: "start" });
    });
  });
  root.querySelector("#settings-search").addEventListener("input", (event) => {
    const query = event.target.value.trim().toLowerCase();
    let any = false;
    root.querySelectorAll("[data-group]").forEach((group) => {
      let visible = 0;
      group.querySelectorAll("[data-row]").forEach((row) => {
        const match = !query || row.dataset.search.includes(query);
        row.hidden = !match;
        if (match) visible += 1;
      });
      group.hidden = !visible;
      any ||= visible > 0;
    });
    root.querySelector("#settings-empty").hidden = any;
  });

  if (pendingJump) {
    const target = root.querySelector(`#group-${pendingJump}`);
    pendingJump = "";
    requestAnimationFrame(() => target?.scrollIntoView({ block: "start" }));
  }

  return () => {
    stopListening();
    stopLayout();
    Object.keys(timers).forEach(flushBackend); // never drop an edit made just before leaving
  };
}
