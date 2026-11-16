// "Glaube": a calm, personal space for Christians and Muslims – on equal footing.
// Everything personal is stored encrypted on this device (see gui/faith/state.js).
import { escapeHtml } from "../api.js";
import { confirmSheet, openSheet } from "../ui.js";
import { RELIGIONS, CHRISTIAN_TRADITIONS, ISLAM_TRADITIONS, PRAYERS, MOMENTS, TRACKER, JOURNAL_KINDS, SCENES, verseOfDay, randomVerse, VERSES } from "../faith/data.js";
import { faith, loadFaith, saveFaith, activeReligions, prayerConfig, hashPin, todayKey, onFaithChange } from "../faith/state.js";
import { prayerTimes, nextPrayer, ymdIn, formatClock, hijri, holidays, churchSeason, ramadanInfo, lentInfo, PRAYERS as PRAYER_TIMES, addDays } from "../faith/calc.js";
import { badge, verseCard, bindVerseCard, openLocationSheet, openAdjustSheet, openCounter, openStillness, qiblaText, methodLabel } from "../faith/ui.js";
import { renderReader } from "../faith/reader.js";

let tab = "today";
let focus = "all"; // all | christian | islam
let unlocked = false;
let readTarget = null;

// Lets other parts of the app open the reader at a passage.
export function openFaithReader(target) {
  readTarget = target;
  tab = "read";
}

const TABS = [["today", "Heute"], ["read", "Lesen"], ["prayer", "Gebet"], ["calendar", "Kalender"], ["journal", "Tagebuch"]];

export async function render(root, context) {
  const { showToast } = context;
  try {
    await loadFaith();
  } catch (error) {
    root.innerHTML = `<div class="card empty-state"><div class="empty-icon">🔒</div><h3>Der Bereich Glaube konnte nicht geöffnet werden</h3><p class="muted">${escapeHtml(error.message)}</p></div>`;
    return undefined;
  }
  const current = faith();
  if (current.enabled && current.pin && !unlocked) return renderLock(root, context);
  if (!current.enabled || (!current.christian && !current.islam)) return renderSetup(root, context);
  return renderSpace(root, context);
}

// ---- lock ------------------------------------------------------------------------------------
function renderLock(root, context) {
  root.innerHTML = `
    <div class="faith-lock reveal">
      <div class="faith-lock-icon">🔒</div>
      <h1>Glaube</h1>
      <p class="muted">Dieser Bereich ist mit einer PIN geschützt.</p>
      <form id="pin-form"><input id="pin-input" type="password" inputmode="numeric" maxlength="8" autocomplete="off" aria-label="PIN"><button class="button button-primary" type="submit">Öffnen</button></form>
    </div>`;
  const input = root.querySelector("#pin-input");
  input.focus();
  root.querySelector("#pin-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const current = faith();
    if (await hashPin(input.value, current.pinSalt) === current.pin) {
      unlocked = true;
      context.refresh();
    } else {
      input.value = "";
      input.classList.add("is-invalid");
      context.showToast("Falsche PIN.", true);
    }
  });
  return undefined;
}

