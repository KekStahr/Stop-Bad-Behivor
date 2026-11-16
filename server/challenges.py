"""Community challenges: ~300 entries built from hand-written ideas in several lengths."""

CATEGORIES = {
    "free": ("🔓", "Frei werden"),
    "body": ("💪", "Körper"),
    "mind": ("🧠", "Kopf & Seele"),
    "digital": ("📵", "Digital"),
    "people": ("🤝", "Miteinander"),
    "faith": ("🕊️", "Glaube & Stille"),
    "life": ("🏡", "Alltag & Ordnung"),
    "money": ("💶", "Geld"),
    "create": ("🎨", "Kreativ"),
    "nature": ("🌿", "Natur"),
}

# The original six keep their ids so nobody loses progress.
LEGACY = [
    {"id": "7-days", "emoji": "🔥", "title": "7 Tage stark", "days": 7, "category": "free", "text": "Eine Woche frei – gemeinsam. Hake jeden Tag ab, an dem du durchgehalten hast."},
    {"id": "30-days", "emoji": "🏔️", "title": "30-Tage-Gipfel", "days": 30, "category": "free", "text": "Ein ganzer Monat. Der Gipfel ist hoch, aber du gehst nicht allein."},
    {"id": "focus-10", "emoji": "⏱️", "title": "Jeden Tag 10 Min. Fokus", "days": 14, "category": "mind", "text": "Zwei Wochen lang täglich zehn Minuten ohne Ablenkung."},
    {"id": "gratitude", "emoji": "🙏", "title": "Dankbarkeits-Woche", "days": 7, "category": "mind", "text": "Schreib jeden Tag eine Sache auf, für die du dankbar bist."},
    {"id": "move", "emoji": "🏃", "title": "Jeden Tag bewegen", "days": 21, "category": "body", "text": "21 Tage, jeden Tag mindestens 20 Minuten Bewegung – Spaziergang zählt."},
    {"id": "screen-free", "emoji": "🌙", "title": "Bildschirmfreie Abende", "days": 7, "category": "digital", "text": "Ab 21 Uhr kein Handy im Bett. Besser schlafen, weniger Verlangen."},
]

