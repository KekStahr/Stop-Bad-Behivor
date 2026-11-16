// Recovery domain data shared by home, stats and the SOS sheet.
const DAY = 86400;

export const ADDICTIONS = {
  general: { label: "Allgemein / Gewohnheit", emoji: "🌱", channel: "general" },
  alcohol: { label: "Alkohol", emoji: "🍷", channel: "alcohol" },
  nicotine: { label: "Nikotin / Rauchen", emoji: "🚭", channel: "nicotine" },
  drugs: { label: "Drogen / Medikamente", emoji: "💊", channel: "drugs" },
  gambling: { label: "Glücksspiel", emoji: "🎰", channel: "gambling" },
  gaming: { label: "Gaming", emoji: "🎮", channel: "gaming" },
  porn: { label: "Pornografie", emoji: "🔞", channel: "porn" },
  social: { label: "Social Media", emoji: "📱", channel: "social" },
  food: { label: "Essen", emoji: "🍔", channel: "food" },
  shopping: { label: "Kaufsucht", emoji: "🛍️", channel: "shopping" },
};

// Dense early (almost daily), sparser later – the beginning is the hardest part.
const MAJOR = {
  1: ["1 Tag", "🌱"], 3: ["3 Tage", "🌿"], 7: ["1 Woche", "⭐"], 14: ["2 Wochen", "🛡️"], 21: ["3 Wochen", "⚡"],
  30: ["1 Monat", "🏅"], 60: ["2 Monate", "🔥"], 90: ["3 Monate", "💎"], 100: ["100 Tage", "💯"], 180: ["6 Monate", "🚀"],
  200: ["200 Tage", "🌠"], 270: ["9 Monate", "🌻"], 365: ["1 Jahr", "👑"], 500: ["500 Tage", "🏆"], 548: ["1½ Jahre", "🌈"],
  730: ["2 Jahre", "🌍"], 1000: ["1000 Tage", "🎖️"], 1095: ["3 Jahre", "🏔️"], 1460: ["4 Jahre", "🦅"], 1825: ["5 Jahre", "🌟"],
  2000: ["2000 Tage", "🎆"], 2555: ["7 Jahre", "🌳"], 3650: ["10 Jahre", "🕊️"],
};
const MINOR_ICONS = ["🌱", "🍀", "🌼", "✨", "💪", "🌤️", "🎯", "🌊", "🔆", "🧭", "🌸", "💫", "🪴", "🎈", "🌙", "☀️"];

function buildMilestones() {
  const days = new Set([1 / 24, 3 / 24, 6 / 24, 12 / 24, 18 / 24, ...Object.keys(MAJOR).map(Number)]);
  const steps = [[1, 60, 1], [62, 120, 2], [123, 180, 3], [185, 365, 5], [372, 730, 7], [744, 1825, 14], [1855, 3650, 30]];
  for (const [from, to, step] of steps) for (let day = from; day <= to; day += step) days.add(day);
  return [...days].sort((a, b) => a - b).map((day, index) => {
    if (day < 1) {
      const hours = Math.round(day * 24);
      return { days: day, label: `${hours} ${hours === 1 ? "Stunde" : "Stunden"}`, icon: "⏳", major: false };
    }
    const major = MAJOR[day];
    return major
      ? { days: day, label: major[0], icon: major[1], major: true }
      : { days: day, label: `Tag ${day}`, icon: MINOR_ICONS[index % MINOR_ICONS.length], major: false };
  });
}

export const MILESTONES = buildMilestones();
export const MAJOR_MILESTONES = MILESTONES.filter((milestone) => milestone.major);

export function soberSeconds(streakStart) {
  if (!streakStart) return 0;
  const start = new Date(streakStart).getTime();
  return Number.isFinite(start) ? Math.max(0, (Date.now() - start) / 1000) : 0;
}

export function nextMilestone(seconds) {
  const days = seconds / DAY;
  const index = MILESTONES.findIndex((milestone) => milestone.days > days);
  if (index === -1) return { next: null, previous: MILESTONES.at(-1), progress: 1 };
  const previousDays = index === 0 ? 0 : MILESTONES[index - 1].days;
  const next = MILESTONES[index];
  return {
    next,
    previous: MILESTONES[index - 1] || null,
    progress: (days - previousDays) / (next.days - previousDays),
    remainingSeconds: next.days * DAY - seconds,
  };
}

