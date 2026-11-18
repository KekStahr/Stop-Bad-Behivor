// Pure calculations for the faith area – no DOM, no network, so they work offline and are testable:
// prayer times (standard astronomical formulas), Hijri dates (Umm al-Qura via Intl),
// Easter (Western + Orthodox) and the holidays of each tradition.

// ---- time zones ----------------------------------------------------------------------
export function tzOffsetMinutes(timeZone, date = new Date()) {
  if (!timeZone) return -date.getTimezoneOffset();
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(date).map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour) % 24, Number(parts.minute), Number(parts.second));
  return Math.round((asUtc - date.getTime()) / 60000);
}

// Calendar day (y, m, d) at a location.
export function ymdIn(timeZone, date = new Date()) {
  const shifted = new Date(date.getTime() + tzOffsetMinutes(timeZone, date) * 60000);
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth() + 1, d: shifted.getUTCDate() };
}

export function formatClock(date, timeZone) {
  return date ? new Intl.DateTimeFormat((globalThis.document?.documentElement.lang || "de-DE"), { hour: "2-digit", minute: "2-digit", ...(timeZone ? { timeZone } : {}) }).format(date) : "–";
}

// ---- prayer times ----------------------------------------------------------------------
export const METHODS = {
  mwl: { label: "Muslim World League", fajr: 18, isha: 17 },
  diyanet: { label: "Diyanet (Türkei)", fajr: 18, isha: 17 },
  isna: { label: "ISNA (Nordamerika)", fajr: 15, isha: 15 },
  egypt: { label: "Ägyptische Behörde", fajr: 19.5, isha: 17.5 },
  makkah: { label: "Umm al-Qura (Mekka)", fajr: 18.5, ishaMinutes: 90 },
  karachi: { label: "Universität Karachi", fajr: 18, isha: 18 },
  gulf: { label: "Golfregion", fajr: 19.5, ishaMinutes: 90 },
  france: { label: "UOIF (Frankreich)", fajr: 12, isha: 12 },
  russia: { label: "Russland", fajr: 16, isha: 15 },
  singapore: { label: "Singapur / Südostasien", fajr: 20, isha: 18 },
  tehran: { label: "Teheran (schiitisch)", fajr: 17.7, isha: 14, maghrib: 4.5 },
  jafari: { label: "Dschaʿfari – Leva-Institut Qom (schiitisch)", fajr: 16, isha: 14, maghrib: 4 },
};

export const PRAYERS = [
  { id: "fajr", label: "Fadschr", hint: "Morgengebet" },
  { id: "sunrise", label: "Sonnenaufgang", hint: "Ende des Fadschr", noPrayer: true },
  { id: "dhuhr", label: "Dhuhr", hint: "Mittagsgebet" },
  { id: "asr", label: "Asr", hint: "Nachmittagsgebet" },
  { id: "maghrib", label: "Maghrib", hint: "Abendgebet" },
  { id: "isha", label: "Ischa", hint: "Nachtgebet" },
];

const rad = (degrees) => (degrees * Math.PI) / 180;
const deg = (radians) => (radians * 180) / Math.PI;
const fix = (value, range) => {
  const result = value - range * Math.floor(value / range);
  return result < 0 ? result + range : result;
};

function julian(y, m, d) {
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5;
}

function sun(jd) {
  const days = jd - 2451545.0;
  const g = fix(357.529 + 0.98560028 * days, 360);
  const q = fix(280.459 + 0.98564736 * days, 360);
  const l = fix(q + 1.915 * Math.sin(rad(g)) + 0.02 * Math.sin(rad(2 * g)), 360);
  const e = 23.439 - 0.00000036 * days;
  const ra = deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(l)), Math.cos(rad(l)))) / 15;
  return { declination: deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(l)))), equation: q / 15 - fix(ra, 24) };
}

/**
 * Prayer times for one calendar day at a location. Returns absolute Date objects.
 * config: { lat, lng, timeZone?, method, asr: "standard" | "hanafi", highLat: "angle" | "seventh" | "middle", adjust: { fajr: minutes, ... } }
 */
