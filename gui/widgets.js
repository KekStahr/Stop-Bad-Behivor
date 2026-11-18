// The overview's widget board – like the home screen of a phone: widgets from all over the app,
// each small, medium or large, added, removed and moved freely. The "house" layout is the
// original overview; the user's own layout is stored in prefs.homeWidgets.
import { escapeHtml } from "./api.js";
import { prefs, setPref, formatMoney } from "./prefs.js";
import { ring, formatNumber, openSheet } from "./ui.js";
import { MILESTONES, QUOTES, nextMilestone, humanDuration } from "./recovery.js";
import { survivedWaves } from "./progress.js";
import { faith, activeReligions, prayerConfig } from "./faith/state.js";
import { verseOfDay } from "./faith/data.js";
import { nextPrayer, formatClock } from "./faith/calc.js";

const MOODS = ["😣", "😕", "😐", "🙂", "😄"];
export const HOUSE_LAYOUT = [
  { id: "metrics", size: "l" }, { id: "checkin", size: "m" }, { id: "level", size: "m" },
  { id: "body", size: "s" }, { id: "year", size: "s" }, { id: "goal", size: "s" },
];
const SIZE_LABEL = { s: "Klein", m: "Mittel", l: "Groß" };

let editOnNextRender = false;
export const requestWidgetEdit = () => { editOnNextRender = true; };

function readLayout() {
  try {
    const list = JSON.parse(prefs.homeWidgets || "null");
    if (Array.isArray(list)) return list.filter((item) => WIDGETS[item?.id] && WIDGETS[item.id].sizes.includes(item.size));
  } catch {
    // broken value: fall back to the house layout
  }
  return HOUSE_LAYOUT.map((item) => ({ ...item }));
}
const saveLayout = (layout) => setPref("homeWidgets", JSON.stringify(layout));

const card = (inner, cls = "", attrs = "") => `<section class="card widget-card ${cls}" ${attrs}>${inner}</section>`;
const tile = ({ icon, tone, eyebrow, value, text, go, act }) => card(`
  <div class="tile-icon" style="--tone:${tone}">${icon}</div>
  <div class="tile-copy"><span class="eyebrow">${eyebrow}</span><strong>${value}</strong>${text ? `<p>${text}</p>` : ""}</div>`, `tile ${go || act ? "is-link" : ""}`, go ? `data-go="${go}"` : act ? `data-act="${act}"` : "");

