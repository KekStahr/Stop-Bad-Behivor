import { escapeHtml, formatEuro } from "../api.js";

function getTrackerUnits(elapsed) {
  const definitions = [
    { key: "years", singular: "Jahr", plural: "Jahre", seconds: 365 * 86400 },
    { key: "months", singular: "Monat", plural: "Monate", seconds: 30 * 86400 },
    { key: "weeks", singular: "Woche", plural: "Wochen", seconds: 7 * 86400 },
    { key: "days", singular: "Tag", plural: "Tage", seconds: 86400 },
    { key: "hours", singular: "Stunde", plural: "Stunden", seconds: 3600, range: 24 },
    { key: "minutes", singular: "Minute", plural: "Minuten", seconds: 60, range: 60 },
    { key: "seconds", singular: "Sekunde", plural: "Sekunden", seconds: 1, range: 60 },
  ];
  let remaining = Math.max(0, Math.floor(elapsed));

  return definitions.map((definition) => {
    const value = Math.floor(remaining / definition.seconds);
    remaining %= definition.seconds;
    return {
      ...definition,
      value,
      label: value === 1 ? definition.singular : definition.plural,
      width: definition.range ? (value / definition.range) * 100 : 100,
    };
  });
}

export async function render(root, { api, showToast, refresh }) {
  const data = await api("/api/dashboard");
  const timer = data.timer;
  const streak = data.streakTime;
  let elapsed = ((streak.years || 0) * 365 + (streak.months || 0) * 30 + (streak.weeks || 0) * 7 + (streak.days || 0)) * 86400
    + (streak.hours || 0) * 3600 + (streak.minutes || 0) * 60 + (streak.seconds || 0);
  const initialTrackerUnits = getTrackerUnits(elapsed);
  const unlockedBadges = data.badges.filter((badge) => badge.unlocked).length;
  const displayName = data.name.trim() || "Dein Fortschritt";

  const sidebarName = document.querySelector("#sidebar-name");
  if (sidebarName) sidebarName.textContent = displayName;

  root.innerHTML = `
    <div class="welcome-row">
      <div>
        <span class="eyebrow">SCHÖN, DASS DU DA BIST</span>
        <h2>Weiter so${data.name ? `, ${escapeHtml(data.name)}` : ""}.</h2>
        <p class="muted">${escapeHtml(data.rank)}</p>
      </div>
      <button class="achievement-launcher" id="open-achievements" type="button" aria-haspopup="dialog" aria-controls="achievement-dialog">
        <span class="achievement-launcher-icon" aria-hidden="true">🏆</span>
        <span class="achievement-launcher-copy">
          <strong>Erfolge</strong>
          <small>${unlockedBadges} von ${data.badges.length} erreicht</small>
        </span>
        <span class="achievement-launcher-arrow" aria-hidden="true">↗</span>
      </button>
    </div>

    <dialog class="achievement-dialog" id="achievement-dialog" aria-labelledby="achievement-dialog-title">
      <div class="achievement-dialog-content">
        <div class="achievement-dialog-header">
          <div>
            <span class="eyebrow">DEINE MEILENSTEINE</span>
            <h3 id="achievement-dialog-title">Alle Erfolge</h3>
          </div>
          <button class="achievement-close" id="close-achievements" type="button" aria-label="Fenster schließen">×</button>
        </div>
        <p class="muted">Dein Fortschritt auf dem Weg – jeder Meilenstein zählt.</p>
        <div class="achievement-grid">
          ${data.badges.map((badge) => `
            <article class="achievement-card ${badge.unlocked ? "is-unlocked" : "is-locked"}">
              <span class="achievement-icon" aria-hidden="true">${escapeHtml(badge.icon || "🏅")}</span>
              <div class="achievement-copy">
                <strong>${escapeHtml(badge.name)}</strong>
                <small>${escapeHtml(badge.desc)}</small>
                <span class="achievement-state">${badge.unlocked ? "Erreicht" : "Noch offen"}</span>
              </div>
            </article>
          `).join("")}
        </div>
      </div>
    </dialog>

    <section class="hero-card">
      <div class="hero-top">
        <div><span class="eyebrow">DEIN WEG</span><h3>Ein Tag nach dem anderen.</h3></div>
        <span class="status-chip"><i></i> Dein Fortschritt</span>
      </div>
      <div class="streak-tracker is-loading" role="timer" aria-label="Zeit seit Beginn">
        ${initialTrackerUnits.map((unit) => `
          <div class="tracker-row tracker-row-${unit.key}" data-tracker-unit="${unit.key}"${unit.value === 0 && unit.key !== "seconds" ? " hidden" : ""}>
            <span class="tracker-fill" style="--tracker-width: ${unit.width}%"></span>
            <strong class="tracker-value">${unit.value} ${unit.label}</strong>
          </div>
        `).join("")}
      </div>
      <div class="tracker-actions">
        <button class="tracker-action tracker-action-primary" data-go="timer">
          <span aria-hidden="true">◷</span>${timer.running ? "Fokus läuft" : "Fokus starten"}
        </button>
        <button class="tracker-action tracker-action-help" data-go="community">
          <span aria-hidden="true">?</span>Hilfe
        </button>
        <button class="tracker-action tracker-action-danger" id="reset-streak">
          <span aria-hidden="true">↻</span>Streak zurücksetzen
        </button>
      </div>
    </section>

    <div class="metric-grid">
      <article class="metric-card">
        <span class="metric-icon purple">◷</span>
        <span class="eyebrow">FOKUS GESAMT</span>
        <strong>${Math.floor(data.totalFocusMinutes / 60)} <small>Std.</small></strong>
        <p>${data.totalFocusMinutes % 60} Minuten zusätzlich</p>
      </article>
      <article class="metric-card">
        <span class="metric-icon green">↗</span>
        <span class="eyebrow">ZEIT ZURÜCKGEWONNEN</span>
        <strong>${data.savedHours} <small>Std.</small></strong>
        <p>Durch Fokus und bewusste Entscheidungen</p>
      </article>
      <article class="metric-card">
        <span class="metric-icon orange">✦</span>
        <span class="eyebrow">VERHINDERTE GEWOHNHEITEN</span>
        <strong>${data.habitsPrevented}</strong>
        <p>Jeder bewusste Moment zählt</p>
      </article>
    </div>

    <div class="content-grid">
      <section class="panel-card goal-card">
        <div class="panel-heading">
          <div><span class="eyebrow">DEIN ZIEL</span><h3>${escapeHtml(data.savingsGoal.name)}</h3></div>
          <span class="goal-percent">${Math.round(data.savingsGoal.progress)}%</span>
        </div>
        <div class="progress-track"><span style="width:${Math.min(100, data.savingsGoal.progress)}%"></span></div>
        <div class="goal-values"><strong>${formatEuro(data.savingsGoal.saved)}</strong><span>von ${formatEuro(data.savingsGoal.target)}</span></div>
        <p class="muted">Dein bewusster Einsatz baut sich Schritt für Schritt auf.</p>
      </section>

      <section class="panel-card quote-card">
        <span class="eyebrow">EIN GEDANKE FÜR HEUTE</span>
        <blockquote>„${escapeHtml(data.quote)}“</blockquote>
        <span class="quote-mark">— Reşo</span>
      </section>
    </div>`;

  root.querySelector("[data-go='timer']")?.addEventListener("click", () => document.querySelector("[data-page='timer']")?.click());
  root.querySelector("[data-go='community']")?.addEventListener("click", () => document.querySelector("[data-page='community']")?.click());
  const achievementsDialog = root.querySelector("#achievement-dialog");
  root.querySelector("#open-achievements")?.addEventListener("click", () => achievementsDialog?.showModal());
  root.querySelector("#close-achievements")?.addEventListener("click", () => achievementsDialog?.close());
  achievementsDialog?.addEventListener("click", (event) => {
    if (event.target === achievementsDialog) achievementsDialog.close();
  });
  root.querySelector("#reset-streak")?.addEventListener("click", async () => {
    if (!window.confirm("Möchtest du deine Streak wirklich zurücksetzen? Alle Streak- und Saison-Erfolge werden zurückgesetzt; dein Streak-Rekord bleibt erhalten.")) return;
    try {
      await api("/api/streak/reset", { method: "POST", body: {} });
      showToast("Deine Streak wurde zurückgesetzt.");
      await refresh();
    } catch (error) {
      showToast(error.message, true);
    }
  });

  requestAnimationFrame(() => root.querySelector(".streak-tracker")?.classList.replace("is-loading", "is-loaded"));
  const updateClock = () => {
    elapsed += 1;
    const trackerUnits = getTrackerUnits(elapsed);
    root.querySelectorAll("[data-tracker-unit]").forEach((row) => {
      const value = row.querySelector(".tracker-value");
      const fill = row.querySelector(".tracker-fill");
      const unit = trackerUnits.find((item) => item.key === row.dataset.trackerUnit);
      if (value && fill && unit) {
        value.textContent = `${unit.value} ${unit.label}`;
        fill.style.setProperty("--tracker-width", `${unit.width}%`);
        row.hidden = unit.value === 0 && unit.key !== "seconds";
      }
    });
  };
  const interval = setInterval(updateClock, 1000);
  return () => clearInterval(interval);
}