export function prayerTimes({ y, m, d }, config) {
  const method = METHODS[config.method] || METHODS.mwl;
  const lat = Number(config.lat);
  const lng = Number(config.lng);
  const jd = julian(y, m, d) - lng / (15 * 24);
  const noonOf = (t) => fix(12 - sun(jd + t).equation, 24);
  const angleTime = (angle, t, before) => {
    const { declination } = sun(jd + t);
    const cosine = (-Math.sin(rad(angle)) - Math.sin(rad(declination)) * Math.sin(rad(lat))) / (Math.cos(rad(declination)) * Math.cos(rad(lat)));
    if (cosine < -1 || cosine > 1) return NaN; // sun never reaches this angle (high latitude summer)
    const span = deg(Math.acos(cosine)) / 15;
    return noonOf(t) + (before ? -span : span);
  };
  const asrTime = (factor, t) => {
    const { declination } = sun(jd + t);
    const angle = -deg(Math.atan(1 / (factor + Math.tan(rad(Math.abs(lat - declination))))));
    return angleTime(angle, t, false);
  };

  // two refinement passes, starting from rough guesses (hours / 24)
  let times = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, sunset: 18, maghrib: 18, isha: 18 };
  for (let pass = 0; pass < 2; pass += 1) {
    const p = Object.fromEntries(Object.entries(times).map(([key, value]) => [key, (Number.isFinite(value) ? value : 12) / 24]));
    times = {
      fajr: angleTime(method.fajr, p.fajr, true),
      sunrise: angleTime(0.833, p.sunrise, true),
      dhuhr: noonOf(p.dhuhr),
      asr: asrTime(config.asr === "hanafi" ? 2 : 1, p.asr),
      sunset: angleTime(0.833, p.sunset, false),
      maghrib: method.maghrib ? angleTime(method.maghrib, p.maghrib, false) : angleTime(0.833, p.maghrib, false),
      isha: method.ishaMinutes ? NaN : angleTime(method.isha, p.isha, false),
    };
  }
  if (method.ishaMinutes) times.isha = times.maghrib + method.ishaMinutes / 60;

  // high latitudes: keep Fajr/Isha within a sensible part of the night
  const night = fix(times.sunrise - times.sunset, 24);
  const portion = (angle) => (config.highLat === "seventh" ? 1 / 7 : config.highLat === "middle" ? 1 / 2 : angle / 60) * night;
  const fajrLimit = portion(method.fajr);
  if (!Number.isFinite(times.fajr) || fix(times.sunrise - times.fajr, 24) > fajrLimit) times.fajr = times.sunrise - fajrLimit;
  if (!method.ishaMinutes) {
    const ishaLimit = portion(method.isha);
    if (!Number.isFinite(times.isha) || fix(times.isha - times.sunset, 24) > ishaLimit) times.isha = times.sunset + ishaLimit;
  }
  times.dhuhr += 1 / 60; // a minute after the zenith, as most calendars do

  const offset = tzOffsetMinutes(config.timeZone, new Date(Date.UTC(y, m - 1, d, 12)));
  const midnightUtc = Date.UTC(y, m - 1, d) - offset * 60000;
  const zoneHours = offset / 60 - lng / 15; // the formulas above are in solar time at the location
  const result = {};
  for (const { id } of PRAYERS) {
    const hours = times[id] + zoneHours + (Number(config.adjust?.[id]) || 0) / 60;
    result[id] = Number.isFinite(hours) ? new Date(midnightUtc + Math.round(hours * 60) * 60000) : null;
  }
  return result;
}

// The next prayer after `now` (today or tomorrow).
export function nextPrayer(config, now = new Date()) {
  const today = ymdIn(config.timeZone, now);
  const tomorrow = ymdIn(config.timeZone, new Date(now.getTime() + 86400000));
  for (const day of [today, tomorrow]) {
    const times = prayerTimes(day, config);
    const found = PRAYERS.find((prayer) => !prayer.noPrayer && times[prayer.id] && times[prayer.id] > now);
    if (found) return { ...found, at: times[found.id] };
  }
  return null;
}

// Qibla direction in degrees from north.
export function qibla(lat, lng) {
  const kaaba = { lat: 21.4225, lng: 39.8262 };
  const dLng = rad(kaaba.lng - lng);
  const y = Math.sin(dLng);
  const x = Math.cos(rad(lat)) * Math.tan(rad(kaaba.lat)) - Math.sin(rad(lat)) * Math.cos(dLng);
  return fix(deg(Math.atan2(y, x)), 360);
}

