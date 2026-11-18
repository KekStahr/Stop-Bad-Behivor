// "Wege": tools for hard moments, repentance, growing in faith and giving back to others.
// Every tool offers the same depth for both religions.
import { api, escapeHtml } from "../api.js";
import { openSheet, confirmSheet } from "../ui.js";
import { RELIGIONS, VERSES, BIBLE_BOOKS, SURAHS, TRACKER, COUNTERS } from "./data.js";
import { faith, saveFaith } from "./state.js";
import { EMOTIONS, HADITH, CHRISTIAN_WORDS, ASMA, GOD_NAMES, STORIES, PLANS, FREEDOM, GOOD_DEEDS, GUIDES, MYSTERIES, MYSTERY_OF_DAY, REVIEW, FAITH_HELP } from "./content.js";
import { badge, verseCard, bindVerseCard, openStillness } from "./ui.js";
import { openLearn } from "./learn.js";

function chooseLearn({ religions }) {
  const { dialog, close } = openSheet({
    title: "Welches Gebet möchtest du lernen?",
    body: `<div class="faith-actions centered">${religions.map((religion) => `<button class="button button-primary" data-learn="${religion}" type="button">${RELIGIONS[religion].symbol} ${religion === "islam" ? "Die Ṣalāh" : "Das Vaterunser"}</button>`).join("")}</div>`,
  });
  dialog.querySelectorAll("[data-learn]").forEach((button) => button.addEventListener("click", () => { close(); openLearn(button.dataset.learn); }));
}

const dayIndex = (date = new Date()) => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
const pick = (list, offset = 0) => list[(dayIndex() + offset) % list.length];
const verseFor = (religion, theme, seed = 0) => {
  const pool = VERSES.filter((verse) => verse.religion === religion && verse.theme === theme);
  return pool.length ? pool[(dayIndex() + seed) % pool.length] : null;
};
const targetLabel = (target) => (target.surah ? `Sure ${SURAHS[target.surah - 1]} ${target.surah}${target.ayah ? `:${target.ayah}` : ""}` : `${BIBLE_BOOKS[target.book - 1]} ${target.chapter}`);
const tradition = (religion) => (religion === "christian" ? faith().christianTradition : faith().islamTradition);

export function wordOfDay(religion) {
  const [text, source] = religion === "islam" ? pick(HADITH) : pick(CHRISTIAN_WORDS);
  return { text, source, label: religion === "islam" ? "Ḥadīth des Tages" : "Wort des Tages" };
}

export function nameOfDay(religion) {
  if (religion === "islam") {
    const index = dayIndex() % ASMA.length;
    return { name: ASMA[index][0], meaning: ASMA[index][1], number: index + 1 };
  }
  const item = pick(GOD_NAMES);
  return { name: item[0], meaning: item[1], target: { religion: "christian", book: item[2], chapter: item[3], verse: item[4] } };
}

// Everything is counted per religion – a prayer or good deed for one never counts for the other.
function stats(religion) {
  const current = faith();
  const since = Date.now() - 30 * 86400000;
  const ids = new Set(TRACKER[religion].map((item) => item.id));
  const prayers = Object.entries(current.trackerLog).filter(([day]) => new Date(day).getTime() >= since).reduce((sum, [, entry]) => sum + Object.entries(entry).filter(([id, done]) => done && ids.has(id)).length, 0);
  const counterIds = new Set(COUNTERS[religion].map((item) => item.id));
  const dhikr = Object.entries(current.counters).filter(([id]) => counterIds.has(id)).reduce((sum, [, value]) => sum + value, 0);
  return [
    ["🙏", prayers, "Gebete in 30 Tagen"], ["📖", (current.readChapters[religion] || []).length, religion === "islam" ? "Suren gelesen" : "Kapitel gelesen"], ["📿", dhikr, religion === "islam" ? "Dhikr gezählt" : "Gebete gezählt"],
    ["✍️", current.journal.filter((entry) => entry.religion === religion).length, "Tagebuch-Einträge"], ["🤝", current.deeds.filter((deed) => deed.religion === religion).length, "gute Taten"],
  ];
}

const TILES = [
  { group: "Für schwere Momente", items: [
    ["compass", "🧭", "Gefühls-Kompass", "Wie geht es dir? Worte, die genau jetzt helfen."],
    ["craving", "🔥", "Gebet bei Verlangen", "Wenn es gerade richtig schwer ist."],
    ["still", "🕊️", "Moment der Stille", "Zwei Minuten atmen mit Gott."],
    ["help", "☎️", "Seelsorge & Suchthilfe", "Menschen aus deinem Glauben, die zuhören."],
  ] },
  { group: "Umkehr & Neuanfang", items: [
    ["repent", "🌱", "Umkehr – Tauba & Beichte", "Wie ein Neuanfang vor Gott gelingt."],
    ["review", "🌙", "Abendlicher Rückblick", "Examen bzw. Muḥāsaba – fünf Minuten am Abend."],
    ["stories", "📜", "Geschichten der Umkehr", "Menschen, die gefallen und aufgestanden sind."],
  ] },
  { group: "Wachsen im Glauben", items: [
    ["freedom", "🗝️", "21 Tage in die Freiheit", "Jeden Tag ein Vers und ein kleiner Schritt."],
    ["plans", "📚", "Lesepläne", "Koran in 30 Tagen, Psalmen, Evangelium …"],
    ["names", "✨", "Namen Gottes", "Die 99 Namen Allahs · Namen Gottes in der Bibel."],
    ["memorize", "🧠", "Verse auswendig lernen", "Ein Wort im Herzen, wenn es darauf ankommt."],
    ["learn", "🎓", "Gebet lernen", "Haltung, Originaltext, Umschrift und Übersetzung – Schritt für Schritt."],
    ["guides", "🙏", "Gebetsanleitungen", "Wuḍūʾ, Ṣalāh, Rosenkranz, Lectio Divina …"],
    ["words", "💬", "Worte der Weisheit", "Hadithe und Worte aus der christlichen Tradition."],
  ] },
  { group: "Für andere da sein", items: [
    ["deeds", "🤲", "Gutes tun", "Ideen, um wieder Teil der Gemeinschaft zu werden."],
    ["place", "📍", "Gemeinde in der Nähe", "Moschee oder Kirche finden."],
    ["rooms", "💬", "Glaubensräume", "Austausch mit Menschen, die mit dir glauben."],
  ] },
];

export function renderWege(ctx) {
  const { view, religions } = ctx;
  const words = religions.map((religion) => ({ religion, ...wordOfDay(religion) }));
  const names = religions.map((religion) => ({ religion, ...nameOfDay(religion) }));
  view.innerHTML = `
    ${religions.map((religion) => `<section class="wege-stats card">${religions.length > 1 ? `<header>${badge(religion)}</header>` : ""}${stats(religion).map(([icon, value, label]) => `<div><span>${icon}</span><b>${value}</b><small>${label}</small></div>`).join("")}</section>`).join("")}
    <div class="wege-daily">
      ${words.map((word) => `
        <section class="card faith-card word-card">
          <header>${badge(word.religion)}<span class="eyebrow">${escapeHtml(word.label)}</span></header>
          <blockquote>„${escapeHtml(word.text)}“</blockquote>
          <small class="muted">${escapeHtml(word.source)}</small>
        </section>`).join("")}
      ${names.map((name) => `
        <section class="card faith-card name-card">
          <header>${badge(name.religion)}<span class="eyebrow">Name des Tages</span></header>
          <strong class="name-big">${escapeHtml(name.name)}</strong>
          <span>${escapeHtml(name.meaning)}</span>
          ${name.number ? `<small class="muted">${name.number}. der 99 schönsten Namen</small>` : `<button class="link-button" data-name-read='${JSON.stringify(name.target)}' type="button">In der Bibel lesen →</button>`}
        </section>`).join("")}
    </div>
    ${TILES.map((group) => `
      <section class="wege-group">
        <h3>${escapeHtml(group.group)}</h3>
        <div class="wege-tiles">${group.items.map(([id, icon, title, text]) => `
          <button type="button" class="wege-tile" data-tool="${id}"><span class="wege-icon">${icon}</span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(text)}</small></button>`).join("")}</div>
      </section>`).join("")}`;
  view.querySelectorAll("[data-tool]").forEach((button) => button.addEventListener("click", () => openTool(button.dataset.tool, ctx)));
  view.querySelector("[data-name-read]")?.addEventListener("click", (event) => ctx.openRead(JSON.parse(event.currentTarget.dataset.nameRead)));
}

