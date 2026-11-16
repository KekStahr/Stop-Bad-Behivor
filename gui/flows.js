import { escapeHtml } from "./api.js";
import { prefs, setPref } from "./prefs.js";
import { openSheet, motionAllowed } from "./ui.js";
import { ADDICTIONS, TRIGGER_CATALOG, ALL_CATALOG_WORDS, catalogWords, MILESTONES } from "./recovery.js";

const ADDICTION_TO_CATALOG = {
  alcohol: ["alcohol"], nicotine: ["nicotine"], drugs: ["drugs", "meds"], gambling: ["gambling"],
  gaming: ["gaming"], porn: ["porn"], social: ["social"], food: ["food"], shopping: ["shopping"], general: [],
};

// Saves the trigger list: personal words the user typed plus every enabled catalog category.
export async function saveTriggerCategories(api, ids, currentWords) {
  const custom = currentWords.filter((word) => !ALL_CATALOG_WORDS.has(word));
  const words = [...new Set([...custom, ...catalogWords(ids)])];
  if (!words.length) throw new Error("Mindestens ein Schutz-Begriff muss aktiv bleiben – lass eine Kategorie an oder trag eigene Begriffe ein.");
  await api("/api/settings", { method: "POST", body: { triggerWords: words } });
  setPref("triggerCategories", ids.join(","));
}

// Words that used to be in the catalog but matched normal words ("bwin" in "abwinken", "snus" in "Kokosnuss").
const RETIRED_WORDS = new Set(["bwin", "snus"]);

// Adds new catalog words to existing users' lists, so updates of the catalog reach everyone.
export async function syncTriggerCatalog(api) {
  const ids = enabledCategories();
  if (!ids.length) return;
  const { triggerWords = [] } = await api("/api/settings");
  const kept = triggerWords.filter((word) => !RETIRED_WORDS.has(word));
  const words = [...new Set([...kept, ...catalogWords(ids)])];
  if (words.length !== triggerWords.length || words.some((word, index) => word !== triggerWords[index])) {
    await api("/api/settings", { method: "POST", body: { triggerWords: words } });
  }
}

export const enabledCategories = () => prefs.triggerCategories.split(",").filter((id) => TRIGGER_CATALOG.some((item) => item.id === id));