// ---- first start: choose religion(s), tradition and place ------------------------------------
function renderSetup(root, { showToast, refresh }) {
  const current = faith();
  const choice = { christian: current.christian, islam: current.islam, christianTradition: current.christianTradition, islamTradition: current.islamTradition };
  root.innerHTML = `
    <div class="faith-setup reveal">
      <div class="faith-setup-glow" aria-hidden="true"></div>
      <span class="eyebrow">Ein Raum für deinen Glauben</span>
      <h1>Glaube</h1>
      <p class="faith-setup-lead">Viele Menschen finden in schweren Zeiten Halt bei Gott. Hier ist Platz dafür: Gebet, Schrift, Stille und Menschen, die mit dir glauben.</p>
      <div class="faith-choice">
        ${["christian", "islam"].map((id) => `
          <button type="button" class="faith-option ${choice[id] ? "is-selected" : ""}" data-choose="${id}" aria-pressed="${choice[id]}">
            <span class="faith-symbol">${RELIGIONS[id].symbol}</span>
            <strong>${RELIGIONS[id].label}</strong>
            <small>${id === "christian" ? "Bibel, Gebete, Kirchenjahr, Gebetsschnur" : "Koran, Gebetszeiten, Hidschri-Kalender, Tasbīḥ"}</small>
            <select data-tradition="${id}" aria-label="Tradition">${(id === "christian" ? CHRISTIAN_TRADITIONS : ISLAM_TRADITIONS).map(([value, label]) => `<option value="${value}" ${choice[`${id}Tradition`] === value ? "selected" : ""}>${label}</option>`).join("")}</select>
          </button>`).join("")}
      </div>
      <p class="muted small">Du kannst eines oder beide wählen und jederzeit wechseln. Beide Wege stehen hier gleichwertig nebeneinander.</p>
      <div class="faith-privacy"><span>🔐</span><span><strong>Bleibt privat.</strong> Dein Glaube, deine Gebete und dein Tagebuch werden verschlüsselt nur auf diesem Gerät gespeichert – nicht in der Cloud.</span></div>
      <button class="button button-primary button-large" id="faith-start" type="button" ${choice.christian || choice.islam ? "" : "disabled"}>Bereich öffnen</button>
    </div>`;
  const start = root.querySelector("#faith-start");
  root.querySelectorAll("[data-choose]").forEach((button) => button.addEventListener("click", (event) => {
    if (event.target.closest("select")) return;
    const id = button.dataset.choose;
    choice[id] = !choice[id];
    button.classList.toggle("is-selected", choice[id]);
    button.setAttribute("aria-pressed", String(choice[id]));
    start.disabled = !choice.christian && !choice.islam;
  }));
  root.querySelectorAll("[data-tradition]").forEach((select) => select.addEventListener("change", () => {
    choice[`${select.dataset.tradition}Tradition`] = select.value;
  }));
  start.addEventListener("click", async () => {
    const method = choice.islamTradition === "shia-jafari" ? "jafari" : choice.islamTradition === "sunni-hanafi" ? "diyanet" : "mwl";
    await saveFaith({ ...choice, enabled: true, method, order: choice.christian && choice.islam ? "alternate" : current.order }, { immediate: true });
    window.dispatchEvent(new Event("reso:faith"));
    showToast("Willkommen. Schön, dass du da bist. 🤍");
    if (choice.islam && !faith().location) setTimeout(() => openLocationSheet({ showToast, onSaved: () => refresh() }), 400);
    refresh();
  });
  return undefined;
}

// ---- the space -------------------------------------------------------------------------------
function renderSpace(root, context) {
  const { showToast, goTo } = context;
  let cleanupTab;
  let ticker;
  const religionsAll = () => activeReligions();
  const religions = () => {
    const all = religionsAll();
    return focus !== "all" && all.includes(focus) ? [focus] : all;
  };
  const current = faith();
  const scene = SCENES[current.scene] || SCENES.night;
  const h = hijri(new Date(), Number(current.hijriAdjust) || 0);
  const season = churchSeason(new Date(), current.christianTradition);
  const all = religionsAll();
  const subtitle = all.map((id) => (id === "islam" ? `☪ ${h.label}` : `✝ ${season.name}`)).join("  ·  ");

  root.innerHTML = `
    <div class="faith-page" data-faith-theme="${current.theme === "auto" ? (scene.dark ? "dark" : "light") : current.theme}" style="--faith-font:${current.fontSize}px">
      <div class="faith-backdrop ${scene.stars ? "has-stars" : ""} ${scene.pattern ? `pattern-${scene.pattern}` : ""}" style="background:${current.photo ? `center / cover no-repeat url(${current.photo})` : scene.css}" aria-hidden="true"><span class="faith-light"></span></div>
      <header class="page-header faith-header reveal">
        <div>
          <span class="eyebrow">${escapeHtml(subtitle)}</span>
          <h1>${escapeHtml(all.length > 1 ? "Friede sei mit dir" : RELIGIONS[all[0]].greeting)}</h1>
          <p class="subtitle">Ein stiller Ort für dich und Gott. 🔐 Verschlüsselt auf diesem Gerät.</p>
        </div>
        <div class="faith-header-actions">
          ${all.length > 1 ? `<div class="segmented faith-focus" role="tablist">${[["all", "Beide"], ...all.map((id) => [id, `${RELIGIONS[id].symbol} ${RELIGIONS[id].label}`])].map(([id, label]) => `<button type="button" data-focus="${id}" class="${focus === id ? "is-selected" : ""}">${escapeHtml(label)}</button>`).join("")}</div>` : ""}
          <button class="pill-button subtle" id="faith-settings" type="button">⚙︎ Einstellungen</button>
        </div>
      </header>
      <nav class="faith-tabs reveal" role="tablist">${TABS.map(([id, label]) => `<button type="button" role="tab" data-tab="${id}" aria-selected="${tab === id}">${label}</button>`).join("")}</nav>
      <div id="faith-view" class="reveal"></div>
    </div>`;

  const view = root.querySelector("#faith-view");
  const show = () => {
    cleanupTab?.();
    cleanupTab = undefined;
    clearInterval(ticker);
    root.querySelectorAll("[data-tab]").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.tab === tab)));
    const ctx = { ...context, religions: religions(), view, setTicker: (fn) => { ticker = setInterval(fn, 1000); }, openRead: (target) => { readTarget = target; tab = "read"; show(); } };
    if (tab === "today") renderToday(ctx);
    else if (tab === "read") {
      cleanupTab = renderReader(view, { showToast, religions: religions(), target: readTarget });
      readTarget = null;
    } else if (tab === "prayer") renderPrayer(ctx);
    else if (tab === "calendar") renderCalendar(ctx);
    else renderJournal(ctx);
  };
  root.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => { tab = button.dataset.tab; show(); }));
  root.querySelectorAll("[data-focus]").forEach((button) => button.addEventListener("click", () => {
    focus = button.dataset.focus;
    root.querySelectorAll("[data-focus]").forEach((item) => item.classList.toggle("is-selected", item === button));
    show();
  }));
  root.querySelector("#faith-settings").addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("reso:settings-section", { detail: "faith" }));
    goTo("settings");
  });
  const stop = onFaithChange((_, patch) => {
    if (patch.deleted || "enabled" in patch) context.refresh();
  });
  show();
  return () => {
    cleanupTab?.();
    clearInterval(ticker);
    stop();
  };
}