export function openTool(id, ctx) {
  const tools = { learn: () => (ctx.religions.length > 1 ? chooseLearn(ctx) : openLearn(ctx.religions[0])), compass, craving: () => ctx.openPrayer(ctx.religions, "craving"), still: () => openStillness(ctx.religions), help, repent, review, stories, freedom, plans, names, memorize, guides, words, deeds, place, rooms };
  tools[id]?.(ctx);
}

// sections per religion inside a sheet, in the user's daily order
const perReligion = (religions, render) => religions.map((religion) => `<section class="sheet-religion">${religions.length > 1 ? `<h4>${badge(religion)}</h4>` : ""}${render(religion)}</section>`).join("");

function compass(ctx) {
  const { religions, showToast, openRead, openPrayer } = ctx;
  const { dialog } = openSheet({
    title: "Wie fühlst du dich gerade?",
    wide: true,
    body: `<div class="emotion-grid">${EMOTIONS.map((emotion) => `<button type="button" data-emotion="${emotion.id}"><span>${emotion.icon}</span>${escapeHtml(emotion.label)}</button>`).join("")}</div><div id="emotion-result"></div>`,
  });
  dialog.querySelectorAll("[data-emotion]").forEach((button) => button.addEventListener("click", () => {
    dialog.querySelectorAll("[data-emotion]").forEach((item) => item.classList.toggle("is-selected", item === button));
    const emotion = EMOTIONS.find((item) => item.id === button.dataset.emotion);
    const verses = religions.flatMap((religion) => emotion.themes.slice(0, 2).map((theme, index) => verseFor(religion, theme, index * 7 + Math.floor(Math.random() * 20)))).filter(Boolean);
    const result = dialog.querySelector("#emotion-result");
    result.innerHTML = `
      <p class="emotion-text">${emotion.icon} ${escapeHtml(emotion.text)}</p>
      <div class="verse-grid compact">${verses.map((verse, index) => verseCard(verse, { id: `e${index}` })).join("")}</div>
      <div class="faith-actions centered">
        <button class="button button-primary" data-pray type="button">🙏 Passendes Gebet</button>
        ${emotion.id === "hopeless" ? '<button class="button button-secondary" data-help type="button">☎️ Mit jemandem sprechen</button>' : ""}
      </div>`;
    verses.forEach((verse, index) => bindVerseCard(result.querySelector(`[data-verse-card="e${index}"]`), verse, { showToast, onRead: openRead }));
    result.querySelector("[data-pray]").addEventListener("click", () => openPrayer(religions, emotion.moment));
    result.querySelector("[data-help]")?.addEventListener("click", () => help(ctx));
    result.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
}

function help({ religions }) {
  const { dialog } = openSheet({
    title: "Seelsorge & Suchthilfe",
    wide: true,
    body: `
      <p class="sheet-text">Du musst das nicht allein schaffen. Diese Angebote kommen aus deinem Glauben – und hören zu, ohne zu verurteilen.</p>
      ${perReligion(religions, (religion) => FAITH_HELP.filter((item) => item.religion === religion).map((item) => `
        <article class="help-item">
          <div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.detail)}</small>${item.phone ? `<b class="help-phone">☎ ${escapeHtml(item.phone)}</b>` : ""}</div>
          <button class="button button-secondary small" data-url="${escapeHtml(item.url)}" type="button">Öffnen</button>
        </article>`).join(""))}
      <p class="crisis-alert">Bei akuter Gefahr: <strong>112</strong> · TelefonSeelsorge <strong>0800 111 0 111</strong> oder <strong>0800 111 0 222</strong> (kostenlos, 24/7)</p>
      <p class="muted small">Angaben ohne Gewähr – bitte prüfe Erreichbarkeit und Kosten auf der jeweiligen Website.</p>`,
  });
  dialog.querySelectorAll("[data-url]").forEach((button) => button.addEventListener("click", () => api("/api/app/open-external", { method: "POST", body: { url: button.dataset.url } }).catch(() => {})));
}

function guideHtml(guide) {
  return `<article class="guide"><h4>${guide.icon} ${escapeHtml(guide.title)}</h4><ol>${guide.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>${guide.note ? `<p class="muted small">${escapeHtml(guide.note)}</p>` : ""}</article>`;
}

function repent({ religions }) {
  openSheet({
    title: "Umkehr & Neuanfang",
    wide: true,
    body: `<p class="sheet-text">Niemand ist zu weit weg, um umzukehren. Hier ist, wie es geht.</p>
      ${perReligion(religions, (religion) => guideHtml(GUIDES.find((guide) => guide.id === (religion === "islam" ? "tauba" : "confession"))))}`,
  });
}

function review({ religions, showToast }) {
  let religion = religions[0];
  const { dialog, close } = openSheet({ title: "Abendlicher Rückblick", wide: true, body: '<div id="review"></div>' });
  const draw = () => {
    const plan = REVIEW[religion];
    dialog.querySelector("#review").innerHTML = `
      ${religions.length > 1 ? `<div class="segmented small">${religions.map((id) => `<button type="button" data-rel="${id}" class="${id === religion ? "is-selected" : ""}">${RELIGIONS[id].symbol} ${RELIGIONS[id].label}</button>`).join("")}</div>` : ""}
      <h4 class="review-title">${escapeHtml(plan.title)}</h4>
      <p class="muted small">${escapeHtml(plan.intro)}</p>
      <ol class="review-steps">${plan.steps.map((step, index) => `<li><label>${escapeHtml(step)}${index ? `<textarea rows="2" data-answer="${index}" maxlength="800"></textarea>` : ""}</label></li>`).join("")}</ol>
      <div class="sheet-actions"><button class="button button-primary" id="review-save" type="button">Im Tagebuch speichern</button></div>`;
    dialog.querySelectorAll("[data-rel]").forEach((button) => button.addEventListener("click", () => { religion = button.dataset.rel; draw(); }));
    dialog.querySelector("#review-save").addEventListener("click", () => {
      const answers = [...dialog.querySelectorAll("[data-answer]")].map((input) => [plan.steps[Number(input.dataset.answer)], input.value.trim()]).filter(([, text]) => text);
      if (!answers.length) return showToast("Schreib zu mindestens einer Frage etwas.", true);
      const text = answers.map(([question, answer]) => `${question}\n${answer}`).join("\n\n");
      saveFaith({ journal: [...faith().journal, { id: crypto.randomUUID(), kind: "reflection", religion, text, at: Date.now(), answered: false }] });
      close();
      showToast("Gespeichert. Schlaf in Frieden. 🌙");
      return undefined;
    });
  };
  draw();
}

function stories({ religions, openRead }) {
  const { dialog, close } = openSheet({
    title: "Geschichten der Umkehr",
    wide: true,
    body: `<p class="sheet-text">Propheten, Könige und ganz normale Menschen sind gefallen – und wieder aufgestanden.</p>
      ${perReligion(religions, (religion) => `<div class="story-list">${STORIES.filter((story) => story.religion === religion).map((story, index) => `
        <article class="story">
          <h4>${story.icon} ${escapeHtml(story.title)}</h4>
          <p>${escapeHtml(story.text)}</p>
          <p class="story-lesson">💡 ${escapeHtml(story.lesson)}</p>
          <footer><small>${escapeHtml(story.ref)}</small>${story.target ? `<button class="link-button" data-story="${religion}:${index}" type="button">Nachlesen →</button>` : ""}</footer>
        </article>`).join("")}</div>`)}`,
  });
  dialog.querySelectorAll("[data-story]").forEach((button) => button.addEventListener("click", () => {
    const [religion, index] = button.dataset.story.split(":");
    const story = STORIES.filter((item) => item.religion === religion)[Number(index)];
    close();
    openRead({ religion, ...story.target });
  }));
}

function freedom({ religions, showToast }) {
  const { dialog } = openSheet({ title: "21 Tage in die Freiheit", wide: true, body: '<div id="freedom"></div>' });
  const draw = () => {
    const done = faith().freedomDone;
    const next = FREEDOM.findIndex((_, index) => !done.includes(index));
    dialog.querySelector("#freedom").innerHTML = `
      <p class="sheet-text">Jeden Tag ein Vers und eine kleine Aufgabe. Studien zeigen: Neue Gewohnheiten brauchen Wiederholung – fang einfach an.</p>
      <div class="freedom-dots">${FREEDOM.map((_, index) => `<i class="${done.includes(index) ? "is-done" : index === next ? "is-now" : ""}">${index + 1}</i>`).join("")}</div>
      <div class="freedom-list">${FREEDOM.map(([title, task, theme], index) => {
        const verses = religions.map((religion) => verseFor(religion, theme, index)).filter(Boolean);
        return `
        <details class="freedom-day ${done.includes(index) ? "is-done" : ""}" ${index === next ? "open" : ""}>
          <summary><b>Tag ${index + 1}</b><span>${escapeHtml(title)}</span>${done.includes(index) ? "<i>✓</i>" : ""}</summary>
          <p class="freedom-task">🎯 ${escapeHtml(task)}</p>
          ${verses.map((verse) => `<p class="freedom-verse">„${escapeHtml(verse.text)}“ <small>– ${escapeHtml(verse.ref)}</small></p>`).join("")}
          <button class="button ${done.includes(index) ? "button-secondary" : "button-primary"} small" data-day="${index}" type="button">${done.includes(index) ? "Rückgängig" : "Heute geschafft ✓"}</button>
        </details>`;
      }).join("")}</div>`;
    dialog.querySelectorAll("[data-day]").forEach((button) => button.addEventListener("click", () => {
      const index = Number(button.dataset.day);
      const list = faith().freedomDone;
      const on = !list.includes(index);
      saveFaith({ freedomDone: on ? [...list, index] : list.filter((item) => item !== index) });
      if (on) showToast(index === 20 ? "21 Tage! Was für ein Weg. 🎉" : `Tag ${index + 1} geschafft. 💪`);
      draw();
    }));
  };
  draw();
}

function plans({ religions, openRead }) {
  const { dialog, close } = openSheet({ title: "Lesepläne", wide: true, body: '<div id="plans"></div>' });
  const draw = () => {
    const progress = faith().planProgress;
    dialog.querySelector("#plans").innerHTML = perReligion(religions, (religion) => PLANS.filter((plan) => plan.religion === religion).map((plan) => {
      const done = progress[plan.id] || [];
      const next = plan.days.findIndex((_, index) => !done.includes(index));
      return `
        <article class="plan">
          <header><span class="plan-icon">${plan.icon}</span><div><strong>${escapeHtml(plan.title)}</strong><small>${escapeHtml(plan.text)}</small></div><b>${done.length}/${plan.days.length}</b></header>
          <div class="plan-bar"><span style="--w:${(done.length / plan.days.length) * 100}%"></span></div>
          ${next >= 0 ? `<div class="plan-next"><span>Heute: <strong>${escapeHtml(plan.days[next].label)}</strong> · ${escapeHtml(targetLabel(plan.days[next].target))}</span>
            <span class="faith-actions"><button class="button button-primary small" data-read="${plan.id}:${next}" type="button">Lesen</button><button class="button button-secondary small" data-done="${plan.id}:${next}" type="button">Gelesen ✓</button></span></div>`
            : '<p class="plan-finished">🎉 Abgeschlossen – Gott segne dein Lesen.</p>'}
        </article>`;
    }).join(""));
    dialog.querySelectorAll("[data-read]").forEach((button) => button.addEventListener("click", () => {
      const [id, index] = button.dataset.read.split(":");
      const plan = PLANS.find((item) => item.id === id);
      close();
      openRead({ religion: plan.religion, ...plan.days[Number(index)].target });
    }));
    dialog.querySelectorAll("[data-done]").forEach((button) => button.addEventListener("click", () => {
      const [id, index] = button.dataset.done.split(":");
      const list = faith().planProgress[id] || [];
      saveFaith({ planProgress: { ...faith().planProgress, [id]: [...new Set([...list, Number(index)])] } });
      draw();
    }));
  };
  draw();
}

function names({ religions, openRead }) {
  let religion = religions[0];
  let query = "";
  const { dialog, close } = openSheet({ title: "Namen Gottes", wide: true, body: '<div id="names"></div>' });
  const draw = () => {
    const learned = faith().namesLearned;
    const list = religion === "islam"
      ? ASMA.map(([name, meaning], index) => ({ key: `i${index}`, name, meaning, number: index + 1 }))
      : GOD_NAMES.map(([name, ref, book, chapter, verse], index) => ({ key: `c${index}`, name, meaning: ref, target: { religion: "christian", book, chapter, verse } }));
    const shown = list.filter((item) => !query || `${item.name} ${item.meaning}`.toLowerCase().includes(query));
    const count = list.filter((item) => learned.includes(item.key)).length;
    dialog.querySelector("#names").innerHTML = `
      ${religions.length > 1 ? `<div class="segmented small">${religions.map((id) => `<button type="button" data-rel="${id}" class="${id === religion ? "is-selected" : ""}">${RELIGIONS[id].symbol} ${RELIGIONS[id].label}</button>`).join("")}</div>` : ""}
      <p class="sheet-text">${religion === "islam" ? "„Allah hat neunundneunzig Namen … wer sie sich bewahrt, tritt ins Paradies ein.“ (Buchārī 2736, Muslim 2677)" : "Die Bibel nennt Gott mit vielen Namen – jeder zeigt eine Seite seiner Liebe."} Tippe einen Namen an, wenn du ihn verinnerlicht hast.</p>
      <div class="names-head"><input type="search" id="name-search" placeholder="Suchen" value="${escapeHtml(query)}"><small>${count} von ${list.length} verinnerlicht</small></div>
      <div class="names-grid">${shown.map((item) => `
        <button type="button" class="name-tile ${learned.includes(item.key) ? "is-learned" : ""}" data-key="${item.key}">
          ${item.number ? `<i>${item.number}</i>` : ""}<strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.meaning)}</small>
          ${item.target ? `<span class="link-button" data-target='${JSON.stringify(item.target)}'>lesen →</span>` : ""}
        </button>`).join("")}</div>`;
    dialog.querySelectorAll("[data-rel]").forEach((button) => button.addEventListener("click", () => { religion = button.dataset.rel; draw(); }));
    const search = dialog.querySelector("#name-search");
    search.addEventListener("input", () => { query = search.value.trim().toLowerCase(); draw(); dialog.querySelector("#name-search").focus(); });
    dialog.querySelectorAll("[data-key]").forEach((button) => button.addEventListener("click", (event) => {
      const target = event.target.closest("[data-target]");
      if (target) {
        close();
        openRead(JSON.parse(target.dataset.target));
        return;
      }
      const list2 = faith().namesLearned;
      const key = button.dataset.key;
      saveFaith({ namesLearned: list2.includes(key) ? list2.filter((item) => item !== key) : [...list2, key] });
      draw();
    }));
  };
  draw();
}

