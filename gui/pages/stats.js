import { escapeHtml } from "../api.js";
import { prefs, setPref, formatMoney } from "../prefs.js";
import { lineChart, attachLineHover, barChart, donut, ring, PALETTE, animateCounts, confirmSheet } from "../ui.js";
import { MILESTONES, MAJOR_MILESTONES, AFFORDABLE, benefitTimeline, medicalWarning, soberSeconds, ADDICTIONS } from "../recovery.js";
import { buildRiskModel, hourProfile, topWindows, riskLabel, riskClock } from "../insights.js";
import { computeXp, levelFor, personalRecords, successCalendar, survivedWaves, dayKey } from "../progress.js";
import { confetti } from "../flows.js";

const DAY = 86400;
const MONTH_DAYS = 30.44;
const HORIZONS = [[1, "1 M", "1 Monat"], [3, "3 M", "3 Monaten"], [6, "6 M", "6 Monaten"], [12, "1 J", "1 Jahr"], [24, "2 J", "2 Jahren"], [60, "5 J", "5 Jahren"]];
const SECTIONS = [
  ["overview", "Überblick", "🧭", "var(--accent)"],
  ["progress", "Fortschritt", "📈", "var(--green)"],
  ["future", "Zukunft", "🔭", "var(--teal)"],
  ["body", "Körper & Leben", "💚", "var(--green)"],
  ["milestones", "Level & Meilensteine", "🏆", "var(--orange)"],
  ["patterns", "Muster & KI", "✦", "var(--purple)"],
  ["rewards", "Belohnungen & Zeitkapsel", "🎁", "var(--pink)"],
];
const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MOODS = ["😣", "😕", "😐", "🙂", "😄"];
let metric = "money";

const longDate = (date) => new Intl.DateTimeFormat((globalThis.document?.documentElement.lang || "de-DE"), { day: "numeric", month: "long", year: "numeric" }).format(date);
const shortDate = (date) => new Intl.DateTimeFormat((globalThis.document?.documentElement.lang || "de-DE"), { day: "numeric", month: "short" }).format(date);
const dec = (value, digits = 0) => new Intl.NumberFormat((globalThis.document?.documentElement.lang || "de-DE"), { maximumFractionDigits: digits }).format(value);
const daysAgo = (count) => {
  const date = new Date();
  date.setDate(date.getDate() - count);
  return date;
};

function journey(soberDays) {
  const last = MAJOR_MILESTONES.find((milestone) => milestone.days > soberDays * 1.6) || MAJOR_MILESTONES.at(-1);
  const max = Math.max(last.days, 30);
  const position = (days) => Math.min(100, (Math.sqrt(days) / Math.sqrt(max)) * 100);
  const here = position(soberDays);
  return `
    <div class="journey" style="--here:${here}%">
      <div class="journey-track"><span class="journey-fill"></span></div>
      ${MAJOR_MILESTONES.filter((milestone) => milestone.days <= max).map((milestone) => `
        <span class="journey-stop ${soberDays >= milestone.days ? "is-done" : ""}" style="--x:${position(milestone.days)}%" title="${milestone.label}">
          <i>${milestone.icon}</i><small>${milestone.label}</small>
        </span>`).join("")}
      <span class="journey-here" style="--x:${here}%"><b>Du bist hier</b></span>
    </div>`;
}

function compareRow(label, previous, current, format = (value) => dec(value), lowerIsBetter = false) {
  const max = Math.max(1, previous, current);
  const delta = (current - previous) * (lowerIsBetter ? -1 : 1);
  return `
    <div class="compare-row">
      <span class="compare-label">${label}</span>
      <div class="compare-bars">
        <span class="compare-bar is-prev" style="--w:${(previous / max) * 100}%"><small>${format(previous)}</small></span>
        <span class="compare-bar" style="--w:${(current / max) * 100}%"><small>${format(current)}</small></span>
      </div>
      <span class="delta ${delta > 0 ? "is-up" : delta < 0 ? "is-down" : ""}">${current > previous ? "▲" : current < previous ? "▼" : "•"}</span>
    </div>`;
}