// ---- Heute -----------------------------------------------------------------------------------
function renderToday(ctx) {
  const { view, religions, showToast, setTicker, openRead } = ctx;
  const current = faith();
  const today = new Date();
  const verses = religions.length > 1 ? religions.map((religion) => verseOfDay([religion], today)) : [verseOfDay(religions, today)];
  const config = prayerConfig(current);
  const ramadan = religions.includes("islam") && current.fasting ? ramadanInfo(today, Number(current.hijriAdjust) || 0) : null;
  const lent = religions.includes("christian") && current.fasting ? lentInfo(today, current.christianTradition) : null;
  const upcoming = holidays({ ...current, christian: religions.includes("christian"), islam: religions.includes("islam") }, today, 120).slice(0, 3);
  const log = current.trackerLog[todayKey()] || {};
  const trackerItems = religions.flatMap((religion) => TRACKER[religion].filter((item) => !item.traditions || item.traditions.includes(religion === "christian" ? current.christianTradition : current.islamTradition)).map((item) => ({ ...item, religion })));

  view.innerHTML = `
    <section class="verse-day ${verses.length > 1 ? "is-pair" : ""}">
      <div class="verse-day-head"><span class="eyebrow">Vers des Tages</span><button class="link-button" id="verse-other" type="button">Anderer Vers ↻</button></div>
      <div class="verse-grid" id="verse-grid">${verses.map((verse, index) => verseCard(verse, { id: String(index) })).join("")}</div>
    </section>

    <div class="faith-grid">
      ${religions.includes("islam") ? `
        <section class="card faith-card prayer-card">
          <header>${badge("islam")}<button class="link-button" data-go-prayer type="button">Alle Zeiten →</button></header>
          ${config ? `
            <div class="next-prayer"><small>Nächstes Gebet</small><strong id="np-name">–</strong><span class="np-time" id="np-time"></span><span class="np-left" id="np-left"></span></div>
            <div class="prayer-strip" id="prayer-strip"></div>
            <small class="muted">📍 ${escapeHtml(current.location.name)} · Qibla ${qiblaText(current.location)}</small>`
            : `<p class="muted">Lege deinen Standort fest, damit Reşo dich an die Gebetszeiten erinnern kann.</p><button class="button button-primary" id="set-place" type="button">Standort festlegen</button>`}
        </section>` : ""}
      ${religions.includes("christian") ? `
        <section class="card faith-card church-card" style="--season:${churchSeason(today, current.christianTradition).color}">
          <header>${badge("christian")}<span class="season-chip">${churchSeason(today, current.christianTradition).icon} ${escapeHtml(churchSeason(today, current.christianTradition).name)}</span></header>
          <div class="next-prayer"><small>Heute beten</small><strong>${escapeHtml(nextChristianPrayer(current, today))}</strong></div>
          <p class="muted small">${today.getDay() === 0 ? "Sonntag – Tag des Herrn. Vielleicht ist heute ein Gottesdienst für dich dran?" : "Ein kurzes Gebet am Morgen und am Abend gibt dem Tag einen festen Halt."}</p>
          <button class="button button-secondary small" data-prayers="christian" type="button">Gebete öffnen</button>
        </section>` : ""}
      ${ramadan || lent ? `
        <section class="card faith-card fasting-card">
          ${ramadan ? `<div>${badge("islam")}<strong>Ramadan – Tag ${ramadan.day}</strong><span class="muted small">Noch ${ramadan.left} Tage. ${config ? `Iftar heute um <b id="iftar-time"></b>.` : ""} Fasten stärkt auch gegen andere Verlangen.</span></div>` : ""}
          ${lent ? `<div>${badge("christian")}<strong>Fastenzeit – Tag ${lent.day}</strong><span class="muted small">Noch ${lent.left} Tage bis Ostern. Eine Zeit der Umkehr – und der Freiheit.</span></div>` : ""}
        </section>` : ""}
      <section class="card faith-card craving-card">
        <header><span class="eyebrow">Wenn das Verlangen kommt</span></header>
        <p>Halte inne. Sprich mit Gott – genau jetzt, so wie du bist.</p>
        <div class="faith-actions">
          <button class="button button-primary" id="still" type="button">🕊️ Moment der Stille</button>
          ${religions.map((religion) => `<button class="button button-secondary" data-crave="${religion}" type="button">${RELIGIONS[religion].symbol} Gebet bei Verlangen</button>`).join("")}
          ${religions.map((religion) => `<button class="button button-secondary" data-counter="${religion}" type="button">${religion === "islam" ? "📿 Tasbīḥ" : "📿 Gebetsschnur"}</button>`).join("")}
        </div>
      </section>
      ${current.tracker && trackerItems.length ? `
        <section class="card faith-card tracker-card">
          <header><span class="eyebrow">Heute</span><span class="muted small" id="tracker-streak"></span></header>
          <div class="tracker-today">${trackerItems.map((item) => `
            <button type="button" class="tracker-item ${log[item.id] ? "is-done" : ""}" data-track="${item.id}"><span>${log[item.id] ? "✓" : RELIGIONS[item.religion].symbol}</span>${escapeHtml(item.label)}</button>`).join("")}</div>
        </section>` : ""}
      <section class="card faith-card">
        <header><span class="eyebrow">Demnächst</span><button class="link-button" data-go-calendar type="button">Kalender →</button></header>
        ${upcoming.length ? upcoming.map((event) => `<div class="holiday-row"><span class="holiday-icon">${event.icon}</span><span><strong>${escapeHtml(event.title)}</strong><small>${daysUntil(event.date)}</small></span>${badge(event.religion)}</div>`).join("") : '<p class="muted small">In den nächsten Wochen steht kein Feiertag an.</p>'}
      </section>
      ${current.community ? `
        <section class="card faith-card community-faith">
          <header><span class="eyebrow">Gemeinschaft</span></header>
          <p>Ein geschützter Raum zum Austausch mit Menschen, die mit dir glauben.</p>
          <div class="faith-actions">${religions.map((religion) => `<button class="button button-tinted" data-room="f:${religion}" type="button">${RELIGIONS[religion].symbol} ${religion === "islam" ? "Muslimischer Raum" : "Christlicher Raum"}</button>`).join("")}
            ${religionsAllSafe().length > 1 ? '<button class="button button-tinted" data-room="f:together" type="button">🤝 Gemeinsam glauben</button>' : ""}</div>
        </section>` : ""}
    </div>`;

  verses.forEach((verse, index) => bindVerseCard(view.querySelector(`[data-verse-card="${index}"]`), verse, { showToast, onRead: openRead }));
  view.querySelector("#verse-other").addEventListener("click", () => {
    const grid = view.querySelector("#verse-grid");
    const fresh = religions.map((religion) => randomVerse([religion]));
    grid.innerHTML = fresh.map((verse, index) => verseCard(verse, { id: `r${index}` })).join("");
    fresh.forEach((verse, index) => bindVerseCard(grid.querySelector(`[data-verse-card="r${index}"]`), verse, { showToast, onRead: openRead }));
  });
  view.querySelector("#set-place")?.addEventListener("click", () => openLocationSheet({ showToast, onSaved: () => renderToday(ctx) }));
  view.querySelector("[data-go-prayer]")?.addEventListener("click", () => view.closest(".faith-page").querySelector('[data-tab="prayer"]').click());
  view.querySelector("[data-go-calendar]")?.addEventListener("click", () => view.closest(".faith-page").querySelector('[data-tab="calendar"]').click());
  view.querySelector("[data-prayers]")?.addEventListener("click", () => view.closest(".faith-page").querySelector('[data-tab="prayer"]').click());
  view.querySelector("#still").addEventListener("click", () => openStillness(religions));
  view.querySelectorAll("[data-counter]").forEach((button) => button.addEventListener("click", () => openCounter(button.dataset.counter, { showToast })));
  view.querySelectorAll("[data-crave]").forEach((button) => button.addEventListener("click", () => openPrayerSheet(button.dataset.crave, "craving", { openRead })));
  view.querySelectorAll("[data-room]").forEach((button) => button.addEventListener("click", () => window.dispatchEvent(new CustomEvent("reso:open-room", { detail: button.dataset.room }))));
  view.querySelectorAll("[data-track]").forEach((button) => button.addEventListener("click", () => {
    const key = todayKey();
    const day = { ...(faith().trackerLog[key] || {}) };
    day[button.dataset.track] = !day[button.dataset.track];
    saveFaith({ trackerLog: { ...faith().trackerLog, [key]: day } });
    button.classList.toggle("is-done", day[button.dataset.track]);
    button.querySelector("span").textContent = day[button.dataset.track] ? "✓" : RELIGIONS[trackerItems.find((item) => item.id === button.dataset.track).religion].symbol;
    updateStreak();
  }));
  const updateStreak = () => {
    const streak = trackerStreak();
    const node = view.querySelector("#tracker-streak");
    if (node) node.textContent = streak ? `🔥 ${streak} ${streak === 1 ? "Tag" : "Tage"} in Folge` : "";
  };
  updateStreak();

  if (config) {
    const tick = () => {
      const next = nextPrayer(config);
      if (!next || !view.querySelector("#np-name")) return;
      view.querySelector("#np-name").textContent = next.label;
      view.querySelector("#np-time").textContent = formatClock(next.at, config.timeZone);
      const minutes = Math.max(0, Math.round((next.at - Date.now()) / 60000));
      view.querySelector("#np-left").textContent = minutes >= 60 ? `in ${Math.floor(minutes / 60)} Std. ${minutes % 60} Min.` : `in ${minutes} Min.`;
    };
    const times = prayerTimes(ymdIn(config.timeZone), config);
    const strip = view.querySelector("#prayer-strip");
    if (strip) strip.innerHTML = PRAYER_TIMES.map((prayer) => `<span class="${times[prayer.id] < new Date() ? "is-past" : ""}"><small>${prayer.label}</small><b>${formatClock(times[prayer.id], config.timeZone)}</b></span>`).join("");
    const iftar = view.querySelector("#iftar-time");
    if (iftar) iftar.textContent = formatClock(times.maghrib, config.timeZone);
    tick();
    setTicker(tick);
  }
}

const religionsAllSafe = () => activeReligions();

function nextChristianPrayer(current, now) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const toMinutes = (value) => { const [h, m] = String(value || "0:0").split(":").map(Number); return h * 60 + m; };
  const slots = [[toMinutes(current.morningPrayer), "Morgengebet"], ...(current.angelus ? [[360, "Angelus"], [720, "Angelus"], [1080, "Angelus"]] : []), [toMinutes(current.eveningPrayer), "Abendgebet"]].sort((a, b) => a[0] - b[0]);
  const next = slots.find(([at]) => at > minutes);
  if (!next) return "Nachtgebet – lege den Tag in Gottes Hände";
  return `${next[1]} um ${String(Math.floor(next[0] / 60)).padStart(2, "0")}:${String(next[0] % 60).padStart(2, "0")}`;
}

function daysUntil(date) {
  const today = new Date();
  const days = Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()) - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
  const when = days === 0 ? "heute" : days === 1 ? "morgen" : `in ${days} Tagen`;
  return `${when} · ${date.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "long" })}`;
}

function trackerStreak() {
  const log = faith().trackerLog;
  let streak = 0;
  for (let day = new Date(); ; day = addDays(day, -1)) {
    const entry = log[todayKey(day)];
    if (entry && Object.values(entry).some(Boolean)) streak += 1;
    else if (streak || todayKey(day) !== todayKey()) break;
    if (streak > 3650) break;
  }
  return streak;
}

