import { escapeHtml, formatEuro } from "../api.js";

function durationLabel(value, unit) {
  return `${Number(value) || 0} ${unit}`;
}

export async function render(root, { api }) {
  const data = await api("/api/dashboard");
  const timer = data.timer;
  const streak = data.streakTime;
  let elapsed = ((streak.years || 0) * 365 + (streak.months || 0) * 30 + (streak.weeks || 0) * 7 + (streak.days || 0)) * 86400
    + (streak.hours || 0) * 3600 + (streak.minutes || 0) * 60 + (streak.seconds || 0);
  const displayName = data.name.trim() || "Dein Fortschritt";
  document.querySelector("#sidebar-name").textContent = displayName;

  root.innerHTML = `
    <div class="welcome-row">
      <div>
        <span class="eyebrow">SCHÖN, DASS DU DA BIST</span>
        <h2>Weiter so${data.name ? `, ${escapeHtml(data.name)}` : ""}.</h2>
        <p class="muted">${escapeHtml(data.rank)}</p>
      </div>
      <div class="streak-pill"><span>🔥</span><strong>${data.streak}</strong><span>Tage Streak</span></div>
    </div>
    <section class="hero-card">
      <div class="hero-top"><div><span class="eyebrow">DEIN WEG</span><h3>Ein Tag nach dem anderen.</h3></div><span class="status-chip"><i></i> Dein Fortschritt</span></div>
      <div class="streak-clock" aria-label="Zeit seit Beginn">
        <div class="clock-unit"><strong>${durationLabel(streak.days, "Tage")}</strong><span>STREAK</span></div>
        <div class="clock-unit"><strong>${String(streak.hours).padStart(2, "0")}</strong><span>STUNDEN</span></div>
        <div class="clock-unit"><strong>${String(streak.minutes).padStart(2, "0")}</strong><span>MINUTEN</span></div>
        <div class="clock-unit"><strong class="seconds-value">${String(streak.seconds).padStart(2, "0")}</strong><span>SEKUNDEN</span></div>
      </div>
      <div class="hero-footer"><span>Auch kleine Schritte zählen.</span><button class="button button-primary" data-go="timer">${timer.running ? "Fokus läuft" : "Fokus starten"} <span>→</span></button></div>
    </section>
    <div class="metric-grid">
      <article class="metric-card"><span class="metric-icon purple">◷</span><span class="eyebrow">FOKUS GESAMT</span><strong>${Math.floor(data.totalFocusMinutes / 60)} <small>Std.</small></strong><p>${data.totalFocusMinutes % 60} Minuten zusätzlich</p></article>
      <article class="metric-card"><span class="metric-icon green">↗</span><span class="eyebrow">ZEIT ZURÜCKGEWONNEN</span><strong>${data.savedHours} <small>Std.</small></strong><p>Durch Fokus und bewusste Entscheidungen</p></article>
      <article class="metric-card"><span class="metric-icon orange">✦</span><span class="eyebrow">VERHINDERTE GEWOHNHEITEN</span><strong>${data.habitsPrevented}</strong><p>Jeder bewusste Moment zählt</p></article>
    </div>
    <div class="content-grid">
      <section class="panel-card goal-card">
        <div class="panel-heading"><div><span class="eyebrow">DEIN ZIEL</span><h3>${escapeHtml(data.savingsGoal.name)}</h3></div><span class="goal-percent">${Math.round(data.savingsGoal.progress)}%</span></div>
        <div class="progress-track"><span style="width:${Math.min(100, data.savingsGoal.progress)}%"></span></div>
        <div class="goal-values"><strong>${formatEuro(data.savingsGoal.saved)}</strong><span>von ${formatEuro(data.savingsGoal.target)}</span></div>
        <p class="muted">Dein bewusster Einsatz baut sich Schritt für Schritt auf.</p>
      </section>
      <section class="panel-card quote-card"><span class="eyebrow">EIN GEDANKE FÜR HEUTE</span><blockquote>„${escapeHtml(data.quote)}“</blockquote><span class="quote-mark">— Reşo</span></section>
    </div>
    <section class="panel-card badges-card"><div class="panel-heading"><div><span class="eyebrow">MEILENSTEINE</span><h3>Deine bisherigen Erfolge</h3></div><button class="text-button" data-go="stats">Alle Statistiken →</button></div><div class="badge-list">${data.badges.map((badge) => `<div class="badge ${badge.unlocked ? "unlocked" : ""}"><span>${badge.unlocked ? "✓" : "·"}</span><div><strong>${escapeHtml(badge.name)}</strong><small>${escapeHtml(badge.desc)}</small></div></div>`).join("")}</div></section>`;

  root.querySelector("[data-go='timer']").addEventListener("click", () => document.querySelector("[data-page='timer']").click());
  root.querySelector("[data-go='stats']").addEventListener("click", () => document.querySelector("[data-page='stats']").click());
  const clockUnits = root.querySelectorAll(".clock-unit strong");
  const updateClock = () => {
    elapsed += 1;
    const days = Math.floor(elapsed / 86400);
    const hours = Math.floor(elapsed % 86400 / 3600);
    const minutes = Math.floor(elapsed % 3600 / 60);
    const seconds = elapsed % 60;
    clockUnits[0].textContent = `${days} Tage`;
    clockUnits[1].textContent = String(hours).padStart(2, "0");
    clockUnits[2].textContent = String(minutes).padStart(2, "0");
    clockUnits[3].textContent = String(seconds).padStart(2, "0");
  };
  const interval = setInterval(updateClock, 1000);
  return () => clearInterval(interval);
}