// ---- Hijri calendar ------------------------------------------------------------------
export const HIJRI_MONTHS = ["Muharram", "Safar", "Rabīʿ al-awwal", "Rabīʿ ath-thānī", "Dschumādā al-ūlā", "Dschumādā al-āchira",
  "Radschab", "Schaʿbān", "Ramadan", "Schawwāl", "Dhū l-Qaʿda", "Dhū l-Hiddscha"];

const hijriFormat = new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura-nu-latn", { timeZone: "UTC", day: "numeric", month: "numeric", year: "numeric" });
// adjust: ±days for local moon sighting
export function hijri(date = new Date(), adjust = 0) {
  const local = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12) + adjust * 86400000;
  const parts = Object.fromEntries(hijriFormat.formatToParts(new Date(local)).map((part) => [part.type, part.value]));
  const day = Number(parts.day);
  const month = Number(parts.month);
  const year = Number(String(parts.year).replace(/\D/g, ""));
  return { day, month, year, label: `${day}. ${HIJRI_MONTHS[month - 1]} ${year} n. H.` };
}

// ---- Easter --------------------------------------------------------------------------
export function westernEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export function orthodoxEaster(year) {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  const julianDate = new Date(year, month - 1, day);
  const shift = Math.floor(year / 100) - Math.floor(year / 400) - 2; // Julian → Gregorian (13 days in 1900–2099)
  return addDays(julianDate, shift);
}

export const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function firstAdvent(year) {
  const christmas = new Date(year, 11, 25);
  return addDays(christmas, -(christmas.getDay() || 7) - 21);
}