function openPrayerSheet(religion, moment, { openRead }) {
  const tradition = religion === "christian" ? faith().christianTradition : faith().islamTradition;
  const list = PRAYERS.filter((prayer) => prayer.religion === religion && prayer.moment === moment && (!prayer.traditions || prayer.traditions.includes(tradition)));
  const verses = VERSES.filter((verse) => verse.religion === religion && verse.theme === (moment === "relapse" ? "forgiveness" : "temptation"));
  const verse = verses[Math.floor(Math.random() * verses.length)];
  const { dialog, close } = openSheet({
    title: MOMENTS[moment],
    wide: true,
    body: `<div class="prayer-sheet" style="--faith-font:${faith().fontSize}px">${list.map(prayerHtml).join("")}
      ${verse ? `<div class="prayer-verse">${verseCard(verse, { actions: false })}</div>` : ""}
      <p class="muted small">Das Verlangen geht vorbei – meist in 15 bis 30 Minuten. Du musst es nicht allein aushalten.</p></div>`,
  });
  dialog.querySelectorAll("[data-quran]").forEach((button) => button.addEventListener("click", () => {
    const [surah, ayah] = button.dataset.quran.split(",").map(Number);
    close();
    openRead({ religion: "islam", surah, ayah });
  }));
}

const prayerHtml = (prayer) => `
  <article class="prayer-item is-${prayer.religion}">
    <h4>${escapeHtml(prayer.title)}</h4>
    ${prayer.translit ? `<p class="prayer-translit">${escapeHtml(prayer.translit)}</p>` : ""}
    <p class="prayer-text">${escapeHtml(prayer.text).replace(/\n/g, "<br>")}</p>
    <footer>${prayer.source ? `<small>${escapeHtml(prayer.source)}</small>` : "<small></small>"}
      ${prayer.quran ? `<button type="button" class="link-button" data-quran="${prayer.quran.join(",")}">Im Koran lesen →</button>` : ""}</footer>
  </article>`;