export function splitDuration(seconds) {
  let rest = Math.floor(seconds);
  const days = Math.floor(rest / DAY);
  rest %= DAY;
  return { days, hours: Math.floor(rest / 3600), minutes: Math.floor((rest % 3600) / 60), seconds: rest % 60 };
}

export function humanDuration(seconds) {
  const { days, hours, minutes } = splitDuration(seconds);
  if (days >= 1) return `${days} ${days === 1 ? "Tag" : "Tage"}${hours ? ` ${hours} Std.` : ""}`;
  if (hours >= 1) return `${hours} Std. ${minutes} Min.`;
  return `${minutes} Min.`;
}

const nicotine = [
  [20 / 1440, "20 Minuten", "Puls und Blutdruck beginnen, sich zu normalisieren."],
  [0.5, "12 Stunden", "Der Kohlenmonoxid-Spiegel im Blut sinkt auf Normalwerte."],
  [2, "2 Tage", "Geruchs- und Geschmackssinn beginnen sich zu erholen."],
  [14, "2 Wochen", "Durchblutung und Lungenfunktion verbessern sich spürbar."],
  [90, "3 Monate", "Husten und Kurzatmigkeit nehmen bei vielen deutlich ab."],
  [365, "1 Jahr", "Das Risiko für koronare Herzkrankheit ist etwa halb so hoch wie beim Rauchen."],
  [1825, "5 Jahre", "Das Schlaganfallrisiko sinkt deutlich – bei vielen bis auf das Niveau von Nichtrauchenden."],
  [3650, "10 Jahre", "Das Lungenkrebsrisiko ist etwa halb so hoch wie bei Rauchenden."],
  [5475, "15 Jahre", "Das Herzinfarktrisiko entspricht etwa dem von Menschen, die nie geraucht haben."],
];

const alcohol = [
  [3, "3 Tage", "Akute Entzugssymptome klingen bei den meisten ab – der Körper beginnt sich zu regulieren."],
  [7, "1 Woche", "Der Schlaf wird oft tiefer und erholsamer."],
  [14, "2 Wochen", "Die Magenschleimhaut kann sich erholen; Sodbrennen wird seltener."],
  [30, "1 Monat", "Leberfett kann deutlich zurückgehen, der Blutdruck sinkt häufig, die Haut wirkt frischer."],
  [90, "3 Monate", "Mehr Energie und Konzentration; viele Blutwerte verbessern sich."],
  [365, "1 Jahr", "Das Risiko für Leber-, Herz- und Krebserkrankungen sinkt deutlich."],
];

const behavioural = [
  [1, "1 Tag", "Du hast bewiesen, dass es geht. Der erste Tag ist oft der schwerste."],
  [3, "3 Tage", "Die ersten, meist intensivsten Tage liegen hinter dir."],
  [7, "1 Woche", "Neue Routinen beginnen sich zu formen."],
  [14, "2 Wochen", "Verlangen tritt bei vielen seltener und schwächer auf."],
  [30, "1 Monat", "Viele berichten von besserem Schlaf, mehr Klarheit und stabilerer Stimmung."],
  [66, "66 Tage", "So lange dauert es im Schnitt, bis neues Verhalten automatisch wird (Lally et al., 2009)."],
  [90, "3 Monate", "Viele erleben wieder mehr Freude an alltäglichen Dingen."],
  [180, "6 Monate", "Mehr Selbstvertrauen, stabilere Beziehungen, neue Interessen."],
  [365, "1 Jahr", "Ein ganzes Jahr. Ein neues Kapitel deines Lebens."],
];

export function benefitTimeline(addiction) {
  const list = addiction === "nicotine" ? nicotine : addiction === "alcohol" ? alcohol : behavioural;
  return list.map(([days, label, text]) => ({ days, label, text }));
}

export function medicalWarning(addiction) {
  if (addiction === "alcohol") {
    return "Bei langem oder starkem Alkoholkonsum kann ein Entzug gefährlich sein (z. B. Krampfanfälle). Bitte lass ihn ärztlich begleiten.";
  }
  if (addiction === "drugs") {
    return "Der Entzug von bestimmten Substanzen (z. B. Benzodiazepine, Opioide) kann gefährlich sein. Bitte lass ihn ärztlich begleiten.";
  }
  return "";
}

