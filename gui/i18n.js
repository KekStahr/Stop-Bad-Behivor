// App language. The interface is written in German; this module translates what is on screen
// from gui/i18n/<lang>.json (German text → translation, numbers as "#"). Prayer texts, verses,
// trigger words and anything people write themselves are never touched.
import { prefs } from "./prefs.js";

export const LANGUAGES = [
  ["en", "English"], ["de", "Deutsch"], ["es", "Español"], ["fr", "Français"], ["tr", "Türkçe"], ["ar", "العربية"],
  ["zh", "中文"], ["hi", "हिन्दी"], ["pt", "Português"], ["ru", "Русский"], ["ja", "日本語"],
];
// existing (German) users keep German; new installs start in English until they pick a language
export const currentLanguage = () => prefs.language || (prefs.onboarded ? "de" : "en");

const SKIP = ".reader-page,:not(html)[lang='ar'],:not(html)[lang='el'],:not(html)[lang='la'],.ayah,.learn-original,.learn-translit,.learn-translation,.catalog-words,.prayer-text,.prayer-translit,.freedom-verse,.wisdom,.name-tile,.story,.bubble,.reply-quote,.reply-bar,.sender,.room-preview,.chat-image,[data-no-i18n],textarea,script,style";
const ATTRS = ["placeholder", "title", "aria-label"];
const NUMBER = /\d+(?:[.,]\d+)?/g;

let dict = null;
const done = new WeakMap(); // node → text we wrote, so our own changes are not translated twice

export function translate(text) {
  if (!dict || !text) return text;
  const core = text.replace(/\s+/g, " ").trim();
  if (!core) return text;
  const numbers = core.match(NUMBER) || [];
  let hit = dict.get(core.replace(NUMBER, "#"));
  if (hit === undefined && /^„.+“$/.test(core)) { // quotes are shown in German quotation marks
    const inner = dict.get(core.slice(1, -1).replace(NUMBER, "#"));
    if (inner !== undefined) hit = `“${inner}”`;
  }
  if (hit === undefined) return text;
  let i = 0;
  const filled = hit.replace(/#/g, () => numbers[i++] ?? "#");
  const lead = text.match(/^\s*/)[0];
  const trail = text.match(/\s*$/)[0];
  return lead + filled + trail;
}

function translateText(node) {
  if (done.get(node) === node.nodeValue) return;
  const parent = node.parentElement;
  if (!parent || parent.closest(SKIP)) return;
  const next = translate(node.nodeValue);
  done.set(node, next);
  if (next !== node.nodeValue) node.nodeValue = next;
}

function translateAttrs(element) {
  for (const name of ATTRS) {
    const value = element.getAttribute(name);
    if (!value) continue;
    const next = translate(value);
    if (next !== value) element.setAttribute(name, next);
  }
}

function translateTree(root) {
  if (root.nodeType === Node.TEXT_NODE) return translateText(root);
  if (root.nodeType !== Node.ELEMENT_NODE || root.closest(SKIP)) return undefined;
  translateAttrs(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => (node.nodeType === Node.ELEMENT_NODE && node.matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) translateText(node);
    else translateAttrs(node);
  }
  return undefined;
}

export async function initI18n() {
  const lang = currentLanguage();
  document.documentElement.lang = lang;
  try {
    const response = await fetch(`i18n/${lang}.json`);
    if (!response.ok) return;
    dict = new Map(Object.entries(await response.json()).filter(([key, value]) => typeof value === "string" && value !== key));
  } catch {
    return; // no dictionary: the German original stays
  }
  translateTree(document.body);
  document.title = translate(document.title);
  new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "childList") record.addedNodes.forEach(translateTree);
      else if (record.type === "characterData") translateText(record.target);
      else translateAttrs(record.target);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