// Every widget: what it shows and which sizes make sense. ctx comes from the overview page.
export const WIDGETS = {
  metrics: {
    title: "Kennzahlen", icon: "📊", sizes: ["m", "l"], text: "Gespart, zurückgewonnene Zeit, Fokus und Entscheidungen.",
    render: (c) => `<button class="stat-strip" data-go="stats" type="button" title="Details in der Statistik">
      <span class="stat-chip"><i style="--tone:var(--green)">€</i><span><strong class="sensitive" data-count="${c.moneySaved}" data-format="money">0</strong><small>gespart</small></span></span>
      <span class="stat-chip"><i style="--tone:var(--teal)">◷</i><span><strong><span data-count="${c.timeSaved}" data-format="dec1">0</span> Std.</strong><small>zurückgewonnen</small></span></span>
      <span class="stat-chip"><i style="--tone:var(--indigo)">✦</i><span><strong><span data-count="${c.data.totalFocusMinutes / 60}" data-format="dec1">0</span> Std.</strong><small>Fokus</small></span></span>
      <span class="stat-chip"><i style="--tone:var(--orange)">↺</i><span><strong data-count="${c.data.habitsPrevented}">0</strong><small>bewusste Entscheidungen</small></span></span>
      <span class="stat-more" aria-hidden="true">›</span></button>`,
  },
  checkin: {
    title: "Täglicher Check-in", icon: "🌱", sizes: ["m", "l"], text: "Stimmung der Woche und dein Check-in für heute.",
    render: (c) => card(`
      <div class="card-header">
        <div><span class="eyebrow">Täglicher Check-in ${c.streak ? `· 🔥 ${c.streak} ${c.streak === 1 ? "Tag" : "Tage"} in Folge` : ""}</span>
          <h3>${c.checkin ? `Heute: ${MOODS[c.checkin.mood - 1]} ${c.checkin.pledge ? "· Versprechen gegeben" : ""}` : "Wie geht es dir heute?"}</h3></div>
        <button class="button ${c.checkin ? "button-secondary" : "button-primary"} small" data-act="checkin" type="button">${c.checkin ? "Bearbeiten" : "Einchecken"}</button>
      </div>
      <div class="mood-week">
        ${c.week.map((day) => `<span class="mood-day ${day.entry ? "has-entry" : ""}" title="${day.entry ? `Stimmung ${day.entry.mood}/5 · Verlangen ${day.entry.craving}/5` : "Kein Check-in"}"><b>${day.entry ? MOODS[day.entry.mood - 1] : "·"}</b><small>${day.label}</small></span>`).join("")}
      </div>
      ${c.checkin?.gratitude ? `<p class="gratitude">Dankbar für: <em>${escapeHtml(c.checkin.gratitude)}</em></p>` : '<p class="muted small">20 Sekunden für dich: Stimmung, Verlangen und ein kleines Versprechen.</p>'}`, `checkin-card ${c.checkin ? "is-done" : ""}`),
  },
  level: {
    title: "Level & Quests", icon: "⭐", sizes: ["m", "l"], text: "Deine XP und die vier Aufgaben von heute.",
    render: (c) => card(`
      <div class="level-head">
        <div class="level-badge">${ring({ size: 74, stroke: 7, progress: c.level.progress, color: "var(--purple)" })}<b>${c.level.level}</b></div>
        <div><span class="eyebrow">Level ${c.level.level} · ${escapeHtml(c.level.title)}</span>
          <h3>${formatNumber(c.xp.total)} XP</h3>
          <small class="muted">Noch ${formatNumber(c.level.toNext)} XP bis Level ${c.level.level + 1}</small></div>
      </div>
      <span class="eyebrow quests-title">Heutige Quests · ${c.questsDone}/${c.quests.length}</span>
      <div class="quests">${c.quests.map((quest) => `
        <button type="button" class="quest ${quest.done ? "is-done" : ""}" data-quest="${quest.action}">
          <span class="quest-check">${quest.done ? "✓" : quest.icon}</span><span>${quest.label}</span></button>`).join("")}</div>`, "level-card"),
  },
  body: {
    title: "Dein Körper heilt", icon: "💚", sizes: ["s", "m"], text: "Die nächste Etappe, in der dein Körper sich erholt.",
    render: (c) => (c.benefit && c.hasStart ? card(`
      <div class="highlight-ring">${ring({ size: 84, stroke: 8, progress: c.soberDays / c.benefit.days, color: "var(--green)" })}<span>${Math.ceil(c.benefit.days - c.soberDays)}<small>Tage</small></span></div>
      <div><span class="eyebrow">Dein Körper heilt</span><strong>${escapeHtml(c.benefit.label)}</strong><p>${escapeHtml(c.benefit.text)}</p></div>`, 'highlight', 'data-go="stats"')
      : tile({ icon: "💚", tone: "var(--green)", eyebrow: "Dein Körper heilt", value: "Alle Etappen geschafft", go: "stats" })),
  },
  year: {
    title: "In einem Jahr", icon: "🔭", sizes: ["s", "m"], text: "Was du in einem Jahr zurückgewonnen hast.",
    render: (c) => card(`
      <div class="highlight-icon" style="--tone:var(--teal)">🔭</div>
      <div><span class="eyebrow">In einem Jahr</span>
        <strong class="sensitive">${c.dailyExpense ? formatMoney(c.yearDays * c.dailyExpense) : `${formatNumber(c.yearDays)} Tage frei`}</strong>
        <p>${c.dailyExpense ? `gespart · ${formatNumber(c.yearDays * c.dailyHours)} Std. Lebenszeit zurück` : "Trag deine früheren Ausgaben ein, um mehr zu sehen."}</p></div>`, 'highlight', 'data-go="stats"'),
  },
  goal: {
    title: "Sparziel", icon: "🎯", sizes: ["s", "m"], text: "Wie nah du deinem Sparziel bist.",
    render: (c) => {
      const pct = c.goal?.target > 0 ? Math.min(1, c.moneySaved / c.goal.target) : 0;
      return card(`
        <div class="highlight-ring">${ring({ size: 84, stroke: 8, progress: pct, color: "var(--orange)" })}<span>${Math.round(pct * 100)}<small>%</small></span></div>
        <div><span class="eyebrow">Sparziel</span><strong>${escapeHtml(c.goal?.name || "Sparziel")}</strong>
          <p class="sensitive">${formatMoney(c.moneySaved)} von ${formatMoney(c.goal?.target || 0)}</p></div>`, 'highlight goal-highlight', 'data-go="stats"');
    },
  },
  milestone: {
    title: "Nächster Meilenstein", icon: "🏅", sizes: ["s", "m"], text: "Countdown bis zu deinem nächsten Meilenstein.",
    render: (c) => {
      const next = nextMilestone(c.soberDays * 86400);
      return next.next
        ? card(`<div class="highlight-ring">${ring({ size: 84, stroke: 8, progress: next.progress, color: "var(--accent)" })}<span>${next.next.icon}</span></div>
          <div><span class="eyebrow">Nächster Meilenstein</span><strong>${escapeHtml(next.next.label)}</strong><p>noch ${escapeHtml(humanDuration(next.remainingSeconds))}</p></div>`, 'highlight is-link', 'data-act="achievements"')
        : tile({ icon: "🕊️", tone: "var(--accent)", eyebrow: "Meilensteine", value: "Alle geschafft", act: "achievements" });
    },
  },
  achievements: {
    title: "Errungenschaften", icon: "🏆", sizes: ["s", "m"], text: "Wie viele Meilensteine du schon erreicht hast.",
    render: (c) => card(`<div class="highlight-ring">${ring({ size: 84, stroke: 8, progress: c.reached / MILESTONES.length, color: "var(--orange)" })}<span>${c.reached}</span></div>
      <div><span class="eyebrow">Errungenschaften</span><strong>${c.reached} von ${MILESTONES.length}</strong><p>Tippe, um alle zu sehen.</p></div>`, 'highlight is-link', 'data-act="achievements"'),
  },
  focus: {
    title: "Fokus heute", icon: "⏱️", sizes: ["s", "m"], text: "Fokus-Minuten heute, mit Schnellstart.",
    render: (c) => {
      const minutes = Number(c.analytics.dailyActivity?.[c.todayKey]) || 0;
      const goal = Math.max(1, Number(prefs.focusGoal) || 60);
      return card(`<div class="highlight-ring">${ring({ size: 84, stroke: 8, progress: Math.min(1, minutes / goal), color: "var(--indigo)" })}<span>${minutes}<small>Min.</small></span></div>
        <div><span class="eyebrow">Fokus heute</span><strong>${minutes >= goal ? "Tagesziel erreicht 🎯" : `Noch ${goal - minutes} Min.`}</strong><p>Tippe, um eine Session zu starten.</p></div>`, 'highlight is-link', 'data-go="timer"');
    },
  },
  waves: {
    title: "Überstandene Wellen", icon: "🌊", sizes: ["s", "m"], text: "Wie oft du Verlangen ausgesessen hast.",
    render: (c) => tile({ icon: "🌊", tone: "var(--teal)", eyebrow: "Überstandene Wellen", value: String(survivedWaves(c.analytics).length), text: "Jede Welle geht vorbei.", go: "stats" }),
  },
  usage: {
    title: "Bildschirmzeit", icon: "💻", sizes: ["s", "m"], text: "Wie lange du heute schon am PC bist.",
    render: (c) => tile({ icon: "💻", tone: "var(--graphite)", eyebrow: "Heute am PC", value: c.pcLabel(c.usage.todayMinutes || 0), text: c.usage.sessionMinutes ? `am Stück: ${c.pcLabel(c.usage.sessionMinutes)}` : "" }),
  },
  quote: {
    title: "Zitat des Tages", icon: "❝", sizes: ["m", "l"], text: "Ein Gedanke für heute.",
    render: () => {
      const [text, author] = QUOTES[Math.floor(Date.now() / 86400000) % QUOTES.length];
      return card(`<span class="eyebrow">Zitat des Tages</span><blockquote class="widget-quote">„${escapeHtml(text)}“</blockquote><small class="muted">${escapeHtml(author)}</small>`);
    },
  },
  why: {
    title: "Mein Warum", icon: "♥", sizes: ["s", "m", "l"], text: "Der Grund, warum du das tust.",
    render: () => tile({ icon: "♥", tone: "var(--pink)", eyebrow: "Mein Warum", value: prefs.why.trim() ? escapeHtml(prefs.why.trim().slice(0, 140)) : "Wofür tust du das?", text: prefs.why.trim() ? "" : "Tippe und schreib es auf.", act: "why" }),
  },
  faith: {
    title: "Glaube", icon: "🕊️", sizes: ["m", "l"], text: "Vers des Tages und das nächste Gebet.",
    render: () => {
      const religions = activeReligions();
      if (!religions.length) return tile({ icon: "🕊️", tone: "#c9a24a", eyebrow: "Glaube", value: "Bereich Glaube einrichten", text: "Gebetszeiten, Verse und mehr.", go: "faith" });
      const verse = verseOfDay([religions[0]]);
      const config = religions.includes("islam") ? prayerConfig(faith()) : null;
      const next = config ? nextPrayer(config) : null;
      return card(`<span class="eyebrow">Glaube</span>
        ${next ? `<strong>${escapeHtml(next.label)} um ${formatClock(next.at, config.timeZone)}</strong>` : ""}
        ${verse ? `<blockquote class="widget-quote">„${escapeHtml(verse.text)}“</blockquote><small class="muted">${escapeHtml(verse.ref)}</small>` : ""}`, 'is-link', 'data-go="faith"');
    },
  },
  game: {
    title: "Ablenk-Spiel", icon: "🏃", sizes: ["s", "m"], text: "Eine schnelle Runde gegen das Verlangen.",
    render: () => {
      let best = 0;
      try { best = Number(localStorage.getItem("life:runnerBest")) || 0; } catch { best = 0; }
      return tile({ icon: "🏃", tone: "var(--orange)", eyebrow: "Kurz ablenken", value: "Eine Runde spielen", text: best ? `Dein Rekord: ${best}` : "Spring, sammle, werde schneller.", act: "game" });
    },
  },
  help: {
    title: "Schnelle Hilfe", icon: "🆘", sizes: ["s", "m"], text: "Ein Tipp öffnet sofort „Ich brauche Hilfe“.",
    render: () => tile({ icon: "🆘", tone: "var(--red)", eyebrow: "Schwerer Moment?", value: "Ich brauche Hilfe", text: "Atemübung, Plan und Menschen, die zuhören.", act: "sos" }),
  },
  community: {
    title: "Community", icon: "💬", sizes: ["s", "m"], text: "Direkt zu den Chats.",
    render: () => tile({ icon: "💬", tone: "var(--pink)", eyebrow: "Community", value: "Mit anderen schreiben", text: "Menschen, die dich verstehen.", go: "community" }),
  },
};