// ---- holidays ----------------------------------------------------------------------------
// t: traditions the entry belongs to. Christian: catholic, protestant, orthodox, free. Islamic: sunni, shia.
const WESTERN = ["catholic", "protestant", "free"];
function christianEvents(year) {
  const easter = westernEaster(year);
  const pascha = orthodoxEaster(year);
  const advent = firstAdvent(year);
  const fixed = (month, day) => new Date(year, month - 1, day);
  const bussUndBettag = addDays(advent, -11);
  return [
    { date: fixed(1, 1), title: "Hochfest der Gottesmutter Maria", t: ["catholic"], icon: "✨", text: "Das neue Jahr beginnt unter dem Schutz Marias." },
    { date: fixed(1, 6), title: "Erscheinung des Herrn (Epiphanias)", t: WESTERN, icon: "⭐", text: "Die Weisen aus dem Morgenland finden das Kind." },
    { date: fixed(1, 7), title: "Orthodoxes Weihnachtsfest", t: ["orthodox"], icon: "🕯️", text: "Christi Geburt nach dem julianischen Kalender." },
    { date: fixed(1, 19), title: "Theophanie – Taufe des Herrn", t: ["orthodox"], icon: "💧", text: "Großes Wasserweihfest." },
    { date: fixed(2, 2), title: "Darstellung des Herrn (Mariä Lichtmess)", t: ["catholic", "protestant"], icon: "🕯️", text: "Jesus wird im Tempel dargestellt – Licht für die Welt." },
    { date: addDays(easter, -46), title: "Aschermittwoch – Beginn der Fastenzeit", t: WESTERN, icon: "✝️", text: "40 Tage der Umkehr bis Ostern. Eine gute Zeit, um frei zu werden." },
    { date: addDays(pascha, -48), title: "Reiner Montag – Beginn der Großen Fastenzeit", t: ["orthodox"], icon: "✝️", text: "Die Große Fastenzeit vor Pascha beginnt." },
    { date: fixed(3, 25), title: "Verkündigung des Herrn", t: ["catholic"], icon: "🕊️", text: "Der Engel Gabriel kommt zu Maria." },
    { date: fixed(4, 7), title: "Mariä Verkündigung", t: ["orthodox"], icon: "🕊️", text: "Nach dem julianischen Kalender." },
    { date: addDays(easter, -7), title: "Palmsonntag", t: WESTERN, icon: "🌿", text: "Jesus zieht in Jerusalem ein – die Karwoche beginnt." },
    { date: addDays(easter, -3), title: "Gründonnerstag", t: WESTERN, icon: "🍞", text: "Das letzte Abendmahl." },
    { date: addDays(easter, -2), title: "Karfreitag", t: WESTERN, icon: "✝️", text: "Gedenken an Leiden und Tod Jesu." },
    { date: addDays(easter, -1), title: "Karsamstag", t: WESTERN, icon: "🕯️", text: "Tag der Grabesruhe – in der Nacht die Osternacht." },
    { date: easter, title: "Ostersonntag", t: WESTERN, icon: "🌅", text: "Christus ist auferstanden! Das Leben ist stärker als der Tod." },
    { date: addDays(easter, 1), title: "Ostermontag", t: WESTERN, icon: "🌷", text: "Die Emmausjünger erkennen Jesus beim Brotbrechen." },
    { date: addDays(pascha, -7), title: "Orthodoxer Palmsonntag", t: ["orthodox"], icon: "🌿", text: "Einzug in Jerusalem." },
    { date: addDays(pascha, -2), title: "Orthodoxer Karfreitag", t: ["orthodox"], icon: "✝️", text: "Großer und Heiliger Freitag." },
    { date: pascha, title: "Pascha – Orthodoxes Osterfest", t: ["orthodox"], icon: "🌅", text: "Christus ist auferstanden! – Er ist wahrhaftig auferstanden!" },
    { date: addDays(easter, 39), title: "Christi Himmelfahrt", t: WESTERN, icon: "☁️", text: "Jesus kehrt zum Vater zurück." },
    { date: addDays(pascha, 39), title: "Orthodoxe Himmelfahrt", t: ["orthodox"], icon: "☁️", text: "Christi Himmelfahrt nach orthodoxem Kalender." },
    { date: addDays(easter, 49), title: "Pfingstsonntag", t: WESTERN, icon: "🔥", text: "Der Heilige Geist kommt – Geburtstag der Kirche." },
    { date: addDays(easter, 50), title: "Pfingstmontag", t: WESTERN, icon: "🕊️", text: "Zweiter Pfingstfeiertag." },
    { date: addDays(pascha, 49), title: "Orthodoxes Pfingsten (Dreifaltigkeit)", t: ["orthodox"], icon: "🔥", text: "Fest der Heiligen Dreifaltigkeit." },
    { date: addDays(easter, 56), title: "Dreifaltigkeitssonntag (Trinitatis)", t: ["catholic", "protestant"], icon: "☘️", text: "Vater, Sohn und Heiliger Geist." },
    { date: addDays(easter, 60), title: "Fronleichnam", t: ["catholic"], icon: "🍞", text: "Fest des Leibes und Blutes Christi." },
    { date: fixed(8, 6), title: "Verklärung des Herrn", t: ["catholic"], icon: "⛰️", text: "Jesus wird auf dem Berg verklärt." },
    { date: fixed(8, 19), title: "Verklärung des Herrn", t: ["orthodox"], icon: "⛰️", text: "Nach dem julianischen Kalender." },
    { date: fixed(8, 15), title: "Mariä Himmelfahrt", t: ["catholic"], icon: "💙", text: "Maria wird in den Himmel aufgenommen." },
    { date: fixed(8, 28), title: "Entschlafung der Gottesgebärerin", t: ["orthodox"], icon: "💙", text: "Nach dem julianischen Kalender." },
    { date: fixed(9, 27), title: "Kreuzerhöhung", t: ["orthodox"], icon: "✝️", text: "Fest der Erhöhung des Kreuzes." },
    { date: addDays(fixed(10, 1), (7 - fixed(10, 1).getDay()) % 7), title: "Erntedankfest", t: WESTERN, icon: "🌾", text: "Danke für alles, was wir bekommen haben." },
    { date: fixed(10, 31), title: "Reformationstag", t: ["protestant"], icon: "📜", text: "Erinnerung an Luthers Thesen und die Gnade allein durch Glauben." },
    { date: fixed(11, 1), title: "Allerheiligen", t: ["catholic"], icon: "✨", text: "Gedenken an alle Heiligen." },
    { date: fixed(11, 2), title: "Allerseelen", t: ["catholic"], icon: "🕯️", text: "Gebet für die Verstorbenen." },
    { date: bussUndBettag, title: "Buß- und Bettag", t: ["protestant"], icon: "🙏", text: "Ein Tag der Besinnung und des Neuanfangs." },
    { date: addDays(advent, -7), title: "Ewigkeitssonntag (Totensonntag)", t: ["protestant", "free"], icon: "🕯️", text: "Gedenken an die Verstorbenen – und Hoffnung auf das ewige Leben." },
    { date: addDays(advent, -7), title: "Christkönigssonntag", t: ["catholic"], icon: "👑", text: "Letzter Sonntag des Kirchenjahres." },
    { date: advent, title: "1. Advent", t: WESTERN, icon: "🕯️", text: "Das Kirchenjahr beginnt. Warten auf das Licht." },
    { date: addDays(advent, 7), title: "2. Advent", t: WESTERN, icon: "🕯️", text: "Zwei Lichter brennen." },
    { date: fixed(12, 6), title: "Nikolaus", t: WESTERN, icon: "🎁", text: "Der heilige Nikolaus – Güte, die man spürt." },
    { date: fixed(12, 8), title: "Mariä Empfängnis", t: ["catholic"], icon: "💙", text: "Hochfest der ohne Erbsünde empfangenen Gottesmutter." },
    { date: addDays(advent, 14), title: "3. Advent (Gaudete)", t: WESTERN, icon: "🕯️", text: "Freut euch – das Fest ist nah." },
    { date: addDays(advent, 21), title: "4. Advent", t: WESTERN, icon: "🕯️", text: "Alle vier Lichter brennen." },
    { date: fixed(12, 24), title: "Heiligabend", t: WESTERN, icon: "🌟", text: "Christus ist geboren." },
    { date: fixed(12, 25), title: "1. Weihnachtstag", t: WESTERN, icon: "🎄", text: "Fest der Geburt Christi." },
    { date: fixed(12, 26), title: "2. Weihnachtstag", t: WESTERN, icon: "🎄", text: "Fest des heiligen Stephanus." },
  ];
}

const ISLAMIC_EVENTS = [
  { m: 1, d: 1, title: "Islamisches Neujahr", t: ["sunni", "shia"], icon: "🌙", text: "Erinnerung an die Hidschra – ein Neuanfang." },
  { m: 1, d: 10, title: "Aschura", t: ["sunni"], icon: "🌙", text: "Ein Tag des Fastens und des Dankes – Rettung Moses." },
  { m: 1, d: 10, title: "Aschura – Gedenken an Imam Hussain", t: ["shia"], icon: "🖤", text: "Trauer um Imam Hussain in Kerbela." },
  { m: 2, d: 20, title: "Arbaʿīn", t: ["shia"], icon: "🖤", text: "40 Tage nach Aschura." },
  { m: 3, d: 12, title: "Maulid an-Nabī (Mevlid Kandili)", t: ["sunni"], icon: "🌹", text: "Geburt des Propheten Muhammad ﷺ – wird nicht überall begangen." },
  { m: 3, d: 17, title: "Maulid an-Nabī", t: ["shia"], icon: "🌹", text: "Geburt des Propheten Muhammad ﷺ." },
  { m: 7, d: 13, title: "Geburt von Imam Ali", t: ["shia"], icon: "✨", text: "" },
  { m: 7, d: 27, title: "Isrāʾ und Miʿrādsch (Miraç Kandili)", t: ["sunni", "shia"], icon: "✨", text: "Die Nachtreise und Himmelfahrt des Propheten ﷺ." },
  { m: 8, d: 15, title: "Laylat al-Barāʾa (Berat Kandili)", t: ["sunni"], icon: "🕯️", text: "Nacht der Vergebung in der Mitte des Schaʿbān." },
  { m: 8, d: 15, title: "Nisf Schaʿbān – Geburt des Imam Mahdi", t: ["shia"], icon: "🕯️", text: "" },
  { m: 9, d: 1, title: "Beginn des Ramadan", t: ["sunni", "shia"], icon: "🌙", text: "Monat des Fastens, des Korans und der Barmherzigkeit." },
  { m: 9, d: 19, title: "Nacht der Bestimmung (19.)", t: ["shia"], icon: "✨", text: "Eine der möglichen Nächte der Bestimmung." },
  { m: 9, d: 21, title: "Nacht der Bestimmung (21.)", t: ["shia"], icon: "✨", text: "" },
  { m: 9, d: 23, title: "Nacht der Bestimmung (23.)", t: ["shia"], icon: "✨", text: "" },
  { m: 9, d: 27, title: "Laylat al-Qadr (Kadir Gecesi)", t: ["sunni"], icon: "✨", text: "Besser als tausend Monate – oft in der 27. Nacht gesucht." },
  { m: 10, d: 1, title: "Ramadanfest (ʿĪd al-Fitr)", t: ["sunni", "shia"], icon: "🎉", text: "Ende des Fastenmonats – Freude, Familie, Versöhnung." },
  { m: 12, d: 9, title: "Tag von ʿArafa", t: ["sunni", "shia"], icon: "⛰️", text: "Höhepunkt der Pilgerfahrt – ein Tag des Gebets und der Vergebung." },
  { m: 12, d: 10, title: "Opferfest (ʿĪd al-Aḍḥā)", t: ["sunni", "shia"], icon: "🐑", text: "Fest des Opfers und des Teilens." },
  { m: 12, d: 18, title: "ʿĪd al-Ghadīr", t: ["shia"], icon: "✨", text: "" },
];

/**
 * Holidays between `from` and `from + days`, filtered by the user's traditions.
 * faith: { christian: bool, islam: bool, christianTradition, islamTradition, hijriAdjust }
 */
export function holidays(faith, from = new Date(), days = 365) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = addDays(start, days);
  const results = [];
  if (faith.christian) {
    const tradition = faith.christianTradition || "catholic";
    for (const year of [start.getFullYear(), start.getFullYear() + 1]) {
      for (const event of christianEvents(year)) {
        if (event.t.includes(tradition) && event.date >= start && event.date < end) results.push({ ...event, religion: "christian" });
      }
    }
  }
  if (faith.islam) {
    const branch = String(faith.islamTradition || "sunni").startsWith("shia") ? "shia" : "sunni";
    for (let date = start; date < end; date = addDays(date, 1)) {
      const h = hijri(date, Number(faith.hijriAdjust) || 0);
      for (const event of ISLAMIC_EVENTS) {
        if (event.m === h.month && event.d === h.day && event.t.includes(branch)) {
          results.push({ ...event, date, religion: "islam", hijri: h.label, approx: true });
        }
      }
    }
  }
  // de-duplicate (e.g. two titles on the same day from overlapping lists)
  const seen = new Set();
  return results.sort((a, b) => a.date - b.date).filter((event) => {
    const key = `${dateKey(event.date)}|${event.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Current season of the church year (Western or Orthodox).
export function churchSeason(date = new Date(), tradition = "catholic") {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const year = day.getFullYear();
  if (tradition === "orthodox") {
    const pascha = orthodoxEaster(year);
    if (day >= addDays(pascha, -48) && day < pascha) return { name: "Große Fastenzeit", color: "#7d4f9e", icon: "✝️" };
    if (day >= pascha && day <= addDays(pascha, 49)) return { name: "Osterzeit (Pentekostarion)", color: "#d4a017", icon: "🌅" };
    return { name: "Zeit nach Pfingsten", color: "#3f8f5b", icon: "🌿" };
  }
  const easter = westernEaster(year);
  const advent = firstAdvent(year);
  if (day >= advent && day < new Date(year, 11, 25)) return { name: "Advent", color: "#6a4c9c", icon: "🕯️" };
  if (day >= new Date(year, 11, 25) || day <= new Date(year, 0, 6)) return { name: "Weihnachtszeit", color: "#d4a017", icon: "🌟" };
  if (day >= addDays(easter, -46) && day < easter) return { name: "Fastenzeit", color: "#6a4c9c", icon: "✝️" };
  if (day >= easter && day <= addDays(easter, 49)) return { name: "Osterzeit", color: "#d4a017", icon: "🌅" };
  return { name: tradition === "protestant" ? "Trinitatiszeit" : "Zeit im Jahreskreis", color: "#3f8f5b", icon: "🌿" };
}

// Fasting periods for the companion cards.
export function ramadanInfo(date = new Date(), adjust = 0) {
  const h = hijri(date, adjust);
  return h.month === 9 ? { day: h.day, left: 30 - h.day } : null;
}
export function lentInfo(date = new Date(), tradition = "catholic") {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const easter = tradition === "orthodox" ? orthodoxEaster(day.getFullYear()) : westernEaster(day.getFullYear());
  const start = addDays(easter, tradition === "orthodox" ? -48 : -46);
  if (day < start || day >= easter) return null;
  return { day: Math.round((day - start) / 86400000) + 1, left: Math.round((easter - day) / 86400000) };
}

export { sameDay };