function memorize({ religions, showToast }) {
  const favorites = faith().favorites;
  const pool = VERSES.filter((verse) => religions.includes(verse.religion) && (favorites.includes(verse.ref) || ["temptation", "strength"].includes(verse.theme)));
  let verse = pool.find((item) => favorites.includes(item.ref)) || pool[0];
  let level = 0;
  const { dialog } = openSheet({ title: "Verse auswendig lernen", wide: true, body: '<div id="memo"></div>' });
  const draw = () => {
    const words = verse.text.split(/\s+/);
    const hidden = new Set(words.map((_, index) => index).filter((index) => level && (index * 7 + level * 3) % 4 < level));
    const learned = faith().memorized.includes(verse.ref);
    dialog.querySelector("#memo").innerHTML = `
      <label class="reader-field"><span>Vers wählen (deine gemerkten Verse zuerst)</span><select id="memo-verse">${pool.map((item) => `<option value="${escapeHtml(item.ref)}" ${item === verse ? "selected" : ""}>${favorites.includes(item.ref) ? "♥ " : ""}${escapeHtml(item.ref)}</option>`).join("")}</select></label>
      <div class="memo-card">
        ${badge(verse.religion)}
        <p class="memo-text">${words.map((word, index) => (hidden.has(index) ? `<span class="memo-gap" data-word="${escapeHtml(word)}">${"_".repeat(Math.min(10, word.length))}</span>` : escapeHtml(word))).join(" ")}</p>
        <small>${escapeHtml(verse.ref)}</small>
      </div>
      <div class="memo-levels">${["Lesen", "Leicht", "Mittel", "Schwer", "Auswendig"].map((label, index) => `<button type="button" class="chip ${index === level ? "is-selected" : ""}" data-level="${index}">${label}</button>`).join("")}</div>
      <p class="muted small">Tippe auf eine Lücke, um das Wort zu sehen. Sag den Vers laut – mit jeder Stufe verschwinden mehr Wörter.</p>
      <div class="sheet-actions"><button class="button ${learned ? "button-secondary" : "button-primary"}" id="memo-done" type="button">${learned ? "✓ Kann ich auswendig" : "Ich kann ihn auswendig"}</button></div>`;
    dialog.querySelector("#memo-verse").addEventListener("change", (event) => { verse = pool.find((item) => item.ref === event.target.value); level = 0; draw(); });
    dialog.querySelectorAll("[data-level]").forEach((button) => button.addEventListener("click", () => { level = Number(button.dataset.level); draw(); }));
    dialog.querySelectorAll(".memo-gap").forEach((gap) => gap.addEventListener("click", () => { gap.textContent = gap.dataset.word; gap.classList.add("is-shown"); }));
    dialog.querySelector("#memo-done").addEventListener("click", () => {
      const list = faith().memorized;
      const on = !list.includes(verse.ref);
      saveFaith({ memorized: on ? [...list, verse.ref] : list.filter((ref) => ref !== verse.ref) });
      if (on) showToast("Wunderbar – dieses Wort trägst du jetzt im Herzen. 💛");
      draw();
    });
  };
  if (!verse) return;
  draw();
}

