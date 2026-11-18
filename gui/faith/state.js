// Faith settings + personal data. Lives only in memory and in the encrypted file store
// (`/api/faith`) – never in localStorage, never in the cloud backup.
import { api } from "../api.js";

export const FAITH_DEFAULTS = {
  enabled: false,
  christian: false,
  islam: false,
  christianTradition: "catholic",
  islamTradition: "sunni-hanafi",
  order: "alternate", // alternate | christian | islam
  // location for prayer times
  location: null, // { name, lat, lng, timeZone }
  method: "diyanet",
  highLat: "angle",
  adjust: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  hijriAdjust: 0,
  // reminders
  prayerReminders: true,
  reminderLead: 0,
  remindPrayers: "fajr,dhuhr,asr,maghrib,isha",
  jumuah: true,
  christianReminders: true,
  morningPrayer: "07:00",
  eveningPrayer: "21:30",
  angelus: false,
  sundayService: true,
  sundayTime: "10:00",
  // view
  tracker: true,
  homeCard: true,
  versesInQuotes: "mixed", // off | mixed | only
  showArabic: true,
  showLatin: false,
  quranEdition: "de.bubenheim",
  reciter: "ar.alafasy",
  bibleTranslation: "elberfelder1905",
  fontSize: 19,
  theme: "auto", // auto | light | dark
  scene: "night",
  photo: "", // data URL of an own photo
  community: true,
  navHidden: false,
  fasting: true,
  craveVerse: true,
  pin: "", // sha-256 of salt + pin
  pinSalt: "",
  // personal data
  trackerLog: {}, // { "2026-11-16": { fajr: true, morning: true } }
  qada: 0,
  journal: [], // { id, kind, religion, text, at, answered }
  bookmarks: [], // { religion, a, b, c, at } – quran: a=surah b=ayah, bible: a=book b=chapter c=verse
  lastRead: {}, // { islam: { surah, ayah }, christian: { book, chapter } }
  readChapters: { islam: [], christian: [] },
  counters: {}, // { tasbih: total }
  favorites: [], // verse refs
  trackerExtras: false,
  tahajjudReminder: false,
  planProgress: {}, // { planId: [dayIndex, …] }
  freedomDone: [], // day indexes of "21 Tage in die Freiheit"
  deeds: [], // { id, text, religion, at }
  namesLearned: [], // indexes into ASMA / GOD_NAMES, prefixed "i" / "c"
  memorized: [], // verse refs
  learnedSteps: [], // prayer parts marked as "known by heart" in Gebet lernen
};

let state = null;
let loading = null;
const listeners = new Set();

export function faith() {
  return state || { ...FAITH_DEFAULTS };
}

export async function loadFaith() {
  if (state) return state;
  loading ||= api("/api/faith").then(({ state: stored }) => {
    state = { ...FAITH_DEFAULTS, ...(stored || {}) };
    state.adjust = { ...FAITH_DEFAULTS.adjust, ...(state.adjust || {}) };
    // older good deeds had no religion – with only one religion active they clearly belong to it
    const only = state.christian !== state.islam ? (state.islam ? "islam" : "christian") : null;
    if (only) state.deeds = state.deeds.map((deed) => (deed.religion ? deed : { ...deed, religion: only }));
    return state;
  }).catch((error) => {
    loading = null;
    throw error;
  });
  return loading;
}

let saveTimer;
let pending = null;
export function saveFaith(patch = {}, { immediate = false } = {}) {
  state = { ...faith(), ...patch };
  listeners.forEach((listener) => listener(state, patch));
  clearTimeout(saveTimer);
  pending = () => api("/api/faith", { method: "POST", body: { state } });
  if (immediate) return flushFaith();
  saveTimer = setTimeout(flushFaith, 500);
  return Promise.resolve();
}

export async function flushFaith() {
  clearTimeout(saveTimer);
  const run = pending;
  pending = null;
  if (run) await run();
}

export async function deleteFaith() {
  clearTimeout(saveTimer);
  pending = null;
  await api("/api/faith", { method: "POST", body: { state: null } });
  state = { ...FAITH_DEFAULTS };
  listeners.forEach((listener) => listener(state, { deleted: true }));
}

export function onFaithChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

window.addEventListener("beforeunload", () => { flushFaith(); });

// Which religions are active, in display order. "alternate" switches daily, so neither comes first all the time.
export function activeReligions(current = faith(), date = new Date()) {
  if (!current.enabled) return [];
  const list = ["christian", "islam"].filter((id) => current[id]);
  if (list.length < 2) return list;
  if (current.order === "islam") return ["islam", "christian"];
  if (current.order === "christian") return ["christian", "islam"];
  return Math.floor(date.getTime() / 86400000) % 2 ? ["islam", "christian"] : ["christian", "islam"];
}

export const prayerConfig = (current = faith()) => current.location ? {
  lat: current.location.lat,
  lng: current.location.lng,
  timeZone: current.location.timeZone,
  method: current.method,
  asr: current.islamTradition === "sunni-hanafi" ? "hanafi" : "standard",
  highLat: current.highLat,
  adjust: current.adjust,
} : null;

export async function hashPin(pin, salt) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${pin}`));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const todayKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
