// Shared building blocks of the faith area: verse cards, place picker, prayer-bead counter,
// "Moment der Stille" and scripture loading.
import { api, escapeHtml } from "../api.js";
import { openSheet, chime } from "../ui.js";
import { motionLevel } from "../prefs.js";
import { RELIGIONS, COUNTERS, SURAHS, apiVerse } from "./data.js";
import { faith, saveFaith } from "./state.js";
import { METHODS, qibla } from "./calc.js";

export const badge = (religion) => `<span class="faith-badge is-${religion}"><b>${RELIGIONS[religion].symbol}</b>${RELIGIONS[religion].label}</span>`;

export function fetchScripture(source, path) {
  return api("/api/faith/fetch", { method: "POST", body: { source, path } });
}

// Exact wording of a verse in the user's translation (+ Arabic for the Quran).
export async function loadVerse(verse) {
  const current = faith();
  if (verse.religion === "islam") {
    const to = verse.to || verse.ayah;
    const ayahs = [];
    for (let ayah = verse.ayah; ayah <= to; ayah += 1) {
      ayahs.push(fetchScripture("quran", `/v1/ayah/${verse.surah}:${ayah}/editions/quran-uthmani,${current.quranEdition}`));
    }
    const results = await Promise.all(ayahs);
    return {
      arabic: results.map((result) => result.data[0].text).join(" ۝ "),
      text: results.map((result) => result.data[1].text).join(" "),
      source: results[0].data[1].edition.name,
    };
  }
  const chapter = await fetchScripture("bible", `/v2/${current.bibleTranslation}/${verse.book}/${verse.chapter}.json`);
  const { from, text } = matchVerse(chapter.verses, verse);
  return { text, from, source: chapter.translation };
}

// Verse numbering differs between Bibles (Psalm superscriptions). For German translations the
// passage is found by comparing words with our text; otherwise the English numbering is used.
const stems = (text) => new Set((String(text).toLowerCase().match(/[a-zäöüß]{4,}/g) || []).map((word) => word.slice(0, 5)));
export function matchVerse(verses, verse) {
  const span = (verse.to || verse.verse) - verse.verse;
  const range = (from) => verses.filter((item) => item.verse >= from && item.verse <= from + span).map((item) => item.text.trim()).join(" ");
  const local = stems(verse.text);
  let best = { score: -1 };
  for (const shift of [0, 1, 2, -1]) {
    const from = verse.verse - shift;
    const text = range(from);
    const score = [...stems(text)].filter((stem) => local.has(stem)).length;
    if (text && score > best.score) best = { score, from, text };
  }
  if (best.score >= 2) return best;
  const from = apiVerse(verse).from;
  return { from, text: range(from) };
}

export function verseCard(verse, { id = "", actions = true } = {}) {
  if (!verse) return "";
  const favorite = faith().favorites.includes(verse.ref);
  return `
    <article class="verse-card is-${verse.religion}" data-verse-card="${escapeHtml(id)}">
      <header>${badge(verse.religion)}<span class="verse-theme">${escapeHtml(verse.ref)}</span></header>
      <p class="verse-arabic" hidden dir="rtl" lang="ar"></p>
      <blockquote class="verse-text">${escapeHtml(verse.text)}</blockquote>
      <footer>
        <small class="verse-source">${verse.meaning ? "Übertragung der Bedeutung" : "Bibel"}</small>
        ${actions ? `<span class="verse-actions">
          <button type="button" class="pill-button subtle" data-verse-read>Im Zusammenhang lesen</button>
          <button type="button" class="icon-button ${favorite ? "is-on" : ""}" data-verse-fav title="Merken" aria-label="Vers merken">${favorite ? "♥" : "♡"}</button>
          <button type="button" class="icon-button" data-verse-copy title="Kopieren" aria-label="Vers kopieren">⧉</button>
        </span>` : ""}
      </footer>
    </article>`;
}

// Replaces the offline text with the exact wording once it arrived.
export function hydrateVerse(card, verse) {
  if (!card || !verse) return;
  loadVerse(verse).then((exact) => {
    if (!card.isConnected || !exact.text) return;
    card.querySelector(".verse-text").textContent = exact.text;
    if (exact.from) card.dataset.from = String(exact.from);
    card.querySelector(".verse-source").textContent = exact.source;
    const arabic = card.querySelector(".verse-arabic");
    if (exact.arabic && faith().showArabic) {
      arabic.textContent = exact.arabic;
      arabic.hidden = false;
    }
  }).catch(() => {});
}