export const HELP_LINES = {
  de: [
    { name: "Notruf", number: "112", note: "Bei akuter Gefahr für Leben" },
    { name: "TelefonSeelsorge", number: "0800 111 0 111", note: "Kostenlos, anonym, 24/7" },
    { name: "TelefonSeelsorge", number: "116 123", note: "Kostenlos, anonym, 24/7" },
    { name: "Sucht & Drogen Hotline", number: "01806 313031", note: "24/7 · 0,20 € pro Anruf" },
    { name: "BZgA Glücksspielsucht", number: "0800 1 37 27 00", note: "Kostenlos" },
    { name: "BZgA Rauchfrei-Telefon", number: "0800 8 31 31 31", note: "Kostenlos" },
  ],
  at: [
    { name: "Notruf", number: "112", note: "Bei akuter Gefahr für Leben" },
    { name: "Telefonseelsorge", number: "142", note: "Kostenlos, anonym, 24/7" },
    { name: "Rat auf Draht", number: "147", note: "Für junge Menschen, 24/7" },
  ],
  ch: [
    { name: "Notruf", number: "112", note: "Bei akuter Gefahr für Leben" },
    { name: "Die Dargebotene Hand", number: "143", note: "Anonym, 24/7" },
    { name: "Pro Juventute", number: "147", note: "Für junge Menschen, 24/7" },
  ],
};

export const BREATH_PATTERNS = {
  box: { label: "Box (4-4-4-4)", steps: [["Einatmen", 4], ["Halten", 4], ["Ausatmen", 4], ["Halten", 4]] },
  calm: { label: "Beruhigend (4-7-8)", steps: [["Einatmen", 4], ["Halten", 7], ["Ausatmen", 8]] },
  simple: { label: "Einfach (4-6)", steps: [["Einatmen", 4], ["Ausatmen", 6]] },
};

export const AFFORDABLE = [
  { label: "Kinobesuche", price: 13, emoji: "🎬" },
  { label: "Essen gehen", price: 35, emoji: "🍝" },
  { label: "Konzerttickets", price: 70, emoji: "🎤" },
  { label: "Monate Fitnessstudio", price: 35, emoji: "🏋️" },
  { label: "Wochenendtrips", price: 350, emoji: "🧳" },
  { label: "Neue Smartphones", price: 800, emoji: "📱" },
  { label: "Urlaube", price: 1500, emoji: "🏝️" },
];