# (slug, category, emoji, title with {d}, text, lengths in days)
IDEAS = [
    ("clean", "free", "🌱", "{d} Tage clean", "Jeden Tag frei von deiner Sucht. Ein Tag nach dem anderen.", [3, 14, 60, 90, 180, 365]),
    ("no-alcohol", "free", "🍃", "{d} Tage ohne Alkohol", "Kein Tropfen. Spür, wie dein Körper und dein Schlaf sich erholen.", [7, 14, 30, 60, 100]),
    ("no-smoke", "free", "🚭", "{d} Tage rauchfrei", "Keine Zigarette, keine Vape. Deine Lunge sagt Danke.", [3, 7, 14, 30, 60]),
    ("no-gambling", "free", "🎲", "{d} Tage ohne Glücksspiel", "Keine Wette, kein Slot, kein Los. Dein Geld bleibt bei dir.", [7, 14, 30, 90]),
    ("no-porn", "free", "🛡️", "{d} Tage ohne Pornos", "Klarer Kopf, echte Nähe. Jeder Tag zählt.", [7, 14, 30, 90]),
    ("no-weed", "free", "🍂", "{d} Tage ohne Kiffen", "Kein Joint, keine Bong. Wach werden für dein Leben.", [7, 14, 30, 60]),
    ("no-gaming", "free", "🎮", "{d} Tage ohne Zocken", "Die Konsole bleibt aus. Hol dir deine Zeit zurück.", [3, 7, 14, 30]),
    ("no-sugar", "free", "🍬", "{d} Tage ohne Süßigkeiten", "Kein Zucker-Snack. Dein Heißhunger wird leiser.", [3, 7, 14, 30]),
    ("no-energy", "free", "⚡", "{d} Tage ohne Energy-Drinks", "Natürliche Energie statt Dosen-Kick.", [7, 14, 30]),
    ("no-shopping", "free", "🛍️", "{d} Tage ohne Spontankäufe", "Nur kaufen, was auf der Liste steht.", [7, 14, 30]),
    ("no-fastfood", "free", "🍔", "{d} Tage ohne Fast Food", "Kein Lieferdienst, kein Drive-in.", [7, 14, 30]),
    ("urge-surf", "free", "🌊", "{d} Verlangen-Wellen aussitzen", "Jedes Mal, wenn Verlangen kommt: 15 Minuten warten und atmen.", [5, 10, 20]),
    ("trigger-log", "free", "📝", "{d} Tage Auslöser notieren", "Schreib auf, wann und warum das Verlangen kam. Muster erkennen heißt gewinnen.", [7, 14]),
    ("if-then", "free", "🧩", "Wenn-Dann-Plan, {d} Tage", "Jeden Tag einen konkreten Plan für die schwerste Stunde machen.", [5, 10]),
    ("checkin", "free", "✅", "{d} Tage einchecken", "Jeden Tag den Check-in in Life machen. Ehrlich, auch an schlechten Tagen.", [7, 14, 30, 60]),
    ("walk", "body", "🚶", "{d} Tage 8.000 Schritte", "Jeden Tag 8.000 Schritte – der einfachste Weg zu mehr Energie.", [7, 14, 30]),
    ("water", "body", "💧", "{d} Tage 2 Liter Wasser", "Genug trinken hilft gegen Kopfschmerz, Müdigkeit und Verlangen.", [7, 14, 21]),
    ("pushups", "body", "💪", "{d} Tage Liegestütze", "Jeden Tag ein paar mehr. Fang mit fünf an.", [7, 14, 30]),
    ("squats", "body", "🦵", "{d} Tage Kniebeugen", "Jeden Tag 20 Kniebeugen – auch zwischendurch.", [7, 14, 30]),
    ("stretch", "body", "🤸", "{d} Tage Dehnen", "10 Minuten dehnen. Weniger Verspannung, mehr Ruhe.", [7, 14, 21]),
    ("run", "body", "🏃", "{d} Tage laufen", "Jeden Tag mindestens 15 Minuten joggen – langsam ist erlaubt.", [7, 14, 30]),
    ("cycle", "body", "🚴", "{d} Tage Fahrrad statt Auto", "Kurze Wege mit dem Rad oder zu Fuß.", [7, 14]),
    ("cold-shower", "body", "🚿", "{d} Tage kalt duschen", "30 Sekunden kalt am Ende. Training für deine Willenskraft.", [7, 14, 30]),
    ("sleep", "body", "😴", "{d} Tage 7 Stunden Schlaf", "Ausgeschlafen ist Verlangen schwächer.", [7, 14, 30]),
    ("bedtime", "body", "🛏️", "{d} Tage vor 23 Uhr ins Bett", "Späte Nächte sind oft die schwersten. Geh früher schlafen.", [7, 14, 21]),
    ("veggies", "body", "🥦", "{d} Tage Gemüse zu jeder Mahlzeit", "Bunt essen, stabil bleiben.", [7, 14]),
    ("breakfast", "body", "🍳", "{d} Tage gesund frühstücken", "Ein guter Start verhindert Heißhunger am Nachmittag.", [7, 14]),
    ("cook", "body", "🍲", "{d} Tage selbst kochen", "Jeden Tag eine Mahlzeit selbst zubereiten.", [7, 14, 21]),
    ("posture", "body", "🧍", "{d} Tage jede Stunde aufstehen", "Wer lange sitzt, wird anfälliger. Steh jede Stunde kurz auf.", [5, 10]),
    ("yoga", "body", "🧘", "{d} Tage Yoga", "15 Minuten Yoga – Körper und Kopf werden ruhig.", [7, 14, 30]),
    ("plank", "body", "⏳", "{d} Tage Plank", "Jeden Tag ein paar Sekunden länger halten.", [7, 14, 30]),
    ("stairs", "body", "🏢", "{d} Tage Treppe statt Aufzug", "Kleine Entscheidungen, große Wirkung.", [7, 14]),
    ("breathing", "mind", "🌬️", "{d} Tage Atemübung", "Jeden Tag 5 Minuten bewusst atmen. Dein Notfall-Werkzeug wird stärker.", [7, 14, 30]),
    ("journal", "mind", "📓", "{d} Tage Tagebuch", "Ein paar Sätze am Abend: Wie war dein Tag wirklich?", [7, 14, 30]),
    ("three-good", "mind", "✨", "{d} Tage: drei gute Dinge", "Jeden Abend drei Dinge notieren, die gut waren.", [7, 14, 21]),
    ("meditate", "mind", "🧘", "{d} Tage meditieren", "10 Minuten Stille. Gedanken kommen und gehen lassen.", [7, 14, 30]),
    ("read", "mind", "📚", "{d} Tage lesen", "Jeden Tag 15 Seiten in einem Buch.", [7, 14, 30]),
    ("learn", "mind", "🎓", "{d} Tage etwas Neues lernen", "Eine Sprache, ein Instrument, ein Handwerk – 15 Minuten am Tag.", [7, 14, 30]),
    ("affirm", "mind", "🪞", "{d} Tage freundlich mit dir", "Sag dir jeden Morgen einen freundlichen Satz.", [7, 14]),
    ("why-read", "mind", "♥", "{d} Tage dein Warum lesen", "Lies jeden Morgen dein Warum. Erinnere dich, wofür du kämpfst.", [7, 14, 30]),
    ("no-complain", "mind", "🤐", "{d} Tage ohne Jammern", "Bemerke, wie oft du klagst – und ersetze es durch eine Lösung.", [3, 7, 14]),
    ("future-letter", "mind", "💌", "Brief an dein Zukunfts-Ich ({d} Tage)", "Jeden Tag ein paar Zeilen an dich in einem Jahr.", [5, 7]),
    ("focus-25", "mind", "⏱️", "{d} Tage 25 Min. Fokus", "Eine Fokus-Session pro Tag mit dem Life-Timer.", [7, 14, 30]),
    ("podcast", "mind", "🎧", "{d} Tage etwas Aufbauendes hören", "Ein Podcast oder Hörbuch, das dich stärkt.", [7, 14]),
    ("music", "mind", "🎵", "{d} Tage Musik statt Grübeln", "Wenn die Gedanken kreisen: ein Lied, das dir guttut.", [7, 14]),
    ("no-phone-morning", "digital", "🌅", "{d} Tage handyfreier Morgen", "Die erste Stunde nach dem Aufwachen gehört dir, nicht dem Handy.", [7, 14, 30]),
    ("screen-limit", "digital", "📱", "{d} Tage unter 2 Std. Bildschirmzeit", "Freizeit-Bildschirm unter zwei Stunden.", [7, 14, 30]),
    ("no-socials", "digital", "📵", "{d} Tage ohne Social Media", "Keine Feeds, kein Scrollen. Mehr echtes Leben.", [3, 7, 14, 30]),
    ("no-shorts", "digital", "🎬", "{d} Tage ohne Kurzvideos", "Kein TikTok, keine Reels, keine Shorts.", [7, 14, 30]),
    ("notifications", "digital", "🔕", "{d} Tage Mitteilungen aus", "Nur Anrufe und Nachrichten von Menschen. Alles andere: stumm.", [7, 14]),
    ("gray-screen", "digital", "⚫", "{d} Tage Graustufen-Handy", "Stell dein Display auf Graustufen – plötzlich ist es langweilig.", [7, 14]),
    ("phone-free-meal", "digital", "🍽️", "{d} Tage Essen ohne Handy", "Jede Mahlzeit ohne Bildschirm.", [7, 14, 21]),
    ("digital-sabbath", "digital", "🔌", "{d} Offline-Tage", "Einen ganzen Tag pro Woche ohne Internet.", [2, 4]),
    ("unfollow", "digital", "🧹", "{d} Tage Feed aufräumen", "Jeden Tag Accounts entfolgen, die dir nicht guttun.", [3, 7]),
    ("blocker", "digital", "🧱", "{d} Tage mit Schutzfilter", "Lass die Schutz-Kategorien von Life und einen Seitenblocker aktiv.", [7, 30]),
    ("call", "people", "📞", "{d} Tage jemanden anrufen", "Jeden Tag ein echtes Gespräch – nicht nur Textnachrichten.", [7, 14]),
    ("kind", "people", "😊", "{d} Tage eine gute Tat", "Jeden Tag etwas Gutes für einen anderen Menschen.", [7, 14, 30]),
    ("compliment", "people", "💬", "{d} Tage ein Kompliment", "Sag jeden Tag jemandem etwas Ehrliches und Schönes.", [7, 14]),
    ("family-time", "people", "👨‍👩‍👧", "{d} Tage Familienzeit", "Jeden Tag bewusst Zeit mit deiner Familie – ohne Bildschirm.", [7, 14, 30]),
    ("encourage", "people", "💛", "{d} Tage jemanden ermutigen", "Schreib in der Community jemandem ein ermutigendes Wort.", [7, 14]),
    ("thank-you", "people", "✉️", "{d} Tage Danke sagen", "Bedanke dich jeden Tag bei einem Menschen – persönlich.", [7, 14]),
    ("sorry", "people", "🕊️", "Wiedergutmachung: {d} Entschuldigungen", "Entschuldige dich bei Menschen, die deine Sucht verletzt hat.", [2, 3, 5]),
    ("volunteer", "people", "🤲", "{d} Mal ehrenamtlich helfen", "Tafel, Verein, Nachbarschaft – irgendwo, wo Hilfe gebraucht wird.", [3, 5, 10]),
    ("group", "people", "👥", "{d} Selbsthilfe-Treffen", "Geh zu einer Selbsthilfegruppe – vor Ort oder online.", [3, 6, 12]),
    ("listen", "people", "👂", "{d} Tage richtig zuhören", "Lass andere ausreden, frag nach, hör wirklich zu.", [7, 14]),
    ("friend-meet", "people", "☕", "{d} Treffen mit Freunden", "Triff Menschen, die dir guttun – nüchtern.", [3, 5, 10]),
    ("pray-daily", "faith", "🙏", "{d} Tage jeden Tag beten", "Ein Gebet am Morgen und eins am Abend – in deinem Glauben.", [7, 14, 30]),
    ("scripture", "faith", "📖", "{d} Tage in der Schrift lesen", "Jeden Tag ein Abschnitt aus Bibel oder Koran.", [7, 14, 30]),
    ("silence", "faith", "🤫", "{d} Tage 10 Minuten Stille", "Einfach still sein – mit Gott oder mit dir selbst.", [7, 14, 21]),
    ("evening-review", "faith", "🌙", "{d} Tage Abendrückblick", "Examen oder Muḥāsaba: Was war gut, was nicht?", [7, 14, 30]),
    ("memorize", "faith", "🧠", "{d} Verse auswendig lernen", "Lerne Worte, die dich in schweren Momenten tragen.", [3, 7, 12]),
    ("fast-day", "faith", "🌒", "{d} Fastentage", "Bewusst verzichten – nach den Regeln deines Glaubens oder auf eine Gewohnheit.", [2, 4, 8]),
    ("forgive", "faith", "💛", "{d} Tage vergeben", "Jeden Tag einem Menschen – oder dir selbst – etwas vergeben.", [7, 14]),
    ("blessing", "faith", "✨", "{d} Tage Segen zählen", "Zähle jeden Abend die Segnungen des Tages.", [7, 14, 30]),
    ("tidy", "life", "🧺", "{d} Tage 10 Minuten aufräumen", "Ordnung außen hilft bei Ordnung innen.", [7, 14, 21]),
    ("bed", "life", "🛏️", "{d} Tage Bett machen", "Die erste kleine Aufgabe des Tages – erledigt.", [7, 14, 30]),
    ("plan-day", "life", "🗓️", "{d} Tage den Tag planen", "Abends drei Dinge für morgen aufschreiben.", [7, 14, 21]),
    ("routine", "life", "⏰", "{d} Tage feste Aufstehzeit", "Jeden Tag zur gleichen Zeit aufstehen – auch am Wochenende.", [7, 14, 30]),
    ("paperwork", "life", "📂", "{d} Tage Papierkram", "Jeden Tag eine liegengebliebene Aufgabe erledigen.", [5, 10]),
    ("job", "life", "💼", "{d} Bewerbungs-Tage", "Lebenslauf, Anschreiben, Bewerbung – jeden Tag ein Schritt.", [5, 10, 20]),
    ("declutter", "life", "📦", "{d} Tage ausmisten", "Jeden Tag einen Gegenstand verschenken oder wegwerfen.", [7, 14, 30]),
    ("no-snooze", "life", "⏰", "{d} Tage ohne Schlummertaste", "Aufstehen beim ersten Klingeln.", [7, 14]),
    ("save-daily", "money", "🐷", "{d} Tage etwas sparen", "Leg jeden Tag einen kleinen Betrag zur Seite.", [7, 14, 30]),
    ("budget", "money", "📊", "{d} Tage Ausgaben notieren", "Jede Ausgabe aufschreiben – Klarheit schafft Kontrolle.", [7, 14, 30]),
    ("no-spend", "money", "🚫", "{d} Tage ohne unnötige Ausgaben", "Nur das Nötigste kaufen.", [3, 7, 14]),
    ("debt", "money", "🧾", "{d} Tage an Schulden arbeiten", "Jeden Tag ein Schritt: Überblick, Anruf, Rate, Beratung.", [5, 10]),
    ("goal-save", "money", "🎯", "{d} Tage fürs Sparziel", "Überweise das gesparte Suchtgeld auf dein Ziel.", [7, 14, 30]),
    ("draw", "create", "✏️", "{d} Tage zeichnen", "Jeden Tag eine kleine Skizze. Schön muss sie nicht sein.", [7, 14, 30]),
    ("write", "create", "🖋️", "{d} Tage schreiben", "Ein Gedicht, eine Geschichte, ein paar Zeilen.", [7, 14]),
    ("photo", "create", "📷", "{d} Tage ein schönes Foto", "Halte jeden Tag etwas Schönes fest.", [7, 14, 30]),
    ("instrument", "create", "🎸", "{d} Tage üben", "Jeden Tag 15 Minuten ein Instrument.", [7, 14, 30]),
    ("craft", "create", "🧶", "{d} Tage mit den Händen", "Basteln, Reparieren, Handwerk – Hände beschäftigt, Kopf frei.", [7, 14]),
    ("cook-new", "create", "👩‍🍳", "{d} neue Rezepte", "Probier etwas Neues in der Küche.", [3, 5, 10]),
    ("outside", "nature", "🌳", "{d} Tage 20 Minuten draußen", "Frische Luft, Tageslicht, Bewegung.", [7, 14, 30]),
    ("sunrise", "nature", "🌄", "{d} Sonnenaufgänge", "Steh früh auf und sieh den Tag beginnen.", [3, 5, 7]),
    ("plant", "nature", "🌱", "{d} Tage eine Pflanze pflegen", "Etwas wachsen sehen, das du versorgst.", [14, 30]),
    ("clean-up", "nature", "🗑️", "{d} Mal Müll sammeln", "15 Minuten in deiner Umgebung aufräumen.", [3, 5, 10]),
    ("hike", "nature", "🥾", "{d} Wanderungen", "Raus in die Natur – mindestens eine Stunde.", [2, 4, 8]),
    ("barefoot", "nature", "🦶", "{d} Tage barfuß im Gras", "Ein paar Minuten Erde unter den Füßen.", [5, 10]),
    ("gathering", "faith", "⛪", "{d} Besuche in Moschee oder Kirche", "Gemeinschaft im Glauben – geh hin, auch wenn es Überwindung kostet.", [2, 4, 8]),
    ("no-caffeine-late", "body", "☕", "{d} Tage kein Koffein nach 14 Uhr", "Besserer Schlaf, ruhigere Abende.", [7, 14]),
    ("walk-no-phone", "nature", "🚶", "{d} Spaziergänge ohne Handy", "Nur du, deine Gedanken und die Welt um dich.", [5, 10]),
    ("language", "mind", "🗣️", "{d} Tage eine Sprache lernen", "Jeden Tag 10 Minuten Vokabeln oder eine Lektion.", [14, 30]),
    ("reach-out", "people", "🤝", "{d} Tage Vertrauensperson sein", "Sei als Vertrauensperson erreichbar und hilf, wenn jemand fragt.", [7, 14]),
    ("no-late-snack", "body", "🌙", "{d} Tage nichts nach 20 Uhr essen", "Abends leichter – nachts ruhiger.", [7, 14]),
    ("honest", "mind", "💯", "{d} Tage radikal ehrlich", "Keine kleinen Lügen, auch nicht über deine Sucht.", [7, 14]),
]

UNIT_ONLY = {"urge-surf", "sorry", "volunteer", "group", "friend-meet", "memorize", "fast-day", "cook-new", "sunrise", "clean-up", "hike", "digital-sabbath", "job"}


def _build():
    challenges = list(LEGACY)
    seen = {challenge["id"] for challenge in LEGACY}
    for slug, category, emoji, title, text, lengths in IDEAS:
        for days in lengths:
            cid = f"{slug}-{days}"
            if cid in seen:
                continue
            seen.add(cid)
            label = title.format(d=days)
            if days == 1 and slug not in UNIT_ONLY:
                label = label.replace("1 Tage", "1 Tag")
            challenges.append({"id": cid, "emoji": emoji, "title": label, "days": days, "category": category, "text": text})
    return challenges


CHALLENGES = _build()
CHALLENGE_IDS = {challenge["id"] for challenge in CHALLENGES}