export function bindVerseCard(card, verse, { showToast, onRead }) {
  if (!card) return;
  card.querySelector("[data-verse-read]")?.addEventListener("click", () => onRead(verse.religion === "christian" ? { ...verse, verse: Number(card.dataset.from) || apiVerse(verse).from } : verse));
  card.querySelector("[data-verse-fav]")?.addEventListener("click", (event) => {
    const list = faith().favorites;
    const on = !list.includes(verse.ref);
    saveFaith({ favorites: on ? [...list, verse.ref] : list.filter((ref) => ref !== verse.ref) });
    event.currentTarget.textContent = on ? "♥" : "♡";
    event.currentTarget.classList.toggle("is-on", on);
    showToast(on ? "Vers gemerkt." : "Aus den gemerkten Versen entfernt.");
  });
  card.querySelector("[data-verse-copy]")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(`„${card.querySelector(".verse-text").textContent}“ – ${verse.ref}`);
      showToast("Vers kopiert.");
    } catch {
      showToast("Kopieren nicht möglich.", true);
    }
  });
  hydrateVerse(card, verse);
}

// ---- place for prayer times ---------------------------------------------------------------
export function openLocationSheet({ showToast, onSaved }) {
  const current = faith().location;
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { dialog, close } = openSheet({
    title: "Standort für Gebetszeiten",
    body: `
      <p class="sheet-text">Die Gebetszeiten werden aus deinem Standort berechnet – direkt auf deinem Gerät. Gespeichert wird er nur verschlüsselt.</p>
      ${current ? `<p class="faith-current-place">📍 Aktuell: <strong>${escapeHtml(current.name)}</strong></p>` : ""}
      <form class="place-search" id="place-form">
        <input id="place-query" type="search" placeholder="Stadt suchen, z. B. Köln, Wien, Istanbul" maxlength="80" autocomplete="off">
        <button class="button button-primary" type="submit">Suchen</button>
      </form>
      <div class="place-results" id="place-results"></div>
      <details class="place-manual">
        <summary>Koordinaten selbst eingeben</summary>
        <div class="place-grid">
          <label>Name<input id="manual-name" maxlength="60" value="${escapeHtml(current?.name || "")}"></label>
          <label>Breitengrad<input id="manual-lat" type="number" step="0.0001" min="-90" max="90" value="${current?.lat ?? ""}"></label>
          <label>Längengrad<input id="manual-lng" type="number" step="0.0001" min="-180" max="180" value="${current?.lng ?? ""}"></label>
          <label>Zeitzone<input id="manual-tz" maxlength="64" value="${escapeHtml(current?.timeZone || localZone)}"></label>
        </div>
        <button class="button button-secondary" id="manual-save" type="button">Übernehmen</button>
      </details>
      <button class="link-button" id="device-place" type="button">Gerätestandort verwenden</button>
      <p class="muted small">Für die Suche wird nur der eingegebene Ortsname an Open-Meteo übertragen.</p>`,
  });
  const save = (location) => {
    saveFaith({ location });
    close();
    showToast(`Standort: ${location.name}`);
    onSaved?.(location);
  };
  const results = dialog.querySelector("#place-results");
  dialog.querySelector("#place-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    results.innerHTML = '<p class="muted small">Suche …</p>';
    try {
      const found = (await api("/api/faith/fetch", { method: "POST", body: { source: "geo", name: dialog.querySelector("#place-query").value } })).results || [];
      results.innerHTML = found.length ? found.map((place, index) => `
        <button type="button" class="place-result" data-index="${index}">
          <strong>${escapeHtml(place.name)}</strong><small>${escapeHtml([place.admin1, place.country].filter(Boolean).join(", "))}</small>
        </button>`).join("") : '<p class="muted small">Nichts gefunden. Versuch eine größere Stadt in deiner Nähe.</p>';
      results.querySelectorAll("[data-index]").forEach((button) => button.addEventListener("click", () => {
        const place = found[Number(button.dataset.index)];
        save({ name: `${place.name}${place.country ? `, ${place.country}` : ""}`, lat: place.latitude, lng: place.longitude, timeZone: place.timezone || localZone });
      }));
    } catch (error) {
      results.innerHTML = `<p class="muted small">${escapeHtml(error.message)}</p>`;
    }
  });
  dialog.querySelector("#manual-save").addEventListener("click", () => {
    const lat = Number(dialog.querySelector("#manual-lat").value);
    const lng = Number(dialog.querySelector("#manual-lng").value);
    const timeZone = dialog.querySelector("#manual-tz").value.trim();
    try {
      new Intl.DateTimeFormat("de", { timeZone }).format();
    } catch {
      showToast("Unbekannte Zeitzone, z. B. Europe/Berlin.", true);
      return;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || !dialog.querySelector("#manual-lat").value) {
      showToast("Bitte gültige Koordinaten eingeben.", true);
      return;
    }
    save({ name: dialog.querySelector("#manual-name").value.trim() || "Eigener Ort", lat, lng, timeZone });
  });
  dialog.querySelector("#device-place").addEventListener("click", () => {
    if (!navigator.geolocation) return showToast("Dieses Gerät kann seinen Standort nicht ermitteln.", true);
    navigator.geolocation.getCurrentPosition(
      (position) => save({ name: "Mein Standort", lat: Number(position.coords.latitude.toFixed(4)), lng: Number(position.coords.longitude.toFixed(4)), timeZone: localZone }),
      () => showToast("Standort nicht verfügbar – bitte such deine Stadt.", true),
      { timeout: 8000 },
    );
    return undefined;
  });
}