// ---- Gebet -----------------------------------------------------------------------------------
function renderPrayer({ view, religions, showToast, openRead }) {
  const current = faith();
  const config = prayerConfig(current);
  let moment = "all";
  const week = Array.from({ length: 7 }, (_, index) => addDays(new Date(), -6 + index));

  const trackerGrid = (religion) => {
    const tradition = religion === "christian" ? current.christianTradition : current.islamTradition;
    const items = TRACKER[religion].filter((item) => !item.traditions || item.traditions.includes(tradition));
    const log = faith().trackerLog;
    const done = week.reduce((sum, day) => sum + items.filter((item) => log[todayKey(day)]?.[item.id]).length, 0);
    return `
      <section class="card faith-card">
        <header>${badge(religion)}<span class="muted small">${done} von ${items.length * 7} in 7 Tagen</span></header>
        <div class="tracker-grid" style="--cols:${week.length}">
          <span></span>${week.map((day) => `<small>${day.toLocaleDateString("de-DE", { weekday: "narrow" })}</small>`).join("")}
          ${items.map((item) => `<span class="tracker-label">${escapeHtml(item.label)}</span>${week.map((day) => `<button type="button" class="tracker-dot ${log[todayKey(day)]?.[item.id] ? "is-done" : ""}" data-day="${todayKey(day)}" data-item="${item.id}" aria-label="${escapeHtml(item.label)} ${day.toLocaleDateString("de-DE")}"></button>`).join("")}`).join("")}
        </div>
        ${religion === "islam" ? `<div class="qada"><span>Nachzuholende Gebete (Qaḍāʾ)</span><button type="button" class="icon-button" data-qada="-1">−</button><b id="qada">${current.qada}</b><button type="button" class="icon-button" data-qada="1">+</button></div>` : ""}
      </section>`;
  };

  const draw = () => {
    const list = PRAYERS.filter((prayer) => religions.includes(prayer.religion) && (moment === "all" || prayer.moment === moment)
      && (!prayer.traditions || prayer.traditions.includes(prayer.religion === "christian" ? current.christianTradition : current.islamTradition)))
      .sort((a, b) => religions.indexOf(a.religion) - religions.indexOf(b.religion)); // same daily order as everywhere
    const times = config ? prayerTimes(ymdIn(config.timeZone), config) : null;
    const weekTimes = config ? Array.from({ length: 7 }, (_, index) => { const day = addDays(new Date(), index); return { day, times: prayerTimes(ymdIn(config.timeZone, day), config) }; }) : [];
    view.innerHTML = `
      ${religions.includes("islam") ? `
        <section class="card faith-card times-card">
          <header>${badge("islam")}<span class="faith-actions"><button class="link-button" id="place" type="button">📍 ${escapeHtml(current.location?.name || "Standort festlegen")}</button>${config ? '<button class="link-button" id="adjust" type="button">Feinjustieren</button>' : ""}</span></header>
          ${config ? `
            <div class="times-today">${PRAYER_TIMES.map((prayer) => `<div class="${times[prayer.id] < new Date() ? "is-past" : ""} ${prayer.noPrayer ? "is-sun" : ""}"><small>${prayer.label}</small><b>${formatClock(times[prayer.id], config.timeZone)}</b><span>${prayer.hint}</span></div>`).join("")}</div>
            <details class="times-week"><summary>Die nächsten 7 Tage</summary><table><thead><tr><th></th>${PRAYER_TIMES.map((prayer) => `<th>${prayer.label}</th>`).join("")}</tr></thead><tbody>
              ${weekTimes.map(({ day, times: dayTimes }) => `<tr><th>${day.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "numeric" })}</th>${PRAYER_TIMES.map((prayer) => `<td>${formatClock(dayTimes[prayer.id], config.timeZone)}</td>`).join("")}</tr>`).join("")}
            </tbody></table></details>
            <small class="muted">Berechnung: ${escapeHtml(methodLabel(current.method))} · Asr ${current.islamTradition === "sunni-hanafi" ? "hanafitisch" : "Standard"} · Qibla ${qiblaText(current.location)}</small>`
            : '<p class="muted">Ohne Standort können keine Gebetszeiten berechnet werden.</p>'}
        </section>` : ""}
      ${current.tracker ? `<div class="faith-grid">${religions.map(trackerGrid).join("")}</div>` : ""}
      <section class="faith-prayers">
        <div class="chip-row">${[["all", "Alle"], ...Object.entries(MOMENTS)].map(([id, label]) => `<button type="button" class="chip ${moment === id ? "is-selected" : ""}" data-moment="${id}">${escapeHtml(label)}</button>`).join("")}</div>
        <div class="prayer-list" style="--faith-font:${current.fontSize}px">${list.map(prayerHtml).join("") || '<p class="muted">Für diesen Moment gibt es hier noch kein Gebet.</p>'}</div>
      </section>
      <div class="faith-actions centered">${religions.map((religion) => `<button class="button button-secondary" data-counter="${religion}" type="button">📿 ${religion === "islam" ? "Tasbīḥ-Zähler" : "Gebetsschnur"}</button>`).join("")}</div>`;
    view.querySelector("#place")?.addEventListener("click", () => openLocationSheet({ showToast, onSaved: draw }));
    view.querySelector("#adjust")?.addEventListener("click", () => openAdjustSheet({ showToast, onSaved: draw }));
    view.querySelectorAll("[data-moment]").forEach((button) => button.addEventListener("click", () => { moment = button.dataset.moment; draw(); }));
    view.querySelectorAll("[data-counter]").forEach((button) => button.addEventListener("click", () => openCounter(button.dataset.counter, { showToast })));
    view.querySelectorAll("[data-quran]").forEach((button) => button.addEventListener("click", () => {
      const [surah, ayah] = button.dataset.quran.split(",").map(Number);
      openRead({ religion: "islam", surah, ayah });
    }));
    view.querySelectorAll("[data-qada]").forEach((button) => button.addEventListener("click", () => {
      const qada = Math.max(0, faith().qada + Number(button.dataset.qada));
      saveFaith({ qada });
      view.querySelector("#qada").textContent = String(qada);
    }));
    view.querySelectorAll(".tracker-dot").forEach((dot) => dot.addEventListener("click", () => {
      const log = faith().trackerLog;
      const day = { ...(log[dot.dataset.day] || {}) };
      day[dot.dataset.item] = !day[dot.dataset.item];
      saveFaith({ trackerLog: { ...log, [dot.dataset.day]: day } });
      dot.classList.toggle("is-done", day[dot.dataset.item]);
    }));
  };
  draw();
}