function widgetHtml(item, editing, index, count) {
  const widget = WIDGETS[item.id];
  return `<div class="widget w-${item.size} ${editing ? "is-editing" : ""}" data-widget="${item.id}" data-index="${index}" ${editing ? 'draggable="true"' : ""}>
    ${widget.render(boardCtx)}
    ${editing ? `<div class="widget-tools">
      <button type="button" data-w-move="-1" ${index === 0 ? "disabled" : ""} aria-label="Nach vorne" title="Nach vorne">←</button>
      ${widget.sizes.length > 1 ? `<button type="button" data-w-size aria-label="Größe ändern" title="Größe ändern">${SIZE_LABEL[item.size]}</button>` : ""}
      <button type="button" data-w-move="1" ${index === count - 1 ? "disabled" : ""} aria-label="Nach hinten" title="Nach hinten">→</button>
      <button type="button" class="is-remove" data-w-remove aria-label="Entfernen" title="Entfernen">✕</button>
    </div>` : ""}
  </div>`;
}

let boardCtx = null;

// Renders the board into `host` and keeps it interactive; `handlers` come from the overview page.
export function mountBoard(host, ctx, handlers) {
  boardCtx = ctx;
  let layout = readLayout();
  let editing = editOnNextRender;
  editOnNextRender = false;
  const draw = () => {
    host.innerHTML = `
      <div class="widget-bar">
        <span class="eyebrow">${editing ? "Ziehen, Größe ändern, entfernen" : ""}</span>
        <div class="widget-bar-actions">
          ${editing ? `<button type="button" class="pill-button subtle" data-w-add>＋ Widget</button>
            <button type="button" class="pill-button subtle" data-w-reset>Hauseigene Übersicht</button>
            <button type="button" class="pill-button" data-w-done>Fertig</button>`
            : '<button type="button" class="pill-button subtle" data-w-edit>✎ Widgets anpassen</button>'}
        </div>
      </div>
      <div class="widget-board ${editing ? "is-editing" : ""}">${layout.map((item, index) => widgetHtml(item, editing, index, layout.length)).join("")}
        ${editing ? '<button type="button" class="widget-add-slot" data-w-add>＋ Widget hinzufügen</button>' : ""}
        ${!layout.length && !editing ? '<p class="muted small">Keine Widgets. Über „Widgets anpassen“ kannst du welche hinzufügen.</p>' : ""}</div>`;
    handlers.afterDraw?.(host);
  };
  const commit = () => { saveLayout(layout); draw(); };
  const indexOf = (target) => Number(target.closest("[data-widget]")?.dataset.index);

  function openCatalog() {
    const used = new Set(layout.map((item) => item.id));
    const { dialog, close } = openSheet({
      title: "Widget hinzufügen",
      wide: true,
      body: `<div class="widget-catalog">${Object.entries(WIDGETS).map(([id, widget]) => `
        <button type="button" class="widget-option ${used.has(id) ? "is-used" : ""}" data-pick-widget="${id}">
          <span class="widget-option-icon">${widget.icon}</span>
          <strong>${escapeHtml(widget.title)}</strong><small>${escapeHtml(widget.text)}</small>
          <em>${used.has(id) ? "✓ Auf der Übersicht" : widget.sizes.map((size) => SIZE_LABEL[size]).join(" · ")}</em>
        </button>`).join("")}</div>`,
    });
    dialog.querySelectorAll("[data-pick-widget]").forEach((button) => button.addEventListener("click", () => {
      const id = button.dataset.pickWidget;
      if (!used.has(id)) layout.push({ id, size: WIDGETS[id].sizes.includes("m") ? "m" : WIDGETS[id].sizes[0] });
      close();
      commit();
      host.querySelector(`[data-widget="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }));
  }

  host.addEventListener("click", (event) => {
    const t = event.target;
    if (t.closest("[data-w-edit]")) { editing = true; return draw(); }
    if (t.closest("[data-w-done]")) { editing = false; return draw(); }
    if (t.closest("[data-w-add]")) return openCatalog();
    if (t.closest("[data-w-reset]")) { layout = HOUSE_LAYOUT.map((item) => ({ ...item })); setPref("homeWidgets", ""); return draw(); }
    if (t.closest("[data-w-remove]")) { layout.splice(indexOf(t), 1); return commit(); }
    if (t.closest("[data-w-size]")) {
      const item = layout[indexOf(t)];
      const sizes = WIDGETS[item.id].sizes;
      item.size = sizes[(sizes.indexOf(item.size) + 1) % sizes.length];
      return commit();
    }
    const move = t.closest("[data-w-move]");
    if (move) {
      const from = indexOf(t);
      const to = from + Number(move.dataset.wMove);
      [layout[from], layout[to]] = [layout[to], layout[from]];
      return commit();
    }
    if (editing) return undefined; // while arranging, widgets don't open anything
    const go = t.closest("[data-go]");
    if (go) return handlers.goTo(go.dataset.go);
    const quest = t.closest("[data-quest]");
    if (quest) return handlers.quest(quest.dataset.quest);
    const act = t.closest("[data-act]");
    if (act) return handlers.act(act.dataset.act);
    return undefined;
  });

  // drag & drop to reorder (mouse); the arrow buttons do the same for keyboard users
  let dragFrom = -1;
  host.addEventListener("dragstart", (event) => {
    dragFrom = indexOf(event.target);
    event.target.closest("[data-widget]")?.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
  });
  host.addEventListener("dragover", (event) => {
    if (dragFrom < 0) return;
    event.preventDefault();
    host.querySelectorAll(".is-drop").forEach((node) => node.classList.remove("is-drop"));
    event.target.closest("[data-widget]")?.classList.add("is-drop");
  });
  host.addEventListener("drop", (event) => {
    event.preventDefault();
    const to = indexOf(event.target);
    if (dragFrom >= 0 && Number.isFinite(to) && to !== dragFrom) {
      const [item] = layout.splice(dragFrom, 1);
      layout.splice(to, 0, item);
      commit();
    }
    dragFrom = -1;
  });
  host.addEventListener("dragend", () => {
    dragFrom = -1;
    host.querySelectorAll(".is-dragging, .is-drop").forEach((node) => node.classList.remove("is-dragging", "is-drop"));
  });
  draw();
  if (editing) host.scrollIntoView({ behavior: "smooth", block: "start" });
}