// ---- fine tuning of prayer times -------------------------------------------------------------
export function openAdjustSheet({ showToast, onSaved }) {
  const adjust = faith().adjust;
  const names = { fajr: "Fadschr", sunrise: "Sonnenaufgang", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Ischa" };
  const { dialog, close } = openSheet({
    title: "Gebetszeiten feinjustieren",
    body: `
      <p class="sheet-text">Weicht deine Moschee leicht ab? Verschiebe einzelne Zeiten um ein paar Minuten.</p>
      <div class="adjust-grid">${Object.entries(names).map(([id, label]) => `
        <label><span>${label}</span><input type="number" min="-60" max="60" step="1" data-adjust="${id}" value="${Number(adjust[id]) || 0}"><small>Min.</small></label>`).join("")}</div>
      <div class="sheet-actions"><button class="button button-primary" id="adjust-save" type="button">Speichern</button></div>`,
  });
  dialog.querySelector("#adjust-save").addEventListener("click", () => {
    const next = {};
    dialog.querySelectorAll("[data-adjust]").forEach((input) => { next[input.dataset.adjust] = Math.max(-60, Math.min(60, Math.round(Number(input.value) || 0))); });
    saveFaith({ adjust: next });
    close();
    showToast("Gebetszeiten angepasst.");
    onSaved?.();
  });
}

// ---- prayer beads / dhikr counter ------------------------------------------------------------
export function openCounter(religion, { showToast }) {
  const tradition = faith().christianTradition;
  const presets = COUNTERS[religion].filter((preset) => !preset.traditions || preset.traditions.includes(tradition));
  let preset = presets[0];
  let step = 0;
  let count = 0;
  const { dialog } = openSheet({
    title: religion === "islam" ? "Tasbīḥ – Gedenken" : "Gebetsschnur",
    body: `
      <div class="counter">
        <div class="chip-row" id="counter-presets">${presets.map((item, index) => `<button type="button" class="chip ${index ? "" : "is-selected"}" data-preset="${index}">${escapeHtml(item.label)}</button>`).join("")}</div>
        <button type="button" class="counter-bead" id="counter-tap" aria-label="Zählen">
          <span class="counter-number" id="counter-number">0</span>
          <span class="counter-of" id="counter-of"></span>
        </button>
        <strong class="counter-phrase" id="counter-phrase"></strong>
        <small class="muted" id="counter-meaning"></small>
        <div class="counter-steps" id="counter-steps"></div>
        <button type="button" class="link-button" id="counter-reset">Von vorn beginnen</button>
        <p class="muted small">Tippe auf den Kreis oder drücke die Leertaste. Langsam, mit dem Atem.</p>
      </div>`,
  });
  const draw = () => {
    const [phrase, meaning, target] = preset.steps[step];
    dialog.querySelector("#counter-number").textContent = String(count);
    dialog.querySelector("#counter-of").textContent = `von ${target}`;
    dialog.querySelector("#counter-phrase").textContent = phrase;
    dialog.querySelector("#counter-meaning").textContent = meaning;
    dialog.querySelector("#counter-steps").innerHTML = preset.steps.map((item, index) => `<i class="${index < step ? "is-done" : index === step ? "is-now" : ""}"></i>`).join("");
    dialog.querySelector("#counter-tap").style.setProperty("--p", `${(count / target) * 100}%`);
  };
  const tap = () => {
    const target = preset.steps[step][2];
    count += 1;
    if (navigator.vibrate) navigator.vibrate(8);
    const totals = { ...faith().counters, [preset.id]: (faith().counters[preset.id] || 0) + 1 };
    saveFaith({ counters: totals });
    if (count >= target) {
      if (step < preset.steps.length - 1) {
        step += 1;
        count = 0;
        chime("message");
      } else {
        draw();
        chime();
        showToast(religion === "islam" ? "Möge Allah es annehmen. 🤲" : "Amen. Gott segne dich. 🙏");
        step = 0;
        count = 0;
        return;
      }
    }
    draw();
  };
  dialog.querySelector("#counter-tap").addEventListener("click", tap);
  dialog.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
      event.preventDefault();
      tap();
    }
  });
  dialog.querySelector("#counter-reset").addEventListener("click", () => { step = 0; count = 0; draw(); });
  dialog.querySelectorAll("[data-preset]").forEach((button) => button.addEventListener("click", () => {
    preset = presets[Number(button.dataset.preset)];
    step = 0;
    count = 0;
    dialog.querySelectorAll("[data-preset]").forEach((item) => item.classList.toggle("is-selected", item === button));
    draw();
  }));
  draw();
}