export async function render(root, { api, goTo, showToast, refresh }) {
  const data = await api("/api/analytics");
  const addiction = prefs.addiction in ADDICTIONS ? prefs.addiction : "general";
  const soberDays = soberSeconds(data.streakStart) / DAY;
  const dailyExpense = Number(data.dailyExpense) || 0;
  const dailyHours = Number(prefs.dailyHours) || 0;
  const [focusHoursSaved] = data.savings || [0, 0];
  const money = soberDays * dailyExpense;
  const hours = soberDays * dailyHours + (Number(focusHoursSaved) || 0);
  const goal = data.savingsGoal || { target: 0, name: "" };
  const checkins = data.checkins || {};
  const activity = data.dailyActivity || {};
  const incidents = data.dailyIncidents || {};
  let rewards = Array.isArray(data.rewards) ? data.rewards : [];

  const sumRange = (source, from, to, pick = (value) => Number(value) || 0) => {
    let total = 0;
    for (let index = from; index < to; index += 1) total += pick(source[dayKey(daysAgo(index))]);
    return total;
  };
  const moodAvg = (from, to) => {
    const values = [];
    for (let index = from; index < to; index += 1) {
      const entry = checkins[dayKey(daysAgo(index))];
      if (entry) values.push(entry.mood);
    }
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  };
  const wavesInRange = (from, to) => survivedWaves(data).filter((wave) => {
    const age = (Date.now() - new Date(wave.start).getTime()) / (DAY * 1000);
    return age >= from && age < to;
  }).length;

  // ---- sections ------------------------------------------------------------------
  const sections = {
    overview() {
      const goalProgress = goal.target > 0 ? Math.min(1, money / goal.target) : 0;
      const records = personalRecords(data);
      return `
        <div class="card">
          <div class="card-header"><div><span class="eyebrow">Dein Weg</span><h3>${dec(soberDays, 1)} Tage frei</h3></div><span class="muted">Rekord ${dec(records[0].value)} Tage</span></div>
          ${journey(soberDays)}
        </div>
        <div class="kpi-grid">
          <article class="card kpi" style="--tone:var(--green)">
            <div class="kpi-visual">${ring({ size: 64, stroke: 7, progress: goalProgress, color: "var(--green)" })}<i>€</i></div>
            <div><strong class="sensitive" data-count="${money}" data-format="money">0</strong><small>gespart · ${Math.round(goalProgress * 100)} % vom Ziel</small></div>
          </article>
          <article class="card kpi" style="--tone:var(--teal)">
            <div class="kpi-visual">${ring({ size: 64, stroke: 7, progress: (hours % 24) / 24, color: "var(--teal)" })}<i>◷</i></div>
            <div><strong><span data-count="${hours}" data-format="dec1">0</span> Std.</strong><small>Lebenszeit zurück</small></div>
          </article>
          <article class="card kpi" style="--tone:var(--indigo)">
            <div class="kpi-visual">${ring({ size: 64, stroke: 7, progress: Math.min(1, (data.totalFocusMinutes % 600) / 600), color: "var(--indigo)" })}<i>✦</i></div>
            <div><strong><span data-count="${data.totalFocusMinutes / 60}" data-format="dec1">0</span> Std.</strong><small>Fokus · ${dec(data.timerSessions || 0)} Sessions</small></div>
          </article>
          <article class="card kpi" style="--tone:var(--orange)">
            <div class="kpi-visual">${ring({ size: 64, stroke: 7, progress: Math.min(1, (data.habitsPrevented % 10) / 10), color: "var(--orange)" })}<i>↺</i></div>
            <div><strong data-count="${data.habitsPrevented}">0</strong><small>bewusste Entscheidungen</small></div>
          </article>
        </div>
        <div class="records">${records.map((record) => `
          <div class="record"><span>${record.icon}</span><strong>${dec(record.value)}${record.unit ? ` <small>${record.unit}</small>` : ""}</strong><small>${record.label}</small></div>`).join("")}</div>`;
    },

    progress() {
      const cells = successCalendar(data);
      const free = cells.filter((cell) => cell.state === "free").length;
      const thisWeek = { focus: sumRange(activity, 0, 7), checkins: sumRange(checkins, 0, 7, (entry) => (entry ? 1 : 0)), waves: wavesInRange(0, 7), moments: sumRange(incidents, 0, 7), mood: moodAvg(0, 7) };
      const lastWeek = { focus: sumRange(activity, 7, 14), checkins: sumRange(checkins, 7, 14, (entry) => (entry ? 1 : 0)), waves: wavesInRange(7, 14), moments: sumRange(incidents, 7, 14), mood: moodAvg(7, 14) };
      const allWaves = data.waves || [];
      const survived = allWaves.filter((wave) => wave.status === "survived").length;
      const voided = allWaves.filter((wave) => wave.status === "voided").length;
      const moodSeries = [];
      const cravingSeries = [];
      for (let index = 13; index >= 0; index -= 1) {
        const entry = checkins[dayKey(daysAgo(index))];
        if (entry) {
          moodSeries.push({ x: 13 - index, y: entry.mood });
          cravingSeries.push({ x: 13 - index, y: entry.craving });
        }
      }
      return `
        <div class="card">
          <div class="card-header"><div><span class="eyebrow">Erfolgskalender · letzte 12 Wochen</span><h3>${free} freie Tage</h3></div>
            <span class="legend-inline"><i style="background:var(--green)"></i>frei <i style="background:var(--orange)"></i>schwer, aber gehalten <i style="background:var(--red)"></i>Rückfall</span></div>
          <div class="calendar">
            ${WEEKDAYS.map((label) => `<small class="calendar-day">${label}</small>`).join("")}
            ${cells.map((cell, index) => `<span class="calendar-cell is-${cell.state}" style="--i:${index}" title="${shortDate(cell.date)}${cell.mood ? ` · ${MOODS[cell.mood - 1]}` : ""}">${cell.mood && cell.state !== "future" ? MOODS[cell.mood - 1] : ""}</span>`).join("")}
          </div>
        </div>
        <div class="split-grid">
          <div class="card">
            <div class="card-header"><div><span class="eyebrow">Wochenrückblick</span><h3>Diese Woche vs. letzte</h3></div>
              <span class="legend-inline"><i class="is-prev"></i>letzte <i></i>diese</span></div>
            ${compareRow("Fokus-Minuten", lastWeek.focus, thisWeek.focus)}
            ${compareRow("Check-ins", lastWeek.checkins, thisWeek.checkins)}
            ${compareRow("Besiegte Wellen", lastWeek.waves, thisWeek.waves)}
            ${compareRow("Ø Stimmung", lastWeek.mood, thisWeek.mood, (value) => (value ? MOODS[Math.round(value) - 1] : "–"))}
            ${compareRow("Kritische Momente", lastWeek.moments, thisWeek.moments, undefined, true)}
          </div>
          <div class="card">
            <div class="card-header"><div><span class="eyebrow">Letzte 14 Tage</span><h3>Stimmung & Verlangen</h3></div></div>
            ${moodSeries.length >= 2 ? `
              ${lineChart({ id: "mood-chart", width: 420, height: 200, series: [
                { points: moodSeries, color: "var(--green)" },
                { points: cravingSeries, color: "var(--orange)" },
              ], xLabels: [{ x: 0, label: shortDate(daysAgo(13)) }, { x: 13, label: "Heute" }], yFormat: (value) => dec(value) })}
              <div class="chart-legend"><span><i style="background:var(--green)"></i>Stimmung</span><span><i style="background:var(--orange)"></i>Verlangen</span></div>`
              : `<div class="empty-visual"><span>🌱</span><p>Ein paar tägliche Check-ins – dann siehst du hier deinen Verlauf.</p></div>`}
          </div>
        </div>
        <div class="card wave-summary">
          <div class="wave-stat"><span>🏄</span><strong>${survived}</strong><small>Wellen besiegt</small></div>
          <div class="wave-stat"><span>🌧️</span><strong>${voided}</strong><small>später am Tag doch rückfällig</small></div>
          <p class="muted small">Wurdest du am selben Tag doch rückfällig, zählt die Welle nicht. Die KI merkt sich diese Zeiten.</p>
        </div>`;
    },

    future() {
      const months = Number(prefs.projectionMonths) || 12;
      const futureDays = months * MONTH_DAYS;
      const totalDays = soberDays + futureDays;
      const perDay = metric === "money" ? dailyExpense : dailyHours;
      const base = metric === "money" ? 0 : Number(focusHoursSaved) || 0;
      const now = base + soberDays * perDay;
      const then = base + totalDays * perDay;
      const format = metric === "money" ? (value) => formatMoney(value) : (value) => `${dec(value)} Std.`;
      const horizonLabel = HORIZONS.find(([value]) => value === months)?.[2] || `${months} Monaten`;
      const targetDate = new Date(Date.now() + futureDays * DAY * 1000);
      const icons = metric === "money"
        ? AFFORDABLE.filter((item) => then >= item.price).slice(-4).map((item) => ({ emoji: item.emoji, count: Math.floor(then / item.price), label: item.label }))
        : [["📚", 8, "Bücher"], ["🏃", 1, "Workouts"], ["🗣️", 0.5, "Sprachlektionen"], ["🫂", 3, "Abende mit Freunden"]].map(([emoji, size, label]) => ({ emoji, count: Math.floor(then / size), label }));
      return `
        <div class="card">
          <div class="card-header">
            <div><span class="eyebrow">Wenn du weitergehst</span><h3>Heute vs. in ${horizonLabel}</h3></div>
            <div class="header-controls">
              <div class="segmented small">
                <button type="button" data-metric="money" class="${metric === "money" ? "is-selected" : ""}">Geld</button>
                <button type="button" data-metric="time" class="${metric === "time" ? "is-selected" : ""}">Zeit</button>
              </div>
              <div class="segmented small">
                ${HORIZONS.map(([value, label]) => `<button type="button" data-months="${value}" class="${value === months ? "is-selected" : ""}">${label}</button>`).join("")}
              </div>
            </div>
          </div>
          ${perDay > 0 ? `
            <div class="versus">
              <div class="versus-col"><div class="versus-bar" style="--h:${Math.max(4, (now / Math.max(then, 1)) * 100)}%;--tone:var(--label-3)"></div><strong class="sensitive">${format(now)}</strong><small>Heute</small></div>
              <div class="versus-arrow">→</div>
              <div class="versus-col"><div class="versus-bar" style="--h:100%;--tone:${metric === "money" ? "var(--green)" : "var(--teal)"}"></div><strong class="sensitive" data-count="${then}" data-format="${metric === "money" ? "money" : "dec1"}">0</strong><small>${longDate(targetDate)}</small></div>
              <div class="versus-facts">
                <div><b>${dec(totalDays)}</b><small>Tage frei</small></div>
                <div><b class="sensitive">+${format(futureDays * perDay)}</b><small>ab heute</small></div>
                <div><b class="sensitive">+${format(perDay)}</b><small>jeden Tag</small></div>
              </div>
            </div>
            <div class="icon-grid">${icons.map((item) => `<div class="icon-tile"><span>${item.emoji}</span><strong>${dec(item.count)}×</strong><small>${escapeHtml(item.label)}</small></div>`).join("")}</div>
            <div id="projection-chart-card" class="projection-chart"></div>
          ` : `<div class="empty-visual"><span>${metric === "money" ? "💶" : "⏳"}</span><p>Trag ein, wie viel ${metric === "money" ? "Geld" : "Zeit"} dich deine Sucht früher pro Tag gekostet hat.</p><button class="button button-primary small" data-go="settings" type="button">Jetzt eintragen</button></div>`}
        </div>`;
    },

    body() {
      const benefits = benefitTimeline(addiction);
      const warning = medicalWarning(addiction);
      const next = benefits.find((benefit) => benefit.days > soberDays);
      const done = benefits.filter((benefit) => benefit.days <= soberDays).length;
      return `
        ${warning ? `<div class="callout callout-warning">⚕️ ${escapeHtml(warning)}</div>` : ""}
        <div class="split-grid">
          ${next ? `
            <div class="card next-benefit">
              <div class="next-ring">${ring({ size: 190, stroke: 14, progress: soberDays / next.days, color: "var(--green)" })}
                <span><b>${dec(Math.ceil(next.days - soberDays))}</b><small>${Math.ceil(next.days - soberDays) === 1 ? "Tag" : "Tage"}</small></span></div>
              <span class="eyebrow">Als Nächstes · ${escapeHtml(next.label)}</span>
              <h3>${escapeHtml(next.text)}</h3>
            </div>` : `<div class="card next-benefit"><span class="celebration-icon">🕊️</span><h3>Alle Etappen erreicht. Dein Körper dankt dir.</h3></div>`}
          <div class="card">
            <div class="card-header"><div><span class="eyebrow">${ADDICTIONS[addiction].emoji} ${done} von ${benefits.length} Etappen</span><h3>Was sich verändert</h3></div></div>
            <ol class="timeline benefits compact">
              ${benefits.map((benefit) => `
                <li class="timeline-item ${soberDays >= benefit.days ? "is-done" : benefit === next ? "is-next" : ""}">
                  <span class="timeline-dot">${soberDays >= benefit.days ? "✓" : ""}</span>
                  <div class="timeline-copy"><strong>${escapeHtml(benefit.label)}</strong><small>${escapeHtml(benefit.text)}</small></div>
                </li>`).join("")}
            </ol>
          </div>
        </div>
        <p class="fine-print">Typische Verläufe nach Fachquellen (u. a. WHO). Jeder Körper ist anders – das ersetzt keine ärztliche Beratung.</p>`;
    },

    milestones() {
      const xp = computeXp(data);
      const level = levelFor(xp.total);
      const reached = MILESTONES.filter((milestone) => soberDays >= milestone.days).length;
      const upcoming = MILESTONES.filter((milestone) => soberDays < milestone.days).slice(0, 6);
      return `
        <div class="split-grid">
          <div class="card level-card">
            <div class="level-head">
              <div class="level-badge big">${ring({ size: 96, stroke: 9, progress: level.progress, color: "var(--purple)" })}<b>${level.level}</b></div>
              <div><span class="eyebrow">Level ${level.level} · ${escapeHtml(level.title)}</span><h3>${dec(xp.total)} XP</h3><small class="muted">Noch ${dec(level.toNext)} XP bis Level ${level.level + 1}</small></div>
            </div>
            <div class="xp-parts">${xp.parts.map(([label, value]) => `<div><span>${label}</span><strong>+${dec(value)}</strong></div>`).join("")}</div>
          </div>
          <div class="card">
            <div class="card-header"><div><span class="eyebrow">${reached} von ${MILESTONES.length} erreicht</span><h3>Als Nächstes</h3></div></div>
            <div class="milestone-row">${upcoming.map((milestone) => `
              <div class="chip-badge ${milestone.major ? "is-major" : ""}"><span>${milestone.icon}</span><strong>${milestone.label}</strong>
                <small>${shortDate(new Date(Date.now() + (milestone.days - soberDays) * DAY * 1000))}</small></div>`).join("")}</div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div><span class="eyebrow">Große Etappen</span><h3>Deine Abzeichen</h3></div></div>
          <div class="badge-grid">${MAJOR_MILESTONES.map((milestone) => {
            const earned = soberDays >= milestone.days;
            return `<div class="badge ${earned ? "is-earned" : ""}" title="${earned ? "Erreicht" : longDate(new Date(Date.now() + (milestone.days - soberDays) * DAY * 1000))}">
              <span>${milestone.icon}</span><strong>${milestone.label}</strong><small>${earned ? "Erreicht" : shortDate(new Date(Date.now() + (milestone.days - soberDays) * DAY * 1000))}</small></div>`;
          }).join("")}</div>
        </div>`;
    },

    patterns() {
      const model = buildRiskModel(data);
      const windows = topWindows(model, 3);
      const matrix = data.weekdayHourMatrix || {};
      const heatMax = Math.max(0, ...Object.values(matrix).flatMap((row) => Object.values(row).map(Number)));
      const triggers = Object.entries(data.triggerStats || {}).map(([name, count]) => ({ name, value: Number(count) || 0 })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
      const top = triggers.slice(0, 5);
      if (triggers.length > 5) top.push({ name: "Andere", value: triggers.slice(5).reduce((sum, item) => sum + item.value, 0) });
      const segments = top.map((item, index) => ({ ...item, color: PALETTE[index % PALETTE.length] }));
      const focus14 = Array.from({ length: 14 }, (_, index) => {
        const date = daysAgo(13 - index);
        return { label: index % 2 || index === 13 ? new Intl.DateTimeFormat((globalThis.document?.documentElement.lang || "de-DE"), { weekday: "narrow" }).format(date) : "", value: Number(activity[dayKey(date)]) || 0, title: `${shortDate(date)}: ${Number(activity[dayKey(date)]) || 0} Min.` };
      });
      return `
        <div class="card ai-card">
          <div class="ai-layout">
            <div>${riskClock(hourProfile(model), new Date().getHours())}</div>
            <div class="ai-copy">
              <span class="ai-badge">✦ Lokale KI · Frühwarnsystem</span>
              <h3>${model.ready ? "So sieht dein heutiger Tag aus" : "Life lernt dich noch kennen"}</h3>
              <p class="muted small">${model.ready
                ? `Rot heißt: Zu dieser Zeit wird es für dich oft schwer. Life meldet sich ${prefs.aiLeadMinutes} Min. vorher.`
                : "Nach ein paar erfassten Momenten erkennt Life deine Muster."}</p>
              ${windows.length ? `<div class="window-chips">${windows.map((window) => `<span class="window-chip" style="--tone:${riskLabel(window.level).color}">${escapeHtml(window.label)}</span>`).join("")}</div>` : ""}
            </div>
          </div>
        </div>
        <div class="split-grid">
          <div class="card">
            <div class="card-header"><div><span class="eyebrow">Wochenmuster</span><h3>Wann es schwierig wird</h3></div></div>
            ${heatMax ? `
              <div class="heatmap">
                <span></span>${Array.from({ length: 24 }, (_, hour) => `<small class="heat-hour">${hour % 6 === 0 ? hour : ""}</small>`).join("")}
                ${WEEKDAYS.map((label, day) => `<small class="heat-day">${label}</small>${Array.from({ length: 24 }, (_, hour) => {
                  const value = Number(matrix[String(day)]?.[String(hour)]) || 0;
                  return `<span class="heat-cell" style="--v:${value / heatMax};--i:${hour}" title="${label} ${hour}:00 – ${value}×"></span>`;
                }).join("")}`).join("")}
              </div>` : '<div class="empty-visual"><span>🗓️</span><p>Noch keine Momente erfasst – ein gutes Zeichen.</p></div>'}
          </div>
          <div class="card">
            <div class="card-header"><div><span class="eyebrow">Auslöser</span><h3>Was dich triggert</h3></div></div>
            ${segments.length ? `<div class="donut-layout">${donut(segments)}
              <ul class="legend">${segments.map((segment) => `<li><i style="background:${segment.color}"></i><span>${escapeHtml(segment.name)}</span><strong>${segment.value}×</strong></li>`).join("")}</ul></div>`
              : '<div class="empty-visual"><span>🕊️</span><p>Noch keine Auslöser erfasst.</p></div>'}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div><span class="eyebrow">Letzte 14 Tage</span><h3>Fokus-Minuten</h3></div></div>
          ${barChart(focus14)}
        </div>`;
    },

    rewards() {
      const spent = rewards.filter((reward) => reward.redeemed).reduce((sum, reward) => sum + reward.price, 0);
      const available = Math.max(0, money - spent);
      const nextMajor = MAJOR_MILESTONES.find((milestone) => milestone.days > soberDays);
      const capsules = data.capsules || [];
      return `
        <div class="split-grid">
          <div class="card">
            <div class="card-header"><div><span class="eyebrow">Belohnungs-Wunschliste</span><h3>Gönn dir etwas</h3></div>
              <span class="muted sensitive">${formatMoney(available)} verfügbar</span></div>
            <div class="reward-list">
              ${rewards.map((reward, index) => {
                const progress = reward.redeemed ? 1 : Math.min(1, available / reward.price);
                return `<div class="reward ${reward.redeemed ? "is-redeemed" : progress >= 1 ? "is-ready" : ""}">
                  <span class="reward-emoji">${escapeHtml(reward.emoji)}</span>
                  <div class="reward-copy"><strong>${escapeHtml(reward.name)}</strong>
                    <small class="sensitive">${reward.redeemed ? `Eingelöst am ${new Date(reward.redeemed).toLocaleDateString((globalThis.document?.documentElement.lang || "de-DE"))}` : `${formatMoney(reward.price)} · ${Math.round(progress * 100)} %`}</small>
                    ${reward.redeemed ? "" : `<div class="progress"><span style="--w:${progress * 100}%"></span></div>`}</div>
                  ${!reward.redeemed && progress >= 1 ? `<button class="button button-primary small" data-redeem="${index}" type="button">Einlösen</button>` : ""}
                  <button class="icon-button danger" data-remove-reward="${index}" type="button" aria-label="Entfernen">×</button>
                </div>`;
              }).join("") || '<p class="muted small">Was möchtest du dir von dem gesparten Geld gönnen? Ein Konzert, neue Schuhe, ein Wochenende am Meer?</p>'}
            </div>
            <form class="reward-form" id="reward-form">
              <input type="text" id="reward-emoji" maxlength="4" value="🎁" aria-label="Symbol">
              <input type="text" id="reward-name" maxlength="60" placeholder="z. B. Konzertticket" aria-label="Belohnung" required>
              <div class="number-control"><input type="number" id="reward-price" min="1" step="1" placeholder="Preis" aria-label="Preis" required><span>${escapeHtml(prefs.currency)}</span></div>
              <button class="button button-secondary small" type="submit">Hinzufügen</button>
            </form>
          </div>
          <div class="card capsule-card">
            <div class="card-header"><div><span class="eyebrow">Zeitkapsel</span><h3>Ein Brief an dein zukünftiges Ich</h3></div></div>
            <textarea id="capsule-text" rows="4" maxlength="3000" placeholder="Was möchtest du dir sagen, wenn du diesen Brief wieder öffnest? Wie fühlt sich der Anfang an? Worauf bist du stolz?"></textarea>
            <div class="capsule-actions">
              <select id="capsule-date" aria-label="Öffnen am">
                <option value="7">in 1 Woche</option><option value="30" selected>in 1 Monat</option><option value="90">in 3 Monaten</option><option value="365">in 1 Jahr</option>
                ${nextMajor ? `<option value="m${Math.ceil(nextMajor.days - soberDays)}">bei „${nextMajor.label}“</option>` : ""}
              </select>
              <button class="button button-primary small" id="capsule-save" type="button">Versiegeln</button>
            </div>
            <div class="capsule-list">${capsules.map((capsule) => `
              <div class="capsule ${capsule.ready ? "is-ready" : ""}"><span>${capsule.ready ? "💌" : "🔒"}</span>
                <span><strong>${capsule.ready ? (capsule.opened ? "Geöffnet" : "Bereit zum Öffnen") : `Öffnet am ${new Date(capsule.openAt).toLocaleDateString((globalThis.document?.documentElement.lang || "de-DE"))}`}</strong>
                <small>Geschrieben am ${new Date(capsule.created).toLocaleDateString((globalThis.document?.documentElement.lang || "de-DE"))}</small></span></div>`).join("")}</div>
          </div>
        </div>
        <div class="tool-grid">
          <div class="card tool">
            <span class="tool-icon" style="--tone:var(--green)">🎯</span>
            <h3>Wann kann ich es mir leisten?</h3>
            <div class="number-control"><input type="number" id="calc-amount" min="1" step="10" value="${Math.round(goal.target || 500)}" aria-label="Betrag"><span>${escapeHtml(prefs.currency)}</span></div>
            <p class="tool-result" id="calc-result"></p>
          </div>
          <div class="card tool">
            <span class="tool-icon" style="--tone:var(--teal)">🛍️</span>
            <h3>Schon jetzt drin</h3>
            <ul class="afford-list sensitive">${AFFORDABLE.slice(0, 5).map((item) => `<li><span>${item.emoji}</span><strong>${dec(Math.floor(money / item.price))}×</strong><small>${escapeHtml(item.label)}</small></li>`).join("")}</ul>
          </div>
          <div class="card tool">
            <span class="tool-icon" style="--tone:var(--indigo)">⏳</span>
            <h3>${dec(hours)} Stunden sind …</h3>
            <ul class="afford-list">
              <li><span>📚</span><strong>${dec(Math.floor(hours / 8))}</strong><small>Bücher</small></li>
              <li><span>🏃</span><strong>${dec(Math.floor(hours))}</strong><small>Workouts</small></li>
              <li><span>🫂</span><strong>${dec(Math.floor(hours / 3))}</strong><small>Abende mit Freunden</small></li>
            </ul>
          </div>
        </div>`;
    },
  };

  root.innerHTML = `
    <header class="page-header reveal">
      <div>
        <span class="eyebrow">Dein Weg in Bildern</span>
        <h1>Statistik</h1>
        <p class="subtitle">Wo du stehst – und wo du hinkommst, wenn du dranbleibst.</p>
      </div>
    </header>
    <div class="settings-layout stats-layout reveal">
      <nav class="settings-nav" aria-label="Abschnitte">
        ${SECTIONS.map(([id, title, icon, tone]) => `
          <button type="button" class="settings-nav-item" data-jump="${id}"><span class="settings-icon" style="--tone:${tone}">${icon}</span>${title}</button>`).join("")}
      </nav>
      <div class="settings-content">
        ${SECTIONS.map(([id, title, icon, tone]) => `
          <section class="stats-section" id="section-${id}">
            <h2><span class="settings-icon" style="--tone:${tone}">${icon}</span>${title}</h2>
            <div class="stats-section-body" data-section="${id}">${sections[id]()}</div>
          </section>`).join("")}
      </div>
    </div>`;

  // ---- interactions ------------------------------------------------------------------
  const nav = root.querySelectorAll("[data-jump]");
  nav.forEach((button) => button.addEventListener("click", () => {
    root.querySelector(`#section-${button.dataset.jump}`)?.scrollIntoView({ behavior: document.documentElement.dataset.motion === "off" ? "auto" : "smooth", block: "start" });
  }));
  // highlight the section currently in view
  const observer = new IntersectionObserver((entries) => {
    entries.filter((entry) => entry.isIntersecting).forEach((entry) => {
      nav.forEach((button) => button.classList.toggle("is-current", `section-${button.dataset.jump}` === entry.target.id));
    });
  }, { rootMargin: "-20% 0px -70% 0px" });
  root.querySelectorAll(".stats-section").forEach((section) => observer.observe(section));

  function renderProjectionChart() {
    const card = root.querySelector("#projection-chart-card");
    if (!card) return;
    const months = Number(prefs.projectionMonths) || 12;
    const totalDays = soberDays + months * MONTH_DAYS;
    const perDay = metric === "money" ? dailyExpense : dailyHours;
    const base = metric === "money" ? 0 : Number(focusHoursSaved) || 0;
    const valueAt = (day) => base + day * perDay;
    const step = Math.max(totalDays / 80, 0.05);
    const past = [];
    for (let day = 0; day < soberDays; day += step) past.push({ x: day, y: valueAt(day) });
    past.push({ x: soberDays, y: valueAt(soberDays) });
    const future = [];
    for (let day = soberDays; day < totalDays; day += step) future.push({ x: day, y: valueAt(day) });
    future.push({ x: totalDays, y: valueAt(totalDays) });
    const startDate = new Date(Date.now() - soberDays * DAY * 1000);
    const axis = metric === "money" ? (value) => formatMoney(value, 0) : (value) => `${dec(value)} h`;
    const format = metric === "money" ? (value) => formatMoney(value) : (value) => `${dec(value, 1)} h`;
    const color = metric === "money" ? "var(--green)" : "var(--teal)";
    card.innerHTML = `
      ${lineChart({
        id: "projection-chart", height: 200,
        series: [{ points: past, color, area: true }, { points: future, color, dashed: true, area: true }],
        xLabels: [{ x: 0, label: shortDate(startDate) }, { x: totalDays, label: shortDate(new Date(startDate.getTime() + totalDays * DAY * 1000)) }],
        yFormat: axis,
      })}
      <div class="chart-legend"><span><i style="background:${color}"></i>Bisher</span><span><i class="is-dashed" style="border-color:${color}"></i>Prognose</span></div>`;
    attachLineHover(card, "projection-chart", [...past, ...future], {
      height: 200,
      label: (point) => `<strong>${format(point.y)}</strong><span>${longDate(new Date(startDate.getTime() + point.x * DAY * 1000))}</span>`,
    });
  }

  function bindFuture() {
    const body = root.querySelector('[data-section="future"]');
    renderProjectionChart();
    body.querySelectorAll("[data-months]").forEach((button) => button.addEventListener("click", () => {
      setPref("projectionMonths", Number(button.dataset.months));
      body.innerHTML = sections.future();
      animateCounts(body);
      bindFuture();
    }));
    body.querySelectorAll("[data-metric]").forEach((button) => button.addEventListener("click", () => {
      metric = button.dataset.metric;
      body.innerHTML = sections.future();
      animateCounts(body);
      bindFuture();
    }));
  }
  bindFuture();
  root.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => goTo(button.dataset.go)));

  // rewards
  const saveRewards = async (next, message) => {
    try {
      rewards = (await api("/api/rewards", { method: "POST", body: { rewards: next } })).rewards;
      if (message) showToast(message);
      refresh();
    } catch (error) {
      showToast(error.message, true);
    }
  };
  root.querySelector("#reward-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = root.querySelector("#reward-name").value.trim();
    const price = Number(root.querySelector("#reward-price").value);
    if (!name || !(price > 0)) return;
    saveRewards([...rewards, { id: Date.now(), name, price, emoji: root.querySelector("#reward-emoji").value.trim() || "🎁", redeemed: null }], "Auf deine Wunschliste gesetzt. 🎁");
  });
  root.querySelectorAll("[data-redeem]").forEach((button) => button.addEventListener("click", async () => {
    const reward = rewards[Number(button.dataset.redeem)];
    const ok = await confirmSheet({ title: `${reward.emoji} ${reward.name} einlösen?`, text: "Du hast es dir mit jedem freien Tag verdient. Genieß es – ganz ohne schlechtes Gewissen.", confirmLabel: "Einlösen" });
    if (!ok) return;
    confetti();
    saveRewards(rewards.map((item) => (item === reward ? { ...item, redeemed: new Date().toISOString() } : item)), "Eingelöst! Du hast es dir verdient. 🎉");
  }));
  root.querySelectorAll("[data-remove-reward]").forEach((button) => button.addEventListener("click", () => {
    saveRewards(rewards.filter((_, index) => index !== Number(button.dataset.removeReward)));
  }));

  // time capsule
  root.querySelector("#capsule-save").addEventListener("click", async () => {
    const text = root.querySelector("#capsule-text").value.trim();
    if (!text) {
      showToast("Schreib ein paar Zeilen an dich selbst.", true);
      return;
    }
    const raw = root.querySelector("#capsule-date").value;
    const days = Math.max(1, Number(raw.replace("m", "")) || 30);
    const openAt = dayKey(new Date(Date.now() + days * DAY * 1000));
    try {
      await api("/api/capsules", { method: "POST", body: { action: "create", text, openAt } });
      showToast(`Versiegelt. Dein Brief öffnet sich am ${new Date(openAt).toLocaleDateString((globalThis.document?.documentElement.lang || "de-DE"))}. 💌`);
      refresh();
    } catch (error) {
      showToast(error.message, true);
    }
  });

  // calculator
  const input = root.querySelector("#calc-amount");
  const result = root.querySelector("#calc-result");
  const calculate = () => {
    const amount = Number(input.value);
    if (!Number.isFinite(amount) || amount <= 0) result.textContent = "Gib einen Betrag ein.";
    else if (money >= amount) result.innerHTML = "Hast du <strong>schon gespart</strong>. Gönn es dir! 🎉";
    else if (!dailyExpense) result.textContent = "Lege deine früheren Tagesausgaben in den Einstellungen fest.";
    else {
      const days = (amount - money) / dailyExpense;
      result.innerHTML = `In <strong>${dec(Math.ceil(days))} Tagen</strong> · ${longDate(new Date(Date.now() + days * DAY * 1000))}`;
    }
  };
  input.addEventListener("input", calculate);
  calculate();

  return () => observer.disconnect();
}