// ---- Kalender --------------------------------------------------------------------------------
function renderCalendar({ view, religions }) {
  const current = faith();
  const list = holidays({ ...current, christian: religions.includes("christian"), islam: religions.includes("islam") }, new Date(), 366);
  const months = new Map();
  for (const event of list) {
    const key = event.date.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    if (!months.has(key)) months.set(key, []);
    months.get(key).push(event);
  }
  const tradition = (religion) => (religion === "christian" ? CHRISTIAN_TRADITIONS.find(([id]) => id === current.christianTradition)?.[1] : ISLAM_TRADITIONS.find(([id]) => id === current.islamTradition)?.[1]);
  view.innerHTML = `
    <section class="calendar-head card">
      ${religions.map((religion) => `<div>${badge(religion)}<strong>${religion === "islam" ? escapeHtml(hijri(new Date(), Number(current.hijriAdjust) || 0).label) : `${churchSeason(new Date(), current.christianTradition).icon} ${escapeHtml(churchSeason(new Date(), current.christianTradition).name)}`}</strong><small>${escapeHtml(tradition(religion) || "")}</small></div>`).join("")}
    </section>
    ${[...months].map(([month, events]) => `
      <section class="calendar-month">
        <h3>${escapeHtml(month)}</h3>
        ${events.map((event) => `
          <article class="calendar-event is-${event.religion}">
            <time><b>${event.date.getDate()}</b><small>${event.date.toLocaleDateString("de-DE", { weekday: "short" })}</small></time>
            <span class="holiday-icon">${event.icon}</span>
            <div><strong>${escapeHtml(event.title)}</strong>${event.text ? `<small>${escapeHtml(event.text)}</small>` : ""}${event.hijri ? `<small class="muted">${escapeHtml(event.hijri)}</small>` : ""}</div>
            <span class="calendar-side">${badge(event.religion)}<small>${escapeHtml(daysUntil(event.date).split(" · ")[0])}</small></span>
          </article>`).join("")}
      </section>`).join("") || '<p class="muted">Keine Feiertage gefunden.</p>'}
    ${religions.includes("islam") ? '<p class="fine-print">Islamische Daten nach dem Umm-al-Qura-Kalender. Je nach Mondsichtung kann ein Fest einen Tag früher oder später sein – das kannst du in den Einstellungen anpassen.</p>' : ""}`;
}

