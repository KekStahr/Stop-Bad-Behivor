export async function render(root, { api, showToast, refresh }) {
  const { timer, defaultMinutes } = await api("/api/dashboard").then(async (dashboard) => ({
    timer: dashboard.timer,
    defaultMinutes: (await api("/api/settings")).defaultTimer,
  }));
  const initialMinutes = timer.running ? timer.durationMinutes : defaultMinutes;
  const remaining = timer.remainingSeconds;
  const clock = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;

  root.innerHTML = `
    <div class="page-heading">
      <div>
        <span class="eyebrow">BEWUSST ARBEITEN</span>
        <h2>Fokuszeit</h2>
        <p class="muted">Nimm dir Zeit für das, was dir wichtig ist.</p>
      </div>
      <span class="status-chip"><i></i> ${timer.running ? "Session aktiv" : "Bereit"}</span>
    </div>

    <section class="timer-card">
      <div class="timer-orbit">
        <div class="timer-center">
          <span class="eyebrow">${timer.running ? "FOKUS LÄUFT" : "DEINE ZEIT"}</span>
          <strong id="timer-clock">${timer.running ? clock : `${String(initialMinutes).padStart(2, "0")}:00`}</strong>
          <span>${timer.running ? "Du bist auf Kurs." : "Ein kleiner Schritt reicht."}</span>
        </div>
      </div>
      <div class="timer-controls">
        <label for="timer-minutes">Dauer <strong><span id="selected-minutes">${initialMinutes}</span> Minuten</strong></label>
        <input id="timer-minutes" type="range" min="5" max="180" step="5" value="${initialMinutes}" ${timer.running ? "disabled" : ""}>
        <div class="range-labels"><span>5 Min.</span><span>3 Std.</span></div>
        <div class="timer-actions">
          ${timer.running
            ? '<button class="button button-danger" id="timer-stop">Session beenden</button>'
            : '<button class="button button-primary button-wide" id="timer-start">Fokus starten <span>→</span></button>'}
        </div>
      </div>
    </section>

    <div class="tip-card">
      <span>✦</span>
      <p><strong>Eine ruhige Erinnerung:</strong> Pausen gehören zum Fokus. Diese Session wird auch von deiner bestehenden Desktop-App und dem System-Monitor erkannt.</p>
    </div>`;

  const slider = root.querySelector("#timer-minutes");
  slider?.addEventListener("input", () => {
    const selectedMinsNode = root.querySelector("#selected-minutes");
    const timerClockNode = root.querySelector("#timer-clock");
    if (selectedMinsNode) selectedMinsNode.textContent = slider.value;
    if (timerClockNode) timerClockNode.textContent = `${String(slider.value).padStart(2, "0")}:00`;
  });

  root.querySelector("#timer-start")?.addEventListener("click", async () => {
    try {
      await api("/api/timer/start", { method: "POST", body: { minutes: Number(slider.value) } });
      showToast("Fokus-Session gestartet.");
      await refresh();
    } catch (error) {
      showToast(error.message, true);
    }
  });

  root.querySelector("#timer-stop")?.addEventListener("click", async () => {
    try {
      await api("/api/timer/stop", { method: "POST", body: {} });
      showToast("Fokus-Session beendet.");
      await refresh();
    } catch (error) {
      showToast(error.message, true);
    }
  });

  if (!timer.running) return;
  let secondsLeft = timer.remainingSeconds;
  const interval = setInterval(() => {
    secondsLeft = Math.max(0, secondsLeft - 1);
    const clockNode = root.querySelector("#timer-clock");
    if (clockNode) {
      clockNode.textContent = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;
    }
    if (secondsLeft === 0) {
      clearInterval(interval);
      showToast("Fokus-Session abgeschlossen.");
      setTimeout(refresh, 500);
    }
  }, 1000);
  return () => clearInterval(interval);
}