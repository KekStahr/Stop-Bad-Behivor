// Quran and Bible reader: many languages, Arabic text, recitation, bookmarks, reading progress.
import { escapeHtml } from "../api.js";
import { BIBLE_BOOKS, BIBLE_CHAPTERS, SURAHS, SURAH_AYAHS, QURAN_EDITIONS, BIBLE_TRANSLATIONS, RECITERS } from "./data.js";
import { faith, saveFaith } from "./state.js";
import { fetchScripture, badge } from "./ui.js";

export function renderReader(container, { showToast, religions, target }) {
  let religion = target?.religion && religions.includes(target.religion) ? target.religion : religions[0];
  let audio = null;
  let alive = true;
  const last = () => faith().lastRead[religion] || (religion === "islam" ? { surah: 1 } : { book: 43, chapter: 1 });
  let position = target?.religion === religion ? { ...target } : { ...last() };

  const optionList = (items, selected) => items.map(([id, label]) => `<option value="${id}" ${id === selected ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");

  function stopAudio() {
    audio?.pause();
    audio = null;
    container.querySelector("#reader-play")?.classList.remove("is-playing");
    container.querySelectorAll(".ayah.is-playing").forEach((node) => node.classList.remove("is-playing"));
  }

  function shell() {
    const current = faith();
    const isQuran = religion === "islam";
    const read = current.readChapters[religion] || [];
    const total = isQuran ? 114 : 1189;
    container.innerHTML = `
      <div class="reader">
        <div class="reader-bar card">
          ${religions.length > 1 ? `<div class="segmented small reader-switch">${religions.map((id) => `<button type="button" data-religion="${id}" class="${id === religion ? "is-selected" : ""}">${badge(id)}</button>`).join("")}</div>` : ""}
          ${isQuran ? `
            <label class="reader-field"><span>Sure</span><select id="reader-surah">${SURAHS.map((name, index) => `<option value="${index + 1}" ${index + 1 === Number(position.surah) ? "selected" : ""}>${index + 1}. ${escapeHtml(name)}</option>`).join("")}</select></label>
            <label class="reader-field"><span>Übersetzung</span><select id="reader-edition">${optionList(QURAN_EDITIONS, current.quranEdition)}</select></label>
            <label class="reader-field"><span>Rezitation</span><select id="reader-reciter">${optionList(RECITERS, current.reciter)}</select></label>
            <label class="reader-check"><input type="checkbox" id="reader-arabic" ${current.showArabic ? "checked" : ""}> Arabisch</label>
            <button type="button" class="button button-secondary small" id="reader-play">▶ Anhören</button>` : `
            <label class="reader-field"><span>Buch</span><select id="reader-book">${BIBLE_BOOKS.map((name, index) => `<option value="${index + 1}" ${index + 1 === Number(position.book) ? "selected" : ""}>${escapeHtml(name)}</option>`).join("")}</select></label>
            <label class="reader-field"><span>Kapitel</span><select id="reader-chapter">${Array.from({ length: BIBLE_CHAPTERS[position.book - 1] }, (_, index) => `<option ${index + 1 === Number(position.chapter) ? "selected" : ""}>${index + 1}</option>`).join("")}</select></label>
            <label class="reader-field"><span>Übersetzung</span><select id="reader-translation">${optionList(BIBLE_TRANSLATIONS, current.bibleTranslation)}</select></label>`}
          <span class="reader-font">
            <button type="button" class="icon-button" data-font="-1" aria-label="Schrift kleiner">A−</button>
            <button type="button" class="icon-button" data-font="1" aria-label="Schrift größer">A+</button>
          </span>
        </div>
        <div class="reader-progress"><span style="--w:${(read.length / total) * 100}%"></span><small>${read.length} von ${total} ${isQuran ? "Suren" : "Kapiteln"} gelesen</small></div>
        <article class="reader-page card" id="reader-page" aria-live="polite"><div class="loading-state"><span class="spinner"></span>Lade Text …</div></article>
        <nav class="reader-nav">
          <button type="button" class="button button-secondary" id="reader-prev">← Zurück</button>
          <button type="button" class="button button-tinted" id="reader-done"></button>
          <button type="button" class="button button-secondary" id="reader-next">Weiter →</button>
        </nav>
        ${bookmarksHtml()}
      </div>`;
    bind();
    load();
  }

  function bookmarksHtml() {
    const marks = faith().bookmarks.filter((mark) => mark.religion === religion).slice(-12).reverse();
    if (!marks.length) return '<p class="muted small reader-tip">Tipp: Tippe auf einen Vers, um ein Lesezeichen zu setzen.</p>';
    return `<section class="card reader-marks"><h4>Lesezeichen</h4>${marks.map((mark) => `
      <button type="button" class="chip" data-mark='${escapeHtml(JSON.stringify(mark))}'>🔖 ${escapeHtml(religion === "islam" ? `${SURAHS[mark.a - 1]} ${mark.a}:${mark.b}` : `${BIBLE_BOOKS[mark.a - 1]} ${mark.b},${mark.c}`)}</button>`).join("")}</section>`;
  }

  const chapterKey = () => (religion === "islam" ? String(position.surah) : `${position.book}:${position.chapter}`);

  function updateDone() {
    const done = (faith().readChapters[religion] || []).includes(chapterKey());
    const button = container.querySelector("#reader-done");
    button.textContent = done ? "✓ Gelesen" : "Als gelesen markieren";
    button.classList.toggle("is-done", done);
  }

  async function load() {
    const page = container.querySelector("#reader-page");
    const current = faith();
    stopAudio();
    saveFaith({ lastRead: { ...current.lastRead, [religion]: religion === "islam" ? { surah: position.surah } : { book: position.book, chapter: position.chapter } } });
    updateDone();
    page.style.setProperty("--faith-font", `${current.fontSize}px`);
    try {
      if (religion === "islam") {
        const result = await fetchScripture("quran", `/v1/surah/${position.surah}/editions/quran-uthmani,${current.quranEdition}`);
        if (!alive) return;
        const [arabic, translation] = result.data;
        page.innerHTML = `
          <header class="reader-title"><h2>${escapeHtml(SURAHS[position.surah - 1])}</h2><span dir="rtl" lang="ar">${escapeHtml(arabic.name)}</span>
            <small>${arabic.numberOfAyahs} Verse · ${arabic.revelationType === "Meccan" ? "mekkanisch" : "medinensisch"} · ${escapeHtml(translation.edition.name)}</small></header>
          ${arabic.ayahs.map((ayah, index) => `
            <p class="ayah" data-ayah="${ayah.numberInSurah}" tabindex="0">
              ${current.showArabic && current.quranEdition !== "en.transliteration" ? `<span class="ayah-arabic" dir="rtl" lang="ar">${escapeHtml(ayah.text)} <i>﴿${ayah.numberInSurah}﴾</i></span>` : ""}
              <span class="ayah-text"><b>${ayah.numberInSurah}</b> ${escapeHtml(translation.ayahs[index].text)}</span>
            </p>`).join("")}`;
      } else {
        const result = await fetchScripture("bible", `/v2/${current.bibleTranslation}/${position.book}/${position.chapter}.json`);
        if (!alive) return;
        page.innerHTML = `
          <header class="reader-title"><h2>${escapeHtml(BIBLE_BOOKS[position.book - 1])} ${position.chapter}</h2><small>${escapeHtml(result.translation)}</small></header>
          ${result.verses.map((verse) => `<p class="ayah bible-verse" data-ayah="${verse.verse}" tabindex="0"><span class="ayah-text"><b>${verse.verse}</b> ${escapeHtml(verse.text.trim())}</span></p>`).join("")}`;
      }
      const focus = position.ayah || position.verse;
      if (focus) {
        const node = page.querySelector(`[data-ayah="${focus}"]`);
        node?.classList.add("is-focus");
        if (node) page.scrollTop = node.offsetTop - page.clientHeight / 3; // scroll only the text, not the whole page
        delete position.ayah;
        delete position.verse;
      } else page.scrollTop = 0;
    } catch (error) {
      if (!alive) return;
      page.innerHTML = `<div class="empty-state"><div class="empty-icon">☁︎</div><h3>Text gerade nicht erreichbar</h3><p class="muted">${escapeHtml(error.message)}</p><button class="button button-primary" id="reader-retry" type="button">Erneut versuchen</button></div>`;
      page.querySelector("#reader-retry").addEventListener("click", load);
    }
  }

  function go(delta) {
    if (religion === "islam") position.surah = Math.min(114, Math.max(1, Number(position.surah) + delta));
    else {
      let book = Number(position.book);
      let chapter = Number(position.chapter) + delta;
      if (chapter < 1 && book > 1) { book -= 1; chapter = BIBLE_CHAPTERS[book - 1]; }
      if (chapter > BIBLE_CHAPTERS[book - 1] && book < 66) { book += 1; chapter = 1; }
      position = { book, chapter: Math.max(1, Math.min(BIBLE_CHAPTERS[book - 1], chapter)) };
    }
    shell();
  }

  async function play() {
    if (audio) return stopAudio();
    const button = container.querySelector("#reader-play");
    button.classList.add("is-playing");
    button.textContent = "■ Stopp";
    try {
      const result = await fetchScripture("quran", `/v1/surah/${position.surah}/${faith().reciter}`);
      const ayahs = result.data.ayahs;
      let index = 0;
      const next = () => {
        if (!alive || index >= ayahs.length) return stopAudio();
        container.querySelectorAll(".ayah.is-playing").forEach((node) => node.classList.remove("is-playing"));
        const node = container.querySelector(`[data-ayah="${ayahs[index].numberInSurah}"]`);
        node?.classList.add("is-playing");
        if (node) container.querySelector("#reader-page").scrollTo({ top: node.offsetTop - 120, behavior: "smooth" });
        audio = new Audio(ayahs[index].audio);
        audio.addEventListener("ended", () => { index += 1; next(); });
        audio.addEventListener("error", () => { stopAudio(); showToast("Die Rezitation konnte nicht abgespielt werden.", true); });
        audio.play().catch(() => stopAudio());
      };
      next();
    } catch (error) {
      stopAudio();
      button.textContent = "▶ Anhören";
      showToast(error.message, true);
    }
    return undefined;
  }

  function bind() {
    container.querySelectorAll("[data-religion]").forEach((button) => button.addEventListener("click", () => {
      religion = button.dataset.religion;
      position = { ...last() };
      shell();
    }));
    container.querySelector("#reader-surah")?.addEventListener("change", (event) => { position = { surah: Number(event.target.value) }; shell(); });
    container.querySelector("#reader-book")?.addEventListener("change", (event) => { position = { book: Number(event.target.value), chapter: 1 }; shell(); });
    container.querySelector("#reader-chapter")?.addEventListener("change", (event) => { position.chapter = Number(event.target.value); load(); });
    container.querySelector("#reader-edition")?.addEventListener("change", (event) => { saveFaith({ quranEdition: event.target.value }); load(); });
    container.querySelector("#reader-translation")?.addEventListener("change", (event) => { saveFaith({ bibleTranslation: event.target.value }); load(); });
    container.querySelector("#reader-reciter")?.addEventListener("change", (event) => { stopAudio(); saveFaith({ reciter: event.target.value }); });
    container.querySelector("#reader-arabic")?.addEventListener("change", (event) => { saveFaith({ showArabic: event.target.checked }); load(); });
    container.querySelector("#reader-play")?.addEventListener("click", play);
    container.querySelectorAll("[data-font]").forEach((button) => button.addEventListener("click", () => {
      const size = Math.max(14, Math.min(34, faith().fontSize + Number(button.dataset.font) * 2));
      saveFaith({ fontSize: size });
      container.querySelector("#reader-page").style.setProperty("--faith-font", `${size}px`);
    }));
    container.querySelector("#reader-prev").addEventListener("click", () => go(-1));
    container.querySelector("#reader-next").addEventListener("click", () => go(1));
    container.querySelector("#reader-done").addEventListener("click", () => {
      const list = faith().readChapters[religion] || [];
      const key = chapterKey();
      const done = !list.includes(key);
      saveFaith({ readChapters: { ...faith().readChapters, [religion]: done ? [...list, key] : list.filter((item) => item !== key) } });
      updateDone();
      if (done) showToast(religion === "islam" ? "Mā schāʾa llāh – Sure gelesen. 📖" : "Kapitel gelesen. Gott segne dein Lesen. 📖");
    });
    container.querySelector("#reader-page").addEventListener("click", (event) => {
      const node = event.target.closest("[data-ayah]");
      if (!node) return;
      const number = Number(node.dataset.ayah);
      const mark = religion === "islam" ? { religion, a: Number(position.surah), b: number } : { religion, a: Number(position.book), b: Number(position.chapter), c: number };
      const marks = faith().bookmarks;
      const exists = marks.findIndex((item) => JSON.stringify({ ...item, at: undefined }) === JSON.stringify({ ...mark, at: undefined }));
      if (exists >= 0) {
        saveFaith({ bookmarks: marks.filter((_, index) => index !== exists) });
        node.classList.remove("is-marked");
        showToast("Lesezeichen entfernt.");
      } else {
        saveFaith({ bookmarks: [...marks, { ...mark, at: Date.now() }].slice(-100) });
        node.classList.add("is-marked");
        showToast("Lesezeichen gesetzt. 🔖");
      }
    });
    container.querySelectorAll("[data-mark]").forEach((button) => button.addEventListener("click", () => {
      const mark = JSON.parse(button.dataset.mark);
      position = religion === "islam" ? { surah: mark.a, ayah: mark.b } : { book: mark.a, chapter: mark.b, verse: mark.c };
      shell();
    }));
  }

  shell();
  return () => {
    alive = false;
    stopAudio();
  };
}

export const ayahCount = (surah) => SURAH_AYAHS[surah - 1];
