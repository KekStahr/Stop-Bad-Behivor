import { escapeHtml } from "../api.js";
import { faith, loadFaith, activeReligions, prayerConfig } from "../faith/state.js";
import { verseOfDay } from "../faith/data.js";
import { nextPrayer, formatClock } from "../faith/calc.js";
import { loadVerse } from "../faith/ui.js";
import { prefs, setPref } from "../prefs.js";
import { ring, setRing, confirmSheet, openSheet, formatNumber, animateCounts } from "../ui.js";
import { ADDICTIONS, MILESTONES, MAJOR_MILESTONES, benefitTimeline, nextMilestone, soberSeconds, splitDuration, humanDuration } from "../recovery.js";
import { buildRiskModel, upcomingRisk, hourProfile, riskClock, riskLabel, topWindows, assessNow } from "../insights.js";
import { openCheckin, openReflection, celebrateMilestone, pendingMilestone, confetti } from "../flows.js";
import { computeXp, levelFor, dailyQuests, checkinStreak, dayKey } from "../progress.js";
import { showWarning } from "../companion.js";
import { calendarEvents } from "../account.js";
import { mountBoard } from "../widgets.js";
import { donationDue, donationCard, bindDonation } from "../donate.js";
import { openRunner } from "../calm.js";
import { editWhy } from "../sidebar.js";

const DAY = 86400;

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Gute Nacht";
  if (hour < 11) return "Guten Morgen";
  if (hour < 18) return "Hallo";
  return "Guten Abend";
}

const plural = (value, singular, pluralLabel) => `${value} ${value === 1 ? singular : pluralLabel}`;
const shortDate = (date) => new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short", year: "numeric" }).format(date);

export function openAchievements(soberDays) {
  const reached = MILESTONES.filter((milestone) => soberDays >= milestone.days);
  const upcoming = MILESTONES.filter((milestone) => soberDays < milestone.days).slice(0, 8);
  openSheet({
    title: "Deine Meilensteine",
    wide: true,
    body: `
      <div class="achievement-summary">
        <div>${ring({ size: 88, stroke: 9, progress: reached.length / MILESTONES.length, color: "var(--orange)" })}<b>${reached.length}</b></div>
        <p class="sheet-text">Du hast <strong>${reached.length} von ${MILESTONES.length}</strong> Meilensteinen erreicht. Am Anfang gibt es fast jeden Tag einen – weil jeder einzelne Tag zählt.</p>
      </div>
      ${reached.length ? `<span class="eyebrow">Schon geschafft</span>
      <div class="milestone-row achievement-done">${reached.slice().reverse().map((milestone) => `
        <div class="chip-badge is-done ${milestone.major ? "is-major" : ""}"><span>${milestone.icon}</span><strong>${milestone.label}</strong><small>Erreicht</small></div>`).join("")}</div>` : ""}
      <span class="eyebrow">Als Nächstes</span>
      <div class="milestone-row">${upcoming.map((milestone) => `
        <div class="chip-badge ${milestone.major ? "is-major" : ""}"><span>${milestone.icon}</span><strong>${milestone.label}</strong>
          <small>${shortDate(new Date(Date.now() + (milestone.days - soberDays) * DAY * 1000))}</small></div>`).join("")}</div>
      <span class="eyebrow">Große Etappen</span>
      <div class="achievement-grid">
        ${MAJOR_MILESTONES.map((milestone, index) => {
          const done = soberDays >= milestone.days;
          const progress = Math.min(1, soberDays / milestone.days);
          return `
            <article class="achievement ${done ? "is-unlocked" : ""}" style="--n:${index}">
              <span class="achievement-icon">${milestone.icon}</span>
              <strong>${milestone.label}</strong>
              <small>${done ? "Erreicht" : `${Math.round(progress * 100)} %`}</small>
              <div class="progress"><span style="--w:${progress * 100}%"></span></div>
            </article>`;
        }).join("")}
      </div>`,
  });
}