// Motivation: classic (public-domain) thinkers and our own words.
export const QUOTES = [
  ["Du musst nicht den ganzen Weg sehen. Nur den nächsten Schritt.", "Reşo"],
  ["Jeder Tag, an dem du dich für dich entscheidest, ist ein Sieg.", "Reşo"],
  ["Du bist nicht deine Sucht. Du bist der Mensch, der gerade aufsteht.", "Reşo"],
  ["Heute ist ein guter Tag, um stolz auf dich zu sein.", "Reşo"],
  ["Das Verlangen ist laut. Aber es ist nicht stärker als du.", "Reşo"],
  ["Kleine Schritte sind auch Schritte. Und sie führen weit.", "Reşo"],
  ["Du hast schon so viele schwere Tage überstanden. Auch diesen.", "Reşo"],
  ["Der Weg ist nicht gerade. Hauptsache, du gehst weiter.", "Reşo"],
  ["Dein Morgen-Ich wird dir für heute danken.", "Reşo"],
  ["Freiheit beginnt in dem Moment, in dem du Nein sagst.", "Reşo"],
  ["Mut ist nicht, keine Angst zu haben. Mut ist, trotzdem weiterzugehen.", "Reşo"],
  ["Du verdienst ein Leben, das sich gut anfühlt – nicht nur für einen Moment.", "Reşo"],
  ["Die Welle kommt. Die Welle geht. Du bleibst.", "Reşo"],
  ["Heute Nein sagen heißt morgen klar aufwachen.", "Reşo"],
  ["Du bist nicht allein. Tausende gehen diesen Weg mit dir.", "Reşo"],
  ["Sei geduldig mit dir. Frei werden braucht Übung.", "Reşo"],
  ["Ein Rückschlag ist ein Kapitel, nicht das Ende der Geschichte.", "Reşo"],
  ["Die Sucht will nur diesen Moment. Du willst dein Leben.", "Reşo"],
  ["Jede Stunde ohne ist ein Geschenk an dich selbst.", "Reşo"],
  ["Du warst stark genug anzufangen. Du bist stark genug weiterzumachen.", "Reşo"],
  ["Nüchtern ist nicht langweilig. Nüchtern ist echt.", "Reşo"],
  ["Jeder freie Tag ist ein Baustein für dein neues Leben.", "Reşo"],
  ["Kein Rausch ist so gut wie ein klarer Morgen.", "Reşo"],
  ["Morgen wirst du froh sein, dass du heute durchgehalten hast.", "Reşo"],
  ["Wir leiden öfter in der Vorstellung als in der Wirklichkeit.", "Seneca"],
  ["Nicht weil es schwer ist, wagen wir es nicht, sondern weil wir es nicht wagen, ist es schwer.", "Seneca"],
  ["Solange du lebst, lerne, wie man lebt.", "Seneca"],
  ["Du hast Macht über deinen Geist – nicht über äußere Ereignisse. Erkenne das, und du wirst Stärke finden.", "Marc Aurel"],
  ["Die Seele färbt sich durch die Gedanken.", "Marc Aurel"],
  ["Was uns im Weg steht, wird zum Weg.", "Marc Aurel"],
  ["Eine Reise von tausend Meilen beginnt mit einem einzigen Schritt.", "Laozi"],
  ["Wer andere besiegt, ist stark. Wer sich selbst besiegt, ist mächtig.", "Laozi"],
  ["Nicht die Dinge selbst beunruhigen uns, sondern unsere Meinungen über die Dinge.", "Epiktet"],
  ["Keiner ist frei, der nicht Herr über sich selbst ist.", "Epiktet"],
  ["Wer ein Warum zum Leben hat, erträgt fast jedes Wie.", "Friedrich Nietzsche"],
  ["Es ist nicht genug, zu wissen, man muss auch anwenden; es ist nicht genug, zu wollen, man muss auch tun.", "Johann Wolfgang von Goethe"],
  ["Auch aus Steinen, die einem in den Weg gelegt werden, kann man Schönes bauen.", "Johann Wolfgang von Goethe"],
  ["Wir sind, was wir wiederholt tun.", "nach Aristoteles"],
  ["Fall siebenmal hin, steh achtmal auf.", "Japanisches Sprichwort"],
  ["Auch der längste Winter endet mit einem Frühling.", "Sprichwort"],
  ["Es ist nie „nur einmal“. Bleib dran.", "Reşo"],
  ["Das Verlangen geht vorbei – ob du nachgibst oder nicht.", "Reşo"],
  ["Du musst heute nicht perfekt sein. Nur nüchtern.", "Reşo"],
];

export const QUOTE_INTERVALS = [
  ["visit", "Bei jedem Öffnen"],
  ["30", "Alle 30 Minuten"],
  ["60", "Jede Stunde"],
  ["180", "Alle 3 Stunden"],
  ["360", "Alle 6 Stunden"],
  ["1440", "Einmal am Tag"],
];

