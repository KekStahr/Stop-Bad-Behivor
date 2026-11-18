// UI preferences: applied instantly, cached locally against theme flashes,
// persisted in the user's profile through the local backend.
export const DEFAULT_PREFS = {
  theme: "auto",
  accent: "blue",
  fontScale: 1,
  density: "comfortable",
  motion: "full",
  glass: true,
  highContrast: false,
  sidebarCompact: false,
  startPage: "home",
  clock24: true,
  currency: "EUR",

  addiction: "general",
  why: "",
  dailyHours: 2,

  counterStyle: "rings",
  showSeconds: true,
  showWhy: true,
  donateNextAt: 0, // overview asks for support about twice a week (donate.js)
  donateShownDay: "",
  donateDismissedDay: "",
  donateSnoozeUntil: 0,
  homeWidgets: "", // JSON list of { id, size } – empty: the house layout (widgets.js)
  showQuote: true,
  privacyMode: false,
  greeting: true,

  focusGoal: 60,
  breakMinutes: 5,
  timerSound: true,
  timerNotify: true,
  timerVolume: 0.5,

  chatEnterSend: true,
  chatTimestamps: true,
  chatCompact: false,
  chatFontSize: 15,
  showOnline: true,
  chatSound: false,
  defaultChannel: "general",
  pollSeconds: 4,

  sosButton: true,
  breathPattern: "box",
  contactName: "",
  contactPhone: "",
  helpRegion: "de",

  projectionMonths: 12,

  quoteInterval: "60",
  aiWarnings: true,
  aiLeadMinutes: 30,
  aiNotify: true,
  checkinReminder: true,
  checkinTime: "20:00",
  celebrations: true,
  ifThenPlan: "Wenn ich Verlangen bekomme, dann trinke ich ein Glas Wasser und gehe 10 Minuten an die frische Luft.\nWenn ich mich einsam fühle, dann schreibe ich jemandem aus der Community.\nWenn ich abends unruhig werde, dann starte ich eine Fokus-Session.",
  triggerCategories: "",
  onboarded: false,
  language: "", // empty until chosen – see i18n.js
  celebratedMilestone: 0,

  helperEnabled: false,
  helperDays: "0,1,2,3,4,5,6",
  helperFrom: "",
  helperTo: "",
  closeBrowsers: true,
  keyboardLayout: "de",
};

export const ACCENTS = {
  blue: ["#007AFF", "#0A84FF"],
  indigo: ["#5856D6", "#5E5CE6"],
  purple: ["#AF52DE", "#BF5AF2"],
  pink: ["#FF2D55", "#FF375F"],
  red: ["#FF3B30", "#FF453A"],
  orange: ["#FF9500", "#FF9F0A"],
  yellow: ["#D9A400", "#FFD60A"],
  green: ["#28A745", "#30D158"],
  mint: ["#00A99D", "#63E6E2"],
  teal: ["#30B0C7", "#40C8E0"],
  graphite: ["#6E6E73", "#98989D"],
};

const CACHE_KEY = "reso:prefs";
export const prefs = { ...DEFAULT_PREFS };
let apiRef;
let saveTimer;
const listeners = new Set();
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

function merge(source) {
  if (!source || typeof source !== "object") return;
  for (const [key, value] of Object.entries(source)) {
    if (key in DEFAULT_PREFS && typeof value === typeof DEFAULT_PREFS[key]) prefs[key] = value;
  }
}

try {
  merge(JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"));
} catch {
  // storage unavailable: defaults are fine
}

export async function loadPrefs(api) {
  apiRef = api;
  try {
    const { prefs: stored } = await api("/api/preferences");
    merge(stored);
  } catch {
    // keep cached values when the backend is unavailable
  }
  applyPrefs();
}

export function setPref(key, value) {
  if (!(key in DEFAULT_PREFS)) return;
  prefs[key] = value;
  applyPrefs();
  listeners.forEach((listener) => listener(key, value));
  clearTimeout(saveTimer);
  saveTimer = setTimeout(savePrefs, 350);
}

export function resetPrefs() {
  Object.assign(prefs, DEFAULT_PREFS);
  applyPrefs();
  return savePrefs();
}

export async function savePrefs() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
  if (!apiRef) return;
  try {
    await apiRef("/api/preferences", { method: "POST", body: { prefs } });
    listeners.forEach((listener) => listener("__saved", true));
  } catch (error) {
    listeners.forEach((listener) => listener("__error", error.message));
  }
}

export function onPrefChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isDark() {
  return prefs.theme === "dark" || (prefs.theme === "auto" && darkQuery.matches);
}

export function motionLevel() {
  if (prefs.motion === "off") return "off";
  if (prefs.motion === "reduced" || motionQuery.matches) return "reduced";
  return "full";
}

export function applyPrefs() {
  const root = document.documentElement;
  const dark = isDark();
  const [light, darkAccent] = ACCENTS[prefs.accent] || ACCENTS.blue;
  root.dataset.theme = dark ? "dark" : "light";
  root.dataset.motion = motionLevel();
  root.dataset.density = prefs.density;
  root.dataset.glass = String(prefs.glass);
  root.dataset.contrast = prefs.highContrast ? "high" : "normal";
  root.dataset.compact = String(prefs.sidebarCompact);
  root.dataset.privacy = String(prefs.privacyMode);
  root.style.setProperty("--accent", dark ? darkAccent : light);
  root.style.setProperty("--font-scale", String(Math.min(1.4, Math.max(0.8, Number(prefs.fontScale) || 1))));
  root.style.setProperty("--chat-font", `${Math.min(22, Math.max(12, Number(prefs.chatFontSize) || 15))}px`);

  const quote = document.querySelector("#sidebar-quote");
  if (quote) quote.hidden = !prefs.showQuote;
  const why = document.querySelector("#sidebar-why");
  if (why) {
    why.hidden = !prefs.showWhy;
    why.classList.toggle("is-empty", !prefs.why.trim());
    why.querySelector("#sidebar-why-text").textContent = prefs.why.trim() || "Wofür tust du das? Tippe hier und schreib es auf.";
  }
  const sos = document.querySelector("#sos-button");
  if (sos) sos.hidden = !prefs.sosButton;
}

darkQuery.addEventListener("change", applyPrefs);
motionQuery.addEventListener("change", applyPrefs);

// One format everywhere: always with cents. `digits = 0` is only for chart axis ticks.
export function formatMoney(value, digits = 2) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: prefs.currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value) || 0);
}

export function formatTime(date) {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: !prefs.clock24,
  }).format(date);
}