// ---- Confetti ---------------------------------------------------------------
export function confetti() {
  if (!motionAllowed() || !prefs.celebrations) return;
  const canvas = document.createElement("canvas");
  canvas.className = "confetti";
  document.body.append(canvas);
  const context = canvas.getContext("2d");
  canvas.width = innerWidth * devicePixelRatio;
  canvas.height = innerHeight * devicePixelRatio;
  context.scale(devicePixelRatio, devicePixelRatio);
  const colors = ["#0A84FF", "#30D158", "#FF9F0A", "#FF375F", "#BF5AF2", "#40C8E0", "#FFD60A"];
  const pieces = Array.from({ length: 150 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 200,
    y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 16,
    vy: -Math.random() * 14 - 4,
    size: Math.random() * 7 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    spin: Math.random() * Math.PI,
  }));
  const start = performance.now();
  const frame = (now) => {
    const elapsed = now - start;
    context.clearRect(0, 0, innerWidth, innerHeight);
    for (const piece of pieces) {
      piece.vy += 0.35;
      piece.vx *= 0.99;
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.spin += 0.15;
      context.save();
      context.globalAlpha = Math.max(0, 1 - elapsed / 2600);
      context.translate(piece.x, piece.y);
      context.rotate(piece.spin);
      context.fillStyle = piece.color;
      context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
      context.restore();
    }
    if (elapsed < 2600) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

// ---- Daily check-in ----------------------------------------------------------
const MOODS = ["😣", "😕", "😐", "🙂", "😄"];
const MOOD_LABELS = ["Sehr schwer", "Schwer", "Okay", "Gut", "Sehr gut"];

export function openCheckin({ api, showToast, onSaved, existing }) {
  let mood = existing?.mood || 0;
  let craving = existing?.craving ?? -1;
  const { dialog, close } = openSheet({
    title: "Wie geht es dir heute?",
    body: `
      <p class="sheet-text">Ein ehrlicher Moment mit dir selbst. Dauert 20 Sekunden.</p>
      <div class="checkin-block">
        <span class="eyebrow">Stimmung</span>
        <div class="mood-row">${MOODS.map((emoji, index) => `
          <button type="button" class="mood ${mood === index + 1 ? "is-selected" : ""}" data-mood="${index + 1}" aria-label="${MOOD_LABELS[index]}">
            <span>${emoji}</span><small>${MOOD_LABELS[index]}</small>
          </button>`).join("")}</div>
      </div>
      <div class="checkin-block">
        <span class="eyebrow">Wie stark ist das Verlangen?</span>
        <div class="craving-row">${[0, 1, 2, 3, 4, 5].map((value) => `
          <button type="button" class="craving ${craving === value ? "is-selected" : ""}" data-craving="${value}" style="--level:${value / 5}">${value}</button>`).join("")}</div>
        <div class="craving-scale"><small>gar nicht</small><small>sehr stark</small></div>
      </div>
      <label class="pledge">
        <input type="checkbox" id="pledge" ${existing?.pledge ?? true ? "checked" : ""}>
        <span class="pledge-box">✓</span>
        <span><strong>Heute bleibe ich frei.</strong><small>Mein Versprechen an mich – nur für heute.</small></span>
      </label>
      <label class="field">Wofür bist du heute dankbar?
        <input type="text" id="gratitude" maxlength="300" placeholder="z. B. ein gutes Gespräch, die Sonne, ich selbst" value="${escapeHtml(existing?.gratitude || "")}">
      </label>
      <label class="field">Notiz (optional)
        <textarea id="note" rows="2" maxlength="500" placeholder="Was beschäftigt dich?">${escapeHtml(existing?.note || "")}</textarea>
      </label>
      <div class="sheet-actions">
        <button class="button button-primary" id="save-checkin" type="button" ${mood && craving >= 0 ? "" : "disabled"}>Check-in speichern</button>
      </div>`,
  });
  const save = dialog.querySelector("#save-checkin");
  const refreshState = () => { save.disabled = !(mood && craving >= 0); };
  dialog.querySelectorAll("[data-mood]").forEach((button) => button.addEventListener("click", () => {
    mood = Number(button.dataset.mood);
    dialog.querySelectorAll("[data-mood]").forEach((item) => item.classList.toggle("is-selected", item === button));
    refreshState();
  }));
  dialog.querySelectorAll("[data-craving]").forEach((button) => button.addEventListener("click", () => {
    craving = Number(button.dataset.craving);
    dialog.querySelectorAll("[data-craving]").forEach((item) => item.classList.toggle("is-selected", item === button));
    refreshState();
  }));
  save.addEventListener("click", async () => {
    save.disabled = true;
    const pledge = dialog.querySelector("#pledge").checked;
    try {
      const { checkin } = await api("/api/checkin", {
        method: "POST",
        body: { mood, craving, pledge, gratitude: dialog.querySelector("#gratitude").value, note: dialog.querySelector("#note").value },
      });
      close();
      if (pledge) confetti();
      showToast(craving >= 4 ? "Danke für deine Ehrlichkeit. Das Hilfe-Fenster ist jederzeit für dich da." : "Check-in gespeichert. Schön, dass du auf dich achtest.");
      if (craving >= 4) setTimeout(() => window.dispatchEvent(new Event("reso:sos")), 600);
      onSaved?.(checkin);
    } catch (error) {
      save.disabled = false;
      showToast(error.message, true);
    }
  });
}

// ---- Relapse reflection -----------------------------------------------------------
export function openReflection({ api, showToast }) {
  return new Promise((resolve) => {
    let done = false;
    const { dialog, close } = openSheet({
      title: "Ein Moment für dich",
      onClose: () => { if (!done) resolve(false); },
      body: `
        <p class="sheet-text">Rückfälle passieren. Wer versteht warum, ist beim nächsten Mal besser vorbereitet. Beide Felder sind freiwillig.</p>
        <label class="field">Was war der Auslöser?
          <textarea id="cause" rows="2" maxlength="500" placeholder="z. B. Stress auf der Arbeit, Langeweile, ein Streit"></textarea>
        </label>
        <label class="field">Was machst du nächstes Mal anders?
          <textarea id="next" rows="2" maxlength="500" placeholder="z. B. jemanden anrufen, rausgehen, die Atemübung"></textarea>
        </label>
        <div class="sheet-actions">
          <button class="button button-secondary" data-skip type="button">Überspringen</button>
          <button class="button button-primary" data-save type="button">Speichern & neu beginnen</button>
        </div>`,
    });
    dialog.querySelector("[data-skip]").addEventListener("click", () => { done = true; resolve(true); close(); });
    dialog.querySelector("[data-save]").addEventListener("click", async () => {
      const cause = dialog.querySelector("#cause").value.trim();
      const next = dialog.querySelector("#next").value.trim();
      if (cause && next) {
        try {
          await api("/api/reflection", { method: "POST", body: { trigger: cause, nextAction: next } });
        } catch (error) {
          showToast(error.message, true);
          return;
        }
      }
      if (next) setPref("ifThenPlan", `${prefs.ifThenPlan.trim()}\nWenn ${cause || "es wieder schwer wird"}, dann ${next}.`.trim().slice(0, 600));
      done = true;
      resolve(true);
      close();
    });
  });
}

// ---- Milestone celebration ----------------------------------------------------
export function celebrateMilestone(milestone, { api, showToast }) {
  confetti();
  const channel = (ADDICTIONS[prefs.addiction] || ADDICTIONS.general).channel;
  const { dialog, close } = openSheet({
    title: "Meilenstein erreicht!",
    body: `
      <div class="celebration">
        <span class="celebration-icon">${milestone.icon}</span>
        <h2>${escapeHtml(milestone.label)} frei</h2>
        <p class="sheet-text">Das hast du dir erarbeitet, Tag für Tag. Sei stolz auf dich.</p>
        <div class="sheet-actions centered">
          <button class="button button-secondary" data-close type="button">Danke</button>
          <button class="button button-primary" id="share-milestone" type="button">Mit der Community teilen</button>
        </div>
      </div>`,
  });
  dialog.querySelector("#share-milestone").addEventListener("click", async () => {
    try {
      await api("/api/community/social/messages", {
        method: "POST",
        body: { room: `c:${channel}`, text: `${milestone.icon} Ich bin heute ${milestone.label} frei! Danke, dass ihr da seid.` },
      });
      showToast("Geteilt. Die Community freut sich mit dir!");
      close();
    } catch (error) {
      showToast(error.message, true);
    }
  });
}

export function pendingMilestone(soberDays) {
  const reached = MILESTONES.filter((milestone) => soberDays >= milestone.days).at(-1);
  if (!reached || reached.days <= (Number(prefs.celebratedMilestone) || 0)) return null;
  return reached;
}

// ---- Onboarding -----------------------------------------------------------------
export function openOnboarding({ api, showToast, onDone }) {
  const state = { name: "", addiction: prefs.addiction, start: "now", startDate: "", expense: "", hours: prefs.dailyHours, why: prefs.why, protect: true };
  let step = 0;
  const steps = [
    () => `
      <div class="onboard-hero"><img class="brand-logo big" src="assets/logo.svg" alt="Life">
        <h2>Willkommen bei Life</h2>
        <p class="sheet-text">Schön, dass du da bist. Der erste Schritt ist der schwerste – und den machst du gerade. Fünf kurze Fragen, dann geht's los.</p></div>`,
    () => `
      <h3>Wie dürfen wir dich nennen?</h3>
      <input type="text" id="ob-name" maxlength="32" placeholder="Dein Vorname oder ein Spitzname" value="${escapeHtml(state.name)}">
      <h3 class="spaced">Wovon möchtest du frei werden?</h3>
      <div class="choice-grid">${Object.entries(ADDICTIONS).map(([id, item]) => `
        <button type="button" class="choice ${state.addiction === id ? "is-selected" : ""}" data-addiction="${id}"><span>${item.emoji}</span>${escapeHtml(item.label)}</button>`).join("")}</div>`,
    () => `
      <h3>Seit wann bist du frei?</h3>
      <div class="choice-grid two">
        <button type="button" class="choice ${state.start === "now" ? "is-selected" : ""}" data-start="now"><span>🌅</span>Ich starte jetzt</button>
        <button type="button" class="choice ${state.start === "past" ? "is-selected" : ""}" data-start="past"><span>📅</span>Schon länger</button>
      </div>
      <input type="datetime-local" id="ob-date" ${state.start === "past" ? "" : "hidden"} value="${state.startDate}" max="${new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}">`,
    () => `
      <h3>Was hat dich deine Sucht gekostet?</h3>
      <p class="sheet-text">Nur grob geschätzt – damit wir dir zeigen können, was du zurückgewinnst.</p>
      <label class="field">Geld pro Tag (${escapeHtml(prefs.currency)})<input type="number" id="ob-expense" min="0" step="0.5" value="${state.expense}" placeholder="z. B. 12"></label>
      <label class="field">Zeit pro Tag (Stunden)<input type="number" id="ob-hours" min="0" max="24" step="0.5" value="${state.hours}"></label>
      <label class="pledge">
        <input type="checkbox" id="ob-protect" ${state.protect ? "checked" : ""}>
        <span class="pledge-box">✓</span>
        <span><strong>Schutz aktivieren</strong><small>Life erkennt typische Begriffe zu deiner Sucht und hilft dir genau in dem Moment.</small></span>
      </label>`,
    () => `
      <h3>Dein Warum</h3>
      <p class="sheet-text">Für wen oder wofür tust du das? Dieser Satz begleitet dich ab jetzt – auch in den schweren Momenten.</p>
      <textarea id="ob-why" rows="4" maxlength="500" placeholder="Für meine Kinder. Für meine Gesundheit. Für mich.">${escapeHtml(state.why)}</textarea>`,
  ];

  const { dialog, close } = openSheet({
    title: "Los geht's",
    wide: true,
    onClose: () => setPref("onboarded", true),
    body: `<div class="onboard"><div class="step-dots">${steps.map(() => "<i></i>").join("")}</div><div class="onboard-step" id="ob-step"></div>
      <div class="sheet-actions"><button class="button button-plain" id="ob-back" type="button">Zurück</button><button class="button button-primary" id="ob-next" type="button">Weiter</button></div></div>`,
  });
  const container = dialog.querySelector("#ob-step");
  const back = dialog.querySelector("#ob-back");
  const next = dialog.querySelector("#ob-next");

  const collect = () => {
    const value = (selector) => dialog.querySelector(selector)?.value;
    if (step === 1) state.name = value("#ob-name")?.trim() || "";
    if (step === 2) state.startDate = value("#ob-date") || "";
    if (step === 3) {
      state.expense = value("#ob-expense") || "";
      state.hours = Number(value("#ob-hours")) || 0;
      state.protect = dialog.querySelector("#ob-protect").checked;
    }
    if (step === 4) state.why = value("#ob-why") || "";
  };
  const render = () => {
    container.innerHTML = steps[step]();
    container.classList.remove("is-entering");
    void container.offsetWidth;
    container.classList.add("is-entering");
    dialog.querySelectorAll(".step-dots i").forEach((dot, index) => dot.classList.toggle("is-active", index <= step));
    back.style.visibility = step ? "visible" : "hidden";
    next.textContent = step === steps.length - 1 ? "Fertig" : step ? "Weiter" : "Los geht's";
    container.querySelectorAll("[data-addiction]").forEach((button) => button.addEventListener("click", () => {
      state.addiction = button.dataset.addiction;
      container.querySelectorAll("[data-addiction]").forEach((item) => item.classList.toggle("is-selected", item === button));
    }));
    container.querySelectorAll("[data-start]").forEach((button) => button.addEventListener("click", () => {
      state.start = button.dataset.start;
      container.querySelectorAll("[data-start]").forEach((item) => item.classList.toggle("is-selected", item === button));
      container.querySelector("#ob-date").hidden = state.start !== "past";
    }));
    container.querySelector("input, textarea")?.focus();
  };

  back.addEventListener("click", () => { collect(); step -= 1; render(); });
  next.addEventListener("click", async () => {
    collect();
    if (step < steps.length - 1) {
      step += 1;
      render();
      return;
    }
    next.disabled = true;
    try {
      const body = {};
      if (state.name) body.communityName = state.name;
      if (state.expense !== "") body.dailyExpense = Number(state.expense);
      if (state.start === "past" && state.startDate) body.streakStart = state.startDate;
      if (Object.keys(body).length) await api("/api/settings", { method: "POST", body });
      if (state.start === "now") await api("/api/streak/reset", { method: "POST", body: {} });
      if (state.protect && ADDICTION_TO_CATALOG[state.addiction]?.length) {
        const settings = await api("/api/settings");
        await saveTriggerCategories(api, ADDICTION_TO_CATALOG[state.addiction], settings.triggerWords || []);
      }
      setPref("addiction", state.addiction);
      setPref("dailyHours", state.hours);
      setPref("why", state.why.trim());
      setPref("defaultChannel", "auto");
      close();
      confetti();
      showToast("Alles bereit. Dein neuer Weg beginnt jetzt. 💚");
      onDone?.();
    } catch (error) {
      next.disabled = false;
      showToast(error.message, true);
    }
  });
  render();
}