function guides({ religions }) {
  const mysteries = MYSTERIES[MYSTERY_OF_DAY[new Date().getDay()]];
  openSheet({
    title: "Gebetsanleitungen",
    wide: true,
    body: perReligion(religions, (religion) => `
      ${GUIDES.filter((guide) => guide.religion === religion && guide.id !== "tauba" && guide.id !== "confession" && (!guide.traditions || guide.traditions.includes(tradition(religion)))).map(guideHtml).join("")}
      ${religion === "christian" && tradition("christian") === "catholic" ? `<article class="guide mysteries"><h4>📿 Heute: ${escapeHtml(mysteries.label)}</h4><ol>${mysteries.items.map((item) => `<li>Jesus, ${escapeHtml(item)}.</li>`).join("")}</ol></article>` : ""}`),
  });
}

function words({ religions }) {
  openSheet({
    title: "Worte der Weisheit",
    wide: true,
    body: perReligion(religions, (religion) => `<div class="wisdom-list">${(religion === "islam" ? HADITH : CHRISTIAN_WORDS).map(([text, source]) => `<blockquote class="wisdom"><p>„${escapeHtml(text)}“</p><small>${escapeHtml(source)}</small></blockquote>`).join("")}</div>`),
  });
}

function deeds({ religions, showToast }) {
  const { dialog } = openSheet({ title: "Gutes tun", wide: true, body: '<div id="deeds"></div>' });
  const draw = async () => {
    let saved = 0;
    try {
      const data = await api("/api/dashboard");
      saved = ((Date.now() - new Date(data.streakStart).getTime()) / 86400000) * (Number(data.dailyExpense) || 0);
    } catch {
      saved = 0;
    }
    const log = faith().deeds.slice().reverse();
    const forReligion = dialog.querySelector("[data-deed-for].is-selected")?.dataset.deedFor || religions[0];
    const groups = [...new Set(GOOD_DEEDS.map(([group]) => group))];
    dialog.querySelector("#deeds").innerHTML = `
      <p class="sheet-text">Wer anderen hilft, heilt selbst. Gutes tun gibt der Zeit, die früher die Sucht hatte, einen neuen Sinn – und bringt dich zurück in die Gemeinschaft.</p>
      ${saved > 1 ? `<div class="deed-money">💶 Durch deinen Verzicht hast du rund <strong class="sensitive">${saved.toFixed(0)} €</strong> gespart. ${religions.includes("islam") ? `2,5 % davon als Ṣadaqa wären <strong>${(saved * 0.025).toFixed(2)} €</strong>. ` : ""}${religions.includes("christian") ? `Ein Zehntel als Spende wären <strong>${(saved * 0.1).toFixed(2)} €</strong>.` : ""}</div>` : ""}
      ${groups.map((group) => `<h4 class="deed-group">${escapeHtml(group)}</h4><div class="deed-grid">${GOOD_DEEDS.filter(([item]) => item === group).map(([, icon, text]) => `<button type="button" class="deed" data-deed="${escapeHtml(text)}"><span>${icon}</span>${escapeHtml(text)}</button>`).join("")}</div>`).join("")}
      ${religions.length > 1 ? `<div class="deed-for"><span>Zählt für:</span><div class="segmented small">${religions.map((id) => `<button type="button" data-deed-for="${id}" class="${id === forReligion ? "is-selected" : ""}">${badge(id)}</button>`).join("")}</div></div>` : ""}
      <p class="muted small">So wird gezählt: Jede Tat, die du hier einträgst, zählt <strong>einmal</strong> – und nur für ${religions.length > 1 ? "die oben gewählte Religion" : "deine Religion"}. Die Zahl oben in „Wege“ ist die Summe deiner Einträge.</p>
      <form class="deed-own" id="deed-form"><input id="deed-text" maxlength="200" placeholder="Eigene gute Tat eintragen …"><button class="button button-primary" type="submit">Eintragen</button></form>
      <h4 class="deed-group">Deine guten Taten (${log.length})</h4>
      <div class="deed-log">${log.slice(0, 30).map((deed) => `<div><span>${deed.religion ? RELIGIONS[deed.religion].symbol : "✓"} ${escapeHtml(deed.text)}</span><small>${new Date(deed.at).toLocaleDateString("de-DE")}</small></div>`).join("") || '<p class="muted small">Tippe oben auf eine Idee, wenn du sie umgesetzt hast.</p>'}</div>`;
    const add = (text) => {
      saveFaith({ deeds: [...faith().deeds, { id: crypto.randomUUID(), text, religion: forReligion, at: Date.now() }].slice(-1000) });
      showToast(forReligion === "islam" ? "Möge Allah es annehmen. 🤲" : "Danke! Gott segne dich. 🤍");
      draw();
    };
    dialog.querySelectorAll("[data-deed]").forEach((button) => button.addEventListener("click", async () => {
      const ok = await confirmSheet({ title: "Gute Tat eintragen?", text: `„${escapeHtml(button.dataset.deed)}“ – hast du das heute getan?`, confirmLabel: "Ja, eintragen" });
      if (ok) add(button.dataset.deed);
    }));
    dialog.querySelectorAll("[data-deed-for]").forEach((button) => button.addEventListener("click", () => {
      dialog.querySelectorAll("[data-deed-for]").forEach((item) => item.classList.toggle("is-selected", item === button));
      draw();
    }));
    dialog.querySelector("#deed-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const text = dialog.querySelector("#deed-text").value.trim();
      if (text) add(text);
    });
  };
  draw();
}