// ---- Tagebuch --------------------------------------------------------------------------------
function renderJournal({ view, religions, showToast }) {
  let kind = "gratitude";
  let religion = religions[0];
  let filter = "all";
  const draw = () => {
    const entries = faith().journal.filter((entry) => religions.includes(entry.religion) && (filter === "all" || entry.kind === filter)).slice().reverse();
    const requests = faith().journal.filter((entry) => entry.kind === "request" && religions.includes(entry.religion));
    view.innerHTML = `
      <section class="card journal-compose">
        <div class="chip-row">${Object.entries(JOURNAL_KINDS).map(([id, item]) => `<button type="button" class="chip ${id === kind ? "is-selected" : ""}" data-kind="${id}">${item.icon} ${escapeHtml(item.label)}</button>`).join("")}</div>
        ${religions.length > 1 ? `<div class="segmented small">${religions.map((id) => `<button type="button" data-jrel="${id}" class="${id === religion ? "is-selected" : ""}">${RELIGIONS[id].symbol} ${RELIGIONS[id].label}</button>`).join("")}</div>` : ""}
        <label class="journal-prompt" for="journal-text">${escapeHtml(JOURNAL_KINDS[kind].prompt[religion])}</label>
        <textarea id="journal-text" rows="4" maxlength="3000" placeholder="Schreib ehrlich – nur du und Gott lesen das."></textarea>
        <div class="journal-foot"><small class="muted">🔐 Verschlüsselt gespeichert, nie in der Cloud.</small><button class="button button-primary" id="journal-save" type="button">Speichern</button></div>
      </section>
      ${requests.length ? `<p class="muted small journal-stats">🕯️ ${requests.length} Gebetsanliegen · ${requests.filter((entry) => entry.answered).length} davon erhört</p>` : ""}
      <div class="chip-row">${[["all", "Alle"], ...Object.entries(JOURNAL_KINDS).map(([id, item]) => [id, item.label])].map(([id, label]) => `<button type="button" class="chip small ${filter === id ? "is-selected" : ""}" data-filter="${id}">${escapeHtml(label)}</button>`).join("")}</div>
      <div class="journal-list">${entries.map((entry) => `
        <article class="journal-entry ${entry.answered ? "is-answered" : ""}">
          <header><span>${JOURNAL_KINDS[entry.kind]?.icon || "✍️"} ${escapeHtml(JOURNAL_KINDS[entry.kind]?.label || "")}</span>${badge(entry.religion)}<time>${new Date(entry.at).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}</time></header>
          <p>${escapeHtml(entry.text).replace(/\n/g, "<br>")}</p>
          <footer>
            ${entry.kind === "request" ? `<button type="button" class="link-button" data-answer="${entry.id}">${entry.answered ? "✓ Erhört – Danke!" : "Als erhört markieren"}</button>` : "<span></span>"}
            <button type="button" class="link-button danger" data-delete="${entry.id}">Löschen</button>
          </footer>
        </article>`).join("") || '<p class="muted journal-empty">Noch keine Einträge. Fang mit einem Satz an – das reicht.</p>'}</div>`;
    view.querySelectorAll("[data-kind]").forEach((button) => button.addEventListener("click", () => { kind = button.dataset.kind; draw(); }));
    view.querySelectorAll("[data-jrel]").forEach((button) => button.addEventListener("click", () => { religion = button.dataset.jrel; draw(); }));
    view.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => { filter = button.dataset.filter; draw(); }));
    view.querySelector("#journal-save").addEventListener("click", () => {
      const text = view.querySelector("#journal-text").value.trim();
      if (!text) return showToast("Schreib zuerst ein paar Worte.", true);
      saveFaith({ journal: [...faith().journal, { id: crypto.randomUUID(), kind, religion, text, at: Date.now(), answered: false }].slice(-2000) });
      showToast(kind === "gratitude" ? "Danke ist ein Gebet. 🙏" : "Gespeichert. 🤍");
      draw();
      return undefined;
    });
    view.querySelectorAll("[data-answer]").forEach((button) => button.addEventListener("click", () => {
      saveFaith({ journal: faith().journal.map((entry) => (entry.id === button.dataset.answer ? { ...entry, answered: !entry.answered } : entry)) });
      draw();
    }));
    view.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", async () => {
      const ok = await confirmSheet({ title: "Eintrag löschen?", text: "Der Eintrag wird endgültig gelöscht.", confirmLabel: "Löschen", danger: true });
      if (!ok) return;
      saveFaith({ journal: faith().journal.filter((entry) => entry.id !== button.dataset.delete) });
      draw();
    }));
  };
  draw();
}

