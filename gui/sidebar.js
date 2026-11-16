import { api, escapeHtml } from "./api.js";
import { prefs, setPref, onPrefChange } from "./prefs.js";
import { openSheet } from "./ui.js";
import { QUOTES } from "./recovery.js";
import { faith, activeReligions, onFaithChange, loadFaith } from "./faith/state.js";
import { VERSES } from "./faith/data.js";

let offset = 0;
let quotes = QUOTES; // extended with the server list when online
let visitQuote = null;
let shown = null;

// Quotes, plus Bible/Quran verses when the faith area wants them ("mixed" or "only").
function pool() {
  const mode = faith().versesInQuotes;
  const religions = activeReligions();
  if (!religions.length || mode === "off") return quotes;
  const verses = VERSES.filter((verse) => religions.includes(verse.religion)).map((verse) => [verse.text, verse.ref, true]);
  return mode === "only" ? verses : [...quotes, ...verses];
}

// Same quote for everyone within one interval slot; "visit" keeps one per app start.
function pickQuote() {
  const list = pool();
  if (prefs.quoteInterval === "visit") {
    visitQuote ||= list[Math.floor(Math.random() * list.length)];
    return visitQuote;
  }
  const minutes = Math.max(1, Number(prefs.quoteInterval) || 60);
  const slot = Math.floor(Date.now() / (minutes * 60000));
  return list[(slot * 7919 + offset) % list.length];
}

function renderQuote(animate) {
  const figure = document.querySelector("#sidebar-quote");
  const [text, author, isVerse] = pickQuote();
  if (!figure || shown === text) return;
  shown = text;
  const apply = () => {
    figure.querySelector("#sidebar-quote-text").textContent = `„${text}“`;
    figure.querySelector("#sidebar-quote-author").textContent = `— ${author}`;
    figure.querySelector("#sidebar-quote-kind").textContent = isVerse ? "Vers" : "Zitat";
    figure.classList.toggle("is-verse", Boolean(isVerse));
    figure.classList.remove("is-changing");
  };
  if (animate) {
    figure.classList.add("is-changing");
    setTimeout(apply, 260);
  } else apply();
}

export function editWhy({ showToast }) {
  const { dialog, close } = openSheet({
    title: "Mein Warum",
    body: `
      <p class="sheet-text">Für wen oder wofür tust du das? Dieser Satz steht immer links neben dir – und erscheint in jedem schweren Moment.</p>
      <textarea id="why-input" rows="4" maxlength="500" placeholder="Für meine Kinder. Für meine Gesundheit. Für mich.">${escapeHtml(prefs.why)}</textarea>
      <div class="sheet-actions"><button class="button button-primary" id="why-save" type="button">Speichern</button></div>`,
  });
  const input = dialog.querySelector("#why-input");
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
  dialog.querySelector("#why-save").addEventListener("click", () => {
    setPref("why", input.value.trim());
    close();
    showToast("Dein Warum ist gespeichert. 💙");
  });
}

export function startSidebar(context) {
  renderQuote(false);
  api("/api/quotes").then(({ quotes: remote }) => {
    const known = new Set(QUOTES.map(([text]) => text));
    const extra = (remote || []).filter((item) => Array.isArray(item) && typeof item[0] === "string" && !known.has(item[0]));
    if (extra.length) quotes = [...QUOTES, ...extra];
  }).catch(() => {});
  setInterval(() => renderQuote(true), 30000);
  document.querySelector("#sidebar-quote-next").addEventListener("click", () => {
    offset += 1;
    visitQuote = null;
    renderQuote(true);
  });
  document.querySelector("#sidebar-why").addEventListener("click", () => editWhy(context));
  onPrefChange((key) => {
    if (key === "quoteInterval") renderQuote(true);
  });
  onFaithChange((_, patch) => {
    if ("versesInQuotes" in patch || "christian" in patch || "islam" in patch || "enabled" in patch || patch.deleted) {
      visitQuote = null;
      shown = null;
      renderQuote(true);
    }
  });
  loadFaith().then(() => { shown = null; renderQuote(false); }).catch(() => {});
}