// ---- moment of stillness (breathing + a short phrase) -----------------------------------------
const STILL_PHRASES = {
  christian: ["Seid stille und erkennet, dass ich Gott bin.", "Herr Jesus Christus, erbarme dich meiner.", "Du bist bei mir.", "Dein Wille geschehe."],
  islam: ["Subḥānallāh – Preis sei Allah.", "Alḥamdulillāh – alles Lob gehört Allah.", "Allāhu akbar – Allah ist größer.", "Ḥasbunallāh – Allah genügt mir."],
};
export function openStillness(religions) {
  const phrases = religions.flatMap((religion) => STILL_PHRASES[religion]);
  let index = 0;
  let seconds = 120;
  const { dialog, close } = openSheet({
    title: "Moment der Stille",
    onClose: () => clearInterval(timer),
    body: `
      <div class="stillness">
        <div class="stillness-orb ${motionLevel() === "off" ? "is-static" : ""}"><span></span></div>
        <p class="stillness-phrase" id="still-phrase">${escapeHtml(phrases[0])}</p>
        <small class="muted" id="still-left">2:00</small>
        <p class="muted small">Atme langsam ein, wenn der Kreis wächst – und aus, wenn er kleiner wird. Lass die Worte mit dem Atem gehen.</p>
      </div>`,
  });
  const timer = setInterval(() => {
    seconds -= 1;
    dialog.querySelector("#still-left").textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    if (seconds % 10 === 0) {
      index = (index + 1) % phrases.length;
      const phrase = dialog.querySelector("#still-phrase");
      phrase.classList.add("is-changing");
      setTimeout(() => { phrase.textContent = phrases[index]; phrase.classList.remove("is-changing"); }, 400);
    }
    if (seconds <= 0) {
      chime();
      close();
    }
  }, 1000);
}

export function qiblaText(location) {
  if (!location) return "";
  const degrees = Math.round(qibla(location.lat, location.lng));
  const directions = ["Norden", "Nordosten", "Osten", "Südosten", "Süden", "Südwesten", "Westen", "Nordwesten"];
  return `${degrees}° (${directions[Math.round(degrees / 45) % 8]})`;
}

export const methodLabel = (id) => METHODS[id]?.label || METHODS.mwl.label;
export const surahName = (number) => `${number}. ${SURAHS[number - 1]}`;
