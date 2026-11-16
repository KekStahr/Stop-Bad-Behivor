import { prefs } from "../prefs.js";
import { ring, setRing, barChart, chime, notify } from "../ui.js";

const PRESETS = [5, 10, 15, 25, 45, 60, 90, 120];
let breakEnd = 0; // survives page switches; breaks are local only
let announcedEnd = 0; // backend may still report "running" for a moment after the end

function clock(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${secs}` : `${String(minutes).padStart(2, "0")}:${secs}`;
}

function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export async function render(root, { api, showToast, refresh }) {
  const [dashboard, settings, analytics] = await Promise.all([
    api("/api/dashboard"),
    api("/api/settings"),
    api("/api/analytics"),
  ]);
  const timer = dashboard.timer;
  const activity = analytics.dailyActivity || {};
  const todayMinutes = Number(activity[dayKey(new Date())]) || 0;
  const goal = Math.max(1, Number(prefs.focusGoal) || 60);
  let selected = timer.running ? timer.durationMinutes : Math.min(180, Math.max(1, settings.defaultTimer || 25));
  const onBreak = !timer.running && breakEnd > Date.now();
  const mode = timer.running ? "focus" : onBreak ? "break" : "idle";
  const focusEnd = Date.now() + timer.remainingSeconds * 1000;

  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return {
      label: new Intl.DateTimeFormat("de-DE", { weekday: "short" }).format(date),
      value: Number(activity[dayKey(date)]) || 0,
    };
  });

  root.innerHTML = `
    <header class="page-header reveal">
      <div>
        <span class="eyebrow">Bewusst handeln</span>
        <h1>Fokus</h1>
        <p class="subtitle">Gib deinem Kopf eine Aufgabe – Verlangen verliert an Kraft, wenn du beschäftigt bist.</p>
      </div>
      <span class="status-pill ${mode !== "idle" ? "is-live" : ""}"><i></i>${mode === "focus" ? "Fokus aktiv" : mode === "break" ? "Pause" : "Bereit"}</span>
    </header>

    <section class="card timer-card reveal" data-mode="${mode}">
      <div class="timer-dial">
        ${ring({ size: 300, stroke: 14, progress: mode === "idle" ? 1 : 0, color: mode === "break" ? "var(--teal)" : "var(--accent)", className: "timer-ring" })}
        <div class="timer-center">
          <span class="eyebrow" id="timer-label">${mode === "focus" ? "Noch" : mode === "break" ? "Pause" : "Dauer"}</span>
          <strong id="timer-clock">${mode === "focus" ? clock(timer.remainingSeconds) : mode === "break" ? clock((breakEnd - Date.now()) / 1000) : clock(selected * 60)}</strong>
          <span id="timer-sub">${mode === "focus" ? "Du bist auf Kurs." : mode === "break" ? "Atme durch. Streck dich." : "Wähle deine Zeit"}</span>
        </div>
      </div>

      <div class="timer-panel">
        ${mode === "idle" ? `
          <div class="chip-row" role="radiogroup" aria-label="Schnellauswahl">
            ${PRESETS.map((minutes) => `<button class="chip ${minutes === selected ? "is-selected" : ""}" data-preset="${minutes}" role="radio" aria-checked="${minutes === selected}" type="button">${minutes < 60 ? `${minutes} Min.` : `${minutes / 60} Std.`}</button>`).join("")}
          </div>
          <label class="slider-field">
            <span>Eigene Dauer <strong id="selected-minutes">${selected} Min.</strong></span>
            <input id="timer-minutes" type="range" min="1" max="180" step="1" value="${selected}" style="--pct:${(selected / 180) * 100}%">
            <span class="range-labels"><small>1 Min.</small><small>3 Std.</small></span>
          </label>
          <div class="button-row">
            <button class="button button-primary button-large" id="timer-start" type="button">Fokus starten</button>
            <button class="button button-secondary button-large" id="break-start" type="button">${prefs.breakMinutes} Min. Pause</button>
          </div>` : mode === "focus" ? `
          <p class="timer-note">Diese Session läuft auch weiter, wenn du die Seite wechselst. Der System-Monitor erkennt sie ebenfalls.</p>
          <div class="button-row">
            <button class="button button-danger button-large" id="timer-stop" type="button">Session beenden</button>
          </div>` : `
          <p class="timer-note">Pausen gehören zum Fokus. Trink etwas, schau aus dem Fenster.</p>
          <div class="button-row">
            <button class="button button-secondary button-large" id="break-stop" type="button">Pause beenden</button>
          </div>`}
      </div>
    </section>

    <div class="split-grid">
      <section class="card reveal">
        <div class="card-header">
          <div><span class="eyebrow">Heute</span><h3>Tagesziel</h3></div>
          <span class="goal-percent" data-count="${Math.min(100, (todayMinutes / goal) * 100)}">0</span>
        </div>
        <div class="progress progress-large"><span style="--w:${Math.min(100, (todayMinutes / goal) * 100)}%"></span></div>
        <p class="muted small">${todayMinutes} von ${goal} Minuten. ${todayMinutes >= goal ? "Tagesziel erreicht – stark! 🎯" : `Noch ${goal - todayMinutes} Minuten.`}</p>
      </section>
      <section class="card reveal">
        <div class="card-header"><div><span class="eyebrow">Letzte 7 Tage</span><h3>Fokus-Minuten</h3></div></div>
        ${barChart(week, { format: (value) => `${value}m` })}
      </section>
    </div>`;

  const ringSvg = root.querySelector(".timer-ring");
  const clockNode = root.querySelector("#timer-clock");

  if (mode === "idle") {
    const slider = root.querySelector("#timer-minutes");
    const select = (minutes) => {
      selected = minutes;
      slider.value = String(minutes);
      slider.style.setProperty("--pct", `${(minutes / 180) * 100}%`);
      root.querySelector("#selected-minutes").textContent = `${minutes} Min.`;
      clockNode.textContent = clock(minutes * 60);
      root.querySelectorAll("[data-preset]").forEach((chip) => {
        const active = Number(chip.dataset.preset) === minutes;
        chip.classList.toggle("is-selected", active);
        chip.setAttribute("aria-checked", String(active));
      });
    };
    slider.addEventListener("input", () => select(Number(slider.value)));
    root.querySelectorAll("[data-preset]").forEach((chip) => chip.addEventListener("click", () => select(Number(chip.dataset.preset))));
    root.querySelector("#timer-start").addEventListener("click", async (event) => {
      event.currentTarget.disabled = true;
      try {
        await api("/api/timer/start", { method: "POST", body: { minutes: selected } });
        showToast(`Fokus gestartet: ${selected} Minuten.`);
        await refresh();
      } catch (error) {
        event.currentTarget.disabled = false;
        showToast(error.message, true);
      }
    });
    root.querySelector("#break-start").addEventListener("click", () => {
      breakEnd = Date.now() + Math.max(1, Number(prefs.breakMinutes) || 5) * 60000;
      refresh();
    });
    return undefined;
  }

  root.querySelector("#timer-stop")?.addEventListener("click", async () => {
    try {
      await api("/api/timer/stop", { method: "POST", body: {} });
      showToast("Fokus-Session beendet.");
      await refresh();
    } catch (error) {
      showToast(error.message, true);
    }
  });
  root.querySelector("#break-stop")?.addEventListener("click", () => {
    breakEnd = 0;
    refresh();
  });

  const total = mode === "focus" ? Math.max(1, timer.durationMinutes * 60) : Math.max(1, Number(prefs.breakMinutes) || 5) * 60;
  const end = mode === "focus" ? focusEnd : breakEnd;
  let finished = false;
  const tick = () => {
    const left = Math.max(0, (end - Date.now()) / 1000);
    clockNode.textContent = clock(left);
    setRing(ringSvg, left / total);
    if (left > 0 || finished) return;
    finished = true;
    if (Math.abs(end - announcedEnd) < 5000) {
      setTimeout(refresh, 1500);
      return;
    }
    announcedEnd = end;
    if (prefs.timerSound) chime();
    if (mode === "focus") {
      if (prefs.timerNotify) notify("Fokus geschafft 🎯", "Zeit für eine kurze Pause.");
      showToast("Fokus-Session abgeschlossen. Stark!");
    } else {
      breakEnd = 0;
      if (prefs.timerNotify) notify("Pause vorbei", "Bereit für die nächste Runde?");
      showToast("Pause vorbei.");
    }
    setTimeout(refresh, 800);
  };
  tick();
  const interval = setInterval(tick, 250);
  return () => clearInterval(interval);
}