// Trigger catalog. The monitor matches typed text by substring and then intervenes hard,
// so every entry is specific (brands, sites, explicit phrases) to avoid false alarms.
// Crisis words are deliberately absent: searching for help must never be blocked.
export const TRIGGER_CATALOG = [
  { id: "gambling", label: "Glücksspiel & Sportwetten", emoji: "🎰", words: ["casino", "onlinecasino", "sportwetten", "pokerstars", "bet365", "tipico", "bwin.", "interwetten", "betway", "unibet", "lottoland", "spielautomat", "freispiele", "roulette", "blackjack", "mrgreen", "stake.com", "888casino", "wettanbieter", "slot spielen", "online casino", "sportwette", "partypoker", "ggpoker", "888poker", "betano", "betsson", "betfair", "betvictor", "sportingbet", "bet-at-home", "bet3000", "merkurbets", "merkur spiele", "merkurspiele", "merkur24", "mybet", "neobet", "neo.bet", "admiralbet", "admiral casino", "happybet", "cashpoint wetten", "xtip", "oddset", "lotto24", "tipp24", "eurojackpot", "rubbellos", "lotto spielen", "lottoschein", "baccarat", "mr green", "stake.us", "roobet", "rollbit", "bc.game", "duelbits", "gamdom", "csgoempire", "csgoroll", "hellcase", "skinclub", "keydrop", "key-drop", "case opening", "case öffnen", "jackpotcity", "jackpot city", "leovegas", "casumo", "wildz", "wunderino", "drückglück", "drueckglueck", "sunmaker", "jokerstar", "slotmagie", "löwen play", "loewen play", "lowen play", "spielothek", "spielhalle", "book of ra", "book of dead", "sweet bonanza", "gates of olympus", "big bass bonanza", "razor shark", "novoline", "gametwist", "slotpark", "slotomania", "huuuge casino", "coin master", "crashspiel", "crash game", "plinko", "1xbet", "22bet", "mostbet", "melbet", "parimatch", "williamhill", "william hill", "ladbrokes", "paddy power", "paddypower", "draftkings", "fanduel", "betmgm", "caesars sportsbook", "betrivers", "bovada", "betonline", "skybet", "sky bet", "betfred", "boylesports", "betclic", "winamax", "einzahlungsbonus", "bonus ohne einzahlung", "freispiele ohne einzahlung", "casino bonus", "no deposit bonus", "wettquoten", "kombiwette", "livewette", "live wetten", "wettschein", "wett tipps", "wetttipps", "sichere wetten", "pferdewetten", "esport wetten", "e-sport wetten", "jackpot knacken", "slots spielen", "online slots", "slot machine", "poker online", "online poker", "texas holdem", "live dealer", "live casino", "krypto casino", "crypto casino", "bitcoin casino", "ohne oasis", "oasis sperre", "wettbüro", "wettbuero", "spielbank"] },
  { id: "porn", label: "Pornografie", emoji: "🔞", words: ["pornhub", "xvideos", "xhamster", "xnxx", "youporn", "redtube", "onlyfans", "chaturbate", "stripchat", "brazzers", "spankbang", "livejasmin", "porno", "hentai", "camgirl", "erotikchat", "sexcam", "tube8", "eporner", "tnaflix", "porntrex", "hqporner", "beeg.com", "txxx", "hclips", "upornia", "porn.com", "porndig", "pornone", "porngo", "xxxbunker", "motherless", "rule34", "rule 34", "nhentai", "hanime", "e-hentai", "hentaihaven", "f95zone", "fansly", "manyvids", "clips4sale", "bongacams", "camsoda", "myfreecams", "flirt4free", "jerkmate", "cam4.com", "bangbros", "realitykings", "naughtyamerica", "teamskeet", "mofos", "digitalplayground", "blacked.com", "tushy.com", "vixen.com", "evilangel", "kink.com", "fakehub", "faketaxi", "pornpics", "imagefap", "erome.com", "thothub", "fapello", "coomer", "sxyprn", "pornhat", "ixxx", "4tube", "porntube", "youjizz", "slutload", "drtuber", "nuvid", "sunporno", "pornmd", "thumbzilla", "javhd", "missav", "xxx video", "pornstar", "porn video", "porn site", "pornsite", "free porn", "porn tube", "sexfilm", "sexvideo", "sex video", "nacktbilder", "nacktfotos", "nacktvideo", "erotikfilm", "erotikvideo", "erotik chat", "sexchat", "sex chat", "camsex", "cam sex", "webcam sex", "livesex", "live sex", "amateursex", "amateur sex", "sex cam", "nudes", "nsfw", "gonewild", "sexting", "milf porn", "milf video", "blowjob", "deepthroat", "creampie", "gangbang", "bukkake", "hardcore sex", "stepsister", "step sister", "stepsis", "stepmom", "sexgeschichten", "sex geschichten", "erotische geschichten", "escort service", "escortservice", "escort agentur", "kaufmich", "6profis", "ladies.de", "erotik.markt", "laufhaus", "bordell", "sexdate", "sex date", "sextreffen", "sex treffen", "fickdate", "c-date", "poppen.de"] },
  { id: "drugs", label: "Illegale Drogen", emoji: "💉", words: ["kokain", "crystal meth", "methamphetamin", "heroin", "fentanyl", "ecstasy", "mdma kaufen", "ketamin", "speed kaufen", "gras kaufen", "weed kaufen", "darknet markt", "lsd kaufen", "pillen kaufen", "dealer finden", "koks kaufen", "cocaine", "koks bestellen", "koksen", "crystal kaufen", "amphetamin", "pep kaufen", "carfentanil", "nitazene", "xylazin", "mdma", "molly kaufen", "keta kaufen", "lsd", "acid kaufen", "psilocybin", "magic mushrooms", "zauberpilze", "psilos kaufen", "magic truffles", "dmt kaufen", "dmt rauchen", "ayahuasca", "mephedron", "3-mmc", "4-mmc", "3mmc", "4mmc", "2c-b", "ghb", "gbl kaufen", "liquid ecstasy", "crack rauchen", "crack kaufen", "crackpfeife", "spice kaufen", "spice rauchen", "kräutermischung rauchen", "räuchermischung kaufen", "legal highs", "research chemicals", "badesalz kaufen", "lean trinken", "purple drank", "codein saft", "hustensaft high", "lachgas", "poppers", "opium", "morphin kaufen", "methadon kaufen", "subutex", "buprenorphin kaufen", "pregabalin kaufen", "lyrica kaufen", "kratom", "haschisch", "hasch kaufen", "cannabis kaufen", "marihuana kaufen", "dope kaufen", "thc liquid", "thc vape", "thc öl kaufen", "hhc kaufen", "hhc vape", "thcp", "joint drehen", "bong rauchen", "kiffen", "drogen kaufen", "drogen bestellen", "drogen darknet", "darknet market", "darknet shop", "dread forum", "tor drogen", "telegram dealer", "snapchat dealer", "dealer nummer", "plug finden", "benzos kaufen", "oxy kaufen", "microdosing", "dealer in der nähe", "drogen online", "koks"] },
  { id: "meds", label: "Medikamenten-Missbrauch", emoji: "💊", words: ["tilidin", "oxycodon", "tramadol", "benzodiazepin", "xanax", "valium", "diazepam", "lorazepam", "zolpidem", "codein", "ritalin kaufen", "rezeptfrei kaufen"] },
  { id: "alcohol", label: "Alkohol", emoji: "🍷", words: ["wodka", "vodka", "jägermeister", "schnaps", "spirituosen", "alkohol kaufen", "alkohol bestellen", "bier bestellen", "tequila", "whisky", "whiskey", "absinth", "kurze bestellen"] },
  { id: "nicotine", label: "Nikotin & Tabak", emoji: "🚬", words: ["zigaretten", "tabak kaufen", "e-zigarette", "vape kaufen", "elfbar", "liquid kaufen", "snus kaufen", "snus bestellen", "iqos", "shisha tabak", "marlboro", "nikotinbeutel", "einweg vape", "lost mary"] },
  { id: "gaming", label: "Gaming & Lootboxen", emoji: "🎮", words: ["fortnite", "valorant", "league of legends", "lootbox", "robux", "v-bucks", "fifa points", "genshin", "gacha", "store.steampowered", "battle pass", "clash of clans"] },
  { id: "social", label: "Social Media & Doomscrolling", emoji: "📱", words: ["tiktok", "instagram", "youtube shorts", "facebook", "snapchat", "twitter", "reddit", "9gag", "pinterest", "twitch.tv", "kick.com"] },
  { id: "shopping", label: "Kaufsucht", emoji: "🛍️", words: ["shein", "temu", "aliexpress", "wish.com", "zalando", "black friday", "ratenkauf", "jetzt kaufen", "sofort kaufen", "flash sale", "gutscheincode"] },
  { id: "food", label: "Essanfälle", emoji: "🍔", words: ["lieferando", "uber eats", "wolt", "mcdonalds", "burger king", "dominos", "fast food", "süßigkeiten bestellen", "pizza bestellen", "kfc"] },
  { id: "dating", label: "Dating & Kontaktsucht", emoji: "💔", words: ["tinder", "bumble", "lovoo", "badoo", "finya", "joyclub", "seitensprung", "affäre finden"] },
];

export const catalogWords = (ids) =>
  [...new Set(TRIGGER_CATALOG.filter((category) => ids.includes(category.id)).flatMap((category) => category.words))];
export const ALL_CATALOG_WORDS = new Set(TRIGGER_CATALOG.flatMap((category) => category.words));