function place({ religions, showToast }) {
  const location = faith().location;
  const { dialog } = openSheet({
    title: "Gemeinde in der Nähe",
    body: `
      <p class="sheet-text">Gemeinschaft trägt. Eine Gemeinde gibt Halt, Menschen und Aufgaben – genau das, was beim Neuanfang hilft.</p>
      <div class="faith-actions centered">
        ${religions.includes("islam") ? '<button class="button button-primary" data-search="Moschee" type="button">🕌 Moscheen anzeigen</button>' : ""}
        ${religions.includes("christian") ? `<button class="button button-primary" data-search="${tradition("christian") === "catholic" ? "katholische Kirche" : tradition("christian") === "protestant" ? "evangelische Kirche" : tradition("christian") === "orthodox" ? "orthodoxe Kirche" : "Freikirche"}" type="button">⛪ Kirchen anzeigen</button>` : ""}
      </div>
      <p class="muted small">Öffnet die Kartensuche im Browser${location ? ` rund um ${escapeHtml(location.name)}` : ""}. Dabei wird dein Standort an Google Maps übertragen.</p>`,
  });
  dialog.querySelectorAll("[data-search]").forEach((button) => button.addEventListener("click", () => {
    const url = location
      ? `https://www.google.com/maps/search/${encodeURIComponent(button.dataset.search)}/@${location.lat},${location.lng},13z`
      : `https://www.google.com/maps/search/${encodeURIComponent(`${button.dataset.search} in der Nähe`)}`;
    api("/api/app/open-external", { method: "POST", body: { url } }).catch((error) => showToast(error.message, true));
  }));
}

function rooms({ religions }) {
  if (!faith().community) {
    openSheet({ title: "Glaubensräume", body: '<p class="sheet-text">Die Glaubensräume sind ausgeschaltet. Du kannst sie in den Einstellungen unter „Glaube“ aktivieren.</p>' });
    return;
  }
  window.dispatchEvent(new CustomEvent("reso:open-room", { detail: `f:${religions.length > 1 ? "together" : religions[0]}` }));
}