export async function render(root, { api, showToast, refresh, goTo }) {
  const [data, analytics] = await Promise.all([api("/api/dashboard"), api("/api/analytics")]);
  const name = (data.name || "").trim();
  const addiction = ADDICTIONS[prefs.addiction] || ADDICTIONS.general;
  const hasStart = Boolean(data.streakStart);
  const dailyExpense = Number(data.dailyExpense) || 0;
  const dailyHours = Number(prefs.dailyHours) || 0;
  const goal = data.savingsGoal;

  document.querySelector("#sidebar-name").textContent = name || "Dein Weg";
  document.querySelector("#sidebar-avatar").textContent = (name || "R")[0].toUpperCase();

  const seconds = soberSeconds(data.streakStart);
  const soberDays = seconds / DAY;
  const moneySaved = soberDays * dailyExpense;
  const timeSaved = soberDays * dailyHours + (Number(data.savedHours) || 0);
  const reached = MILESTONES.filter((milestone) => soberDays >= milestone.days).length;
  const dateLabel = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const checkin = data.todayCheckin;
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return { label: new Intl.DateTimeFormat("de-DE", { weekday: "narrow" }).format(date), entry: analytics.checkins?.[dayKey(date)] };
  });
  const model = buildRiskModel(analytics);
  const profile = hourProfile(model);
  const nowHour = new Date().getHours();
  const nextRisk = upcomingRisk(model, 24, 0.5);
  const assessment = assessNow(analytics);
  const nowLabel = assessment.score > profile[nowHour] ? assessment.label : riskLabel(profile[nowHour]);
  const usage = analytics.usage || {};
  const pcLabel = (minutes) => (minutes >= 60 ? `${Math.floor(minutes / 60)} Std. ${minutes % 60} Min.` : `${minutes} Min.`);
  const soon = nextRisk && nextRisk.offset <= 3;
  const riskHour = nextRisk?.at.getHours();
  // Personal proof: waves already beaten around that time of day.
  const wavesAtThatTime = nextRisk ? (analytics.waves || []).filter((wave) => wave.status === "survived"
    && Math.abs(new Date(wave.start).getHours() - riskHour) <= 1).length : 0;
  const whenLabel = nextRisk
    ? `${nextRisk.at.toDateString() === new Date().toDateString() ? "heute" : "morgen"} ${riskHour}–${(riskHour + 1) % 24} Uhr`
    : "";
  const xp = computeXp(analytics);
  const level = levelFor(xp.total);
  const quests = dailyQuests(analytics);
  const questsDone = quests.filter((quest) => quest.done).length;
  const streak = checkinStreak(analytics.checkins);
  const benefit = benefitTimeline(prefs.addiction).find((item) => item.days > soberDays);
  const yearDays = soberDays + 365;
  const readyCapsule = (analytics.capsules || []).find((capsule) => capsule.ready && !capsule.opened);

  root.innerHTML = `
    <header class="page-header reveal">
      <div>
        <span class="eyebrow">${escapeHtml(dateLabel)}</span>
        <h1>${prefs.greeting ? `${greeting()}${name ? `, ${escapeHtml(name)}` : ""}` : "Übersicht"}</h1>
        <p class="subtitle">${escapeHtml(addiction.emoji)} Level ${level.level} · ${escapeHtml(level.title)}</p>
      </div>
      <div class="header-actions">
        <button class="pill-button subtle" id="open-palette" type="button" title="Befehle suchen">⌕ Suchen <kbd>Strg K</kbd></button>
        <button class="pill-button" id="open-achievements" type="button"><span aria-hidden="true">🏆</span> ${reached} / ${MILESTONES.length}</button>
      </div>
    </header>

    <section class="card quit-card reveal" id="quit-card" hidden>
      <span class="quit-card-icon">⏳</span>
      <div><strong>Life beendet sich in <b id="quit-left">30:00</b></strong><small>Bis dahin schütze ich dich weiter. Du kannst es dir jederzeit anders überlegen.</small></div>
      <button class="button button-primary small" id="quit-cancel" type="button">Abbrechen – ich bleibe</button>
    </section>

    <section class="card faith-home reveal" id="faith-home" hidden></section>

    ${readyCapsule ? `
      <button class="capsule-banner reveal" id="open-capsule" type="button">
        <span class="capsule-icon">💌</span>
        <span><strong>Ein Brief von dir wartet auf dich</strong><small>Geschrieben am ${new Date(readyCapsule.created).toLocaleDateString("de-DE")} – heute darfst du ihn öffnen.</small></span>
        <span class="risk-cta">Öffnen →</span>
      </button>` : ""}


    <section class="card hero reveal">
      ${hasStart ? `
        <div class="hero-visual">
          ${prefs.counterStyle === "list" ? `<div class="unit-list" id="unit-list"></div>` : `
            <div class="rings" aria-hidden="true">
              ${ring({ size: 248, stroke: 18, progress: 0, color: "var(--accent)", className: "ring-outer" })}
              ${ring({ size: 196, stroke: 18, progress: 0, color: "var(--teal)", className: "ring-middle" })}
              ${ring({ size: 144, stroke: 18, progress: 0, color: "var(--green)", className: "ring-inner" })}
              <div class="rings-center"><strong id="days-value">0</strong><span id="days-label">Tage</span></div>
            </div>`}
        </div>
        <div class="hero-copy">
          <span class="eyebrow">Frei seit</span>
          <h2 class="hero-time" id="hero-time" role="timer" aria-live="off"></h2>
          <p class="hero-milestone" id="hero-milestone"></p>
          <div class="progress"><span id="milestone-bar"></span></div>
          ${prefs.counterStyle !== "list" ? `
            <div class="ring-legend">
              <span><i style="background:var(--accent)"></i>Nächster Meilenstein</span>
              <span><i style="background:var(--teal)"></i>Stunden heute</span>
              <span><i style="background:var(--green)"></i>Minuten</span>
            </div>` : ""}
          <div class="hero-actions">
            <button class="button button-primary" data-go="timer" type="button">${data.timer.running ? "Fokus läuft" : "Fokus starten"}</button>
            <button class="button button-tinted" id="craving" type="button">Ich habe Verlangen</button>
            <button class="button button-plain" id="reset-streak" type="button">Neu beginnen</button>
          </div>
        </div>` : `
        <div class="hero-empty">
          <div class="hero-empty-icon">${escapeHtml(addiction.emoji)}</div>
          <h2>Dein neuer Weg beginnt jetzt.</h2>
          <p class="muted">Starte deinen Zähler – oder trag in den Einstellungen ein, seit wann du schon frei bist.</p>
          <div class="hero-actions">
            <button class="button button-primary" id="start-streak" type="button">Jetzt starten</button>
            <button class="button button-secondary" data-go="settings" type="button">Startdatum festlegen</button>
          </div>
        </div>`}
    </section>

    ${prefs.aiWarnings ? `
      <section class="card ai-home ai-v2 reveal ${soon ? "is-soon" : ""}" style="--tone:${soon ? nextRisk.label.color : nowLabel.color}">
        <div class="ai-home-clock">${riskClock(profile, nowHour)}</div>
        <div class="ai-main">
          <header class="ai-head">
            <span class="ai-badge">✦ Frühwarnsystem</span>
            <span class="ai-status"><i></i>${escapeHtml(soon ? nextRisk.label.text : nowLabel.text)}</span>
          </header>
          ${model.ready ? `
            <h3>${soon ? (nextRisk.offset === 0 ? "Jetzt wird es oft schwer für dich" : `In ${nextRisk.offset} ${nextRisk.offset === 1 ? "Stunde" : "Stunden"} wird es oft schwer`)
              : nowLabel.key !== "low" ? "Gerade ist eine schwierige Zeit für dich" : "Alles ruhig – genieß den Moment 🌿"}</h3>
            <p class="ai-lead">${nextRisk && !(soon && nextRisk.offset === 0) ? `Nächste schwierige Zeit: <strong>${whenLabel}</strong>` : nowLabel.key !== "low" ? "Bleib achtsam. Danach ist heute nichts Schwieriges mehr in Sicht." : "Heute ist keine schwierige Zeit in Sicht."}</p>
            ${wavesAtThatTime ? `<p class="ai-proof">💪 Um diese Uhrzeit hast du schon ${wavesAtThatTime} ${wavesAtThatTime === 1 ? "Welle" : "Wellen"} besiegt.</p>` : ""}`
          : `<h3>${assessment.reasons.length ? `Jetzt: ${nowLabel.text}` : "Life lernt dich gerade kennen"}</h3><p class="ai-lead">Sobald ein paar Momente erfasst sind, warnt Life dich vor schwierigen Zeiten – bevor sie kommen.</p>`}
          <div class="ai-blocks">
            ${assessment.reasons.length ? `<div class="ai-block"><small>Warum gerade jetzt</small><ul>${assessment.reasons.map((reason) => `<li><span>${reason.icon}</span>${escapeHtml(reason.text)}</li>`).join("")}</ul></div>` : ""}
            ${model.ready && topWindows(model, 3).length ? `<div class="ai-block"><small>Deine schwierigsten Zeiten</small><div class="ai-windows">${topWindows(model, 3).map((window) => `<span style="--tone:${riskLabel(window.level).color}"><i></i>${escapeHtml(window.label)}</span>`).join("")}</div></div>` : ""}
          </div>
          ${usage.sessionMinutes ? `
            <div class="ai-stats">
              <div><span>💻</span><b>${pcLabel(usage.sessionMinutes)}</b><small>am Stück am PC</small></div>
              <div><span>📅</span><b>${pcLabel(usage.todayMinutes || 0)}</b><small>heute insgesamt</small></div>
              <div class="${assessment.breakIn ? "" : "is-due"}"><span>☕</span><b>${assessment.breakIn ? pcLabel(assessment.breakIn) : "Jetzt"}</b><small>${assessment.breakIn ? "bis zur Pause" : "Zeit für eine Pause"}</small></div>
            </div>` : ""}
          <p class="ai-tip" id="ai-tip" hidden></p>
        </div>
        ${model.ready ? `<button class="button ${soon ? "button-primary" : "button-secondary"} small ai-home-cta" id="risk-plan" type="button">${soon ? "Jetzt vorsorgen" : "Mein Plan"}</button>` : ""}
      </section>` : ""}

    ${donationDue() ? donationCard() : ""}
    <div class="widget-host reveal" id="widget-host"></div>

`;

  root.querySelectorAll("[data-go]").forEach((element) => element.addEventListener("click", () => goTo(element.dataset.go)));
  root.querySelector("#craving")?.addEventListener("click", () => window.dispatchEvent(new Event("reso:sos")));
  root.querySelector("#open-palette").addEventListener("click", () => window.dispatchEvent(new Event("reso:palette")));
  // a fresh tip from the server (cached for 30 minutes), filled in without blocking the page
  api("/api/insights").then(({ tips = [], community = {} }) => {
    const tip = root.querySelector("#ai-tip");
    if (!tip || !tips.length) return;
    tip.innerHTML = `<span>💡</span><span>${escapeHtml(tips[new Date().getHours() % tips.length])}${community.crisis_chats_now ? ` Gerade unterstützen sich ${community.crisis_chats_now} Menschen im Krisen-Chat.` : ""}</span>`;
    tip.hidden = false;
  }).catch(() => {});
  root.querySelector("#risk-plan")?.addEventListener("click", () => {
    if (soon) {
      showWarning({ start: nextRisk.at, label: nextRisk.label }, goTo);
      return;
    }
    openSheet({
      title: "Dein Plan für schwierige Momente",
      body: `<div class="plan-list">${prefs.ifThenPlan.split("\n").filter((line) => line.trim()).map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</div>
        <p class="muted small">Du kannst deinen Plan in den Einstellungen unter „Notfall & Hilfe“ anpassen.</p>`,
    });
  });
  root.querySelector("#open-capsule")?.addEventListener("click", async () => {
    await api("/api/capsules", { method: "POST", body: { action: "open", id: readyCapsule.id } });
    confetti();
    openSheet({
      title: "Ein Brief von dir",
      wide: true,
      onClose: () => refresh(),
      body: `<div class="letter"><small>Geschrieben am ${new Date(readyCapsule.created).toLocaleDateString("de-DE")}</small><p>${escapeHtml(readyCapsule.text)}</p></div>`,
    });
  });
  bindDonation(root, showToast);
  // the widget board (house layout or the user's own) – it has its own clicks
  mountBoard(root.querySelector("#widget-host"), {
    data, analytics, moneySaved, timeSaved, checkin, streak, week, level, xp, quests, questsDone, benefit, hasStart,
    soberDays, dailyExpense, dailyHours, yearDays, goal, reached, usage, pcLabel, todayKey: dayKey(new Date()),
  }, {
    goTo,
    quest: (action) => (action === "checkin" ? openCheckin({ api, showToast, existing: checkin, onSaved: () => refresh() }) : goTo(action)),
    act: (action) => {
      if (action === "checkin") openCheckin({ api, showToast, existing: checkin, onSaved: () => refresh() });
      else if (action === "achievements") openAchievements(soberDays);
      else if (action === "game") openRunner();
      else if (action === "sos") window.dispatchEvent(new Event("reso:sos"));
      else if (action === "why") editWhy({ showToast });
    },
    afterDraw: (host) => animateCounts(host),
  });
  root.querySelector("#open-achievements").addEventListener("click", () => openAchievements(soberDays));

  // All four quests done: celebrate once per day.
  if (questsDone === quests.length) {
    const key = `reso:questsCelebrated:${dayKey(new Date())}`;
    try {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, "1");
        setTimeout(() => { confetti(); showToast("Alle Quests von heute geschafft! Du bist großartig. 🌟"); }, 700);
      }
    } catch {
      // storage unavailable
    }
  }

  const restart = async (message, relapse) => {
    try {
      await api("/api/streak/reset", { method: "POST", body: { relapse } });
      setPref("celebratedMilestone", 0);
      // Milestones belong to the current streak – move already planned calendar entries too.
      api("/api/account").then(async (status) => {
        if (!status.calendarEvents?.milestones) return;
        await api("/api/calendar/events", { method: "POST", body: { kind: "milestones", events: await calendarEvents(api, "milestones") } });
      }).catch(() => {});
      showToast(message);
      await refresh();
    } catch (error) {
      showToast(error.message, true);
    }
  };
  root.querySelector("#start-streak")?.addEventListener("click", () => restart("Dein Weg beginnt jetzt. Wir glauben an dich.", false));
  root.querySelector("#reset-streak")?.addEventListener("click", async () => {
    const ok = await confirmSheet({
      title: "Neu beginnen?",
      text: `Ein Rückfall löscht nicht, was du geschafft hast: <strong>${escapeHtml(humanDuration(seconds))}</strong> frei – das bleibt als Rekord. Meilensteine und Abzeichen gelten aber nur für die laufende Serie und beginnen neu.<br><br>Geht es dir gerade schlecht? Unter „Ich brauche Hilfe“ findest du sofort Unterstützung.`,
      confirmLabel: "Weiter",
      danger: true,
    });
    if (!ok) return;
    if (await openReflection({ api, showToast })) restart("Neuer Anfang. Hinfallen gehört dazu – du bist noch dabei.", true);
  });

  const milestone = hasStart && prefs.onboarded && !document.querySelector("dialog[open]") && pendingMilestone(soberDays);
  if (milestone) {
    setPref("celebratedMilestone", milestone.days);
    if (milestone.major) setTimeout(() => celebrateMilestone(milestone, { api, showToast }), 900);
    else setTimeout(() => showToast(`${milestone.icon} ${milestone.label} geschafft! Ein weiterer Meilenstein für dich.`), 900);
  }

  // Quit countdown (started from the tray) – visible here so it never surprises anyone.
  const quitCard = root.querySelector("#quit-card");
  let quitDeadline = 0;
  const showQuit = (state) => {
    quitDeadline = state?.quitDeadline || 0;
    quitCard.hidden = !quitDeadline;
    tickQuit();
  };
  const tickQuit = () => {
    if (!quitDeadline) return;
    const left = Math.max(0, quitDeadline - Date.now());
    root.querySelector("#quit-left").textContent = `${String(Math.floor(left / 60000)).padStart(2, "0")}:${String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}`;
  };
  const onQuit = (event) => showQuit(event.detail);
  window.addEventListener("reso:quit-state", onQuit);
  const quitInterval = setInterval(tickQuit, 1000);
  api("/api/app/state").then(showQuit).catch(() => {});
  root.querySelector("#quit-cancel").addEventListener("click", async () => {
    const state = await api("/api/app/quit", { method: "POST", body: { action: "cancel" } }).catch((error) => showToast(error.message, true));
    if (state) window.dispatchEvent(new CustomEvent("reso:quit-state", { detail: state }));
    showToast("Schön, dass du bleibst. 💙");
  });
  // Faith: next prayer and the verse of the day (only when the area is enabled)
  let faithTimer;
  loadFaith().then(() => {
    const current = faith();
    const religions = activeReligions(current);
    const card = root.querySelector("#faith-home");
    if (!card || !religions.length || !current.homeCard) return;
    const verse = verseOfDay([religions[0]]); // same verse as in the faith area today
    const config = religions.includes("islam") ? prayerConfig(current) : null;
    const draw = () => {
      const next = config ? nextPrayer(config) : null;
      const minutes = next ? Math.max(0, Math.round((next.at - Date.now()) / 60000)) : 0;
      card.innerHTML = `
        <span class="faith-home-icon">${religions.map((id) => (id === "islam" ? "☪" : "✝")).join("")}</span>
        <div>
          ${next ? `<strong>${escapeHtml(next.label)} um ${formatClock(next.at, config.timeZone)} <small style="display:inline">· in ${minutes >= 60 ? `${Math.floor(minutes / 60)} Std. ${minutes % 60} Min.` : `${minutes} Min.`}</small></strong>` : ""}
          ${verse ? `<p class="faith-home-verse">„<span data-home-verse>${escapeHtml(verse.text)}</span>“ <small>– ${escapeHtml(verse.ref)}</small></p>` : ""}
        </div>
        <button class="button button-secondary small" data-go-faith type="button">Glaube öffnen</button>`;
      card.querySelector("[data-go-faith]").addEventListener("click", () => goTo("faith"));
      if (exact) card.querySelector("[data-home-verse]").textContent = exact;
      card.hidden = false;
    };
    let exact = "";
    if (verse) loadVerse(verse).then((result) => { exact = result.text; draw(); }).catch(() => {});
    draw();
    if (config) faithTimer = setInterval(draw, 30000);
  }).catch(() => {});

  const stopQuit = () => {
    clearInterval(faithTimer);
    clearInterval(quitInterval);
    window.removeEventListener("reso:quit-state", onQuit);
  };

  if (!hasStart) return stopQuit;

  const outer = root.querySelector(".ring-outer");
  const middle = root.querySelector(".ring-middle");
  const inner = root.querySelector(".ring-inner");
  const heroTime = root.querySelector("#hero-time");
  const milestoneText = root.querySelector("#hero-milestone");
  const milestoneBar = root.querySelector("#milestone-bar");
  const daysValue = root.querySelector("#days-value");
  const daysLabel = root.querySelector("#days-label");
  const unitList = root.querySelector("#unit-list");

  const update = () => {
    const now = soberSeconds(data.streakStart);
    const parts = splitDuration(now);
    const next = nextMilestone(now);
    heroTime.textContent = [
      parts.days ? plural(parts.days, "Tag", "Tage") : "",
      `${parts.hours} Std.`,
      `${parts.minutes} Min.`,
      prefs.showSeconds ? `${parts.seconds} Sek.` : "",
    ].filter(Boolean).join(" · ");
    milestoneText.textContent = next.next
      ? `Noch ${humanDuration(next.remainingSeconds)} bis ${next.next.label} ${next.next.icon}`
      : "Alle Meilensteine erreicht. Unglaublich. 🕊️";
    milestoneBar.style.setProperty("--w", `${next.progress * 100}%`);
    if (daysValue) {
      daysValue.textContent = formatNumber(parts.days);
      daysLabel.textContent = parts.days === 1 ? "Tag" : "Tage";
      setRing(outer, next.progress);
      setRing(middle, (parts.hours + parts.minutes / 60) / 24);
      setRing(inner, (parts.minutes + parts.seconds / 60) / 60);
    }
    if (unitList) {
      // Each bar shows how far the unit is towards its next step; empty units stay empty.
      const nextDays = MAJOR_MILESTONES.find((item) => item.days > parts.days)?.days || parts.days || 1;
      const rows = [
        ["Tage", parts.days, parts.days / nextDays],
        ["Stunden", parts.hours, parts.hours / 24],
        ["Minuten", parts.minutes, parts.minutes / 60],
        ...(prefs.showSeconds ? [["Sekunden", parts.seconds, parts.seconds / 60]] : []),
      ];
      const html = rows.map(([label, value, fraction]) => `
        <div class="unit-row">${value > 0 ? `<span class="unit-fill" style="--w:${Math.min(1, fraction) * 100}%"></span>` : ""}<strong>${value}</strong><span>${label}</span></div>`).join("");
      if (html !== unitList.dataset.html) { unitList.dataset.html = html; unitList.innerHTML = html; } // repaint only on change
    }
  };
  update();
  const interval = setInterval(update, 1000);

  return () => {
    clearInterval(interval);
    stopQuit();
  };
}
