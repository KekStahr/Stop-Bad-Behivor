// A craving "wave" lives on the backend, so closing the window or restarting the app
// never resets it. This module mirrors it and shows a floating pill while it runs.
let state = { wave: null, minutes: 15, at: Date.now() };
const listeners = new Set();

function update(result) {
  state = { wave: result.wave || null, minutes: result.minutes || 15, at: Date.now() };
  listeners.forEach((listener) => listener(state));
  return state;
}

export const onWave = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const currentWave = () => state;
export const refreshWave = async (api) => update(await api("/api/wave"));
export const startWave = async (api) => update(await api("/api/wave", { method: "POST", body: { action: "start" } }));
export const cancelWave = async (api) => update(await api("/api/wave", { method: "POST", body: { action: "cancel" } }));
export async function completeWave(api) {
  const result = await api("/api/wave", { method: "POST", body: { action: "complete" } });
  update(result);
  return result.survived;
}

export function waveRemaining() {
  if (!state.wave) return null;
  const elapsed = state.wave.elapsedSeconds + (Date.now() - state.at) / 1000;
  return Math.max(0, state.minutes * 60 - elapsed);
}

export const formatClock = (seconds) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export function startWavePill({ api }) {
  const pill = document.createElement("button");
  pill.type = "button";
  pill.className = "wave-pill";
  pill.hidden = true;
  document.body.append(pill);
  pill.addEventListener("click", () => window.dispatchEvent(new Event("reso:sos")));
  const render = () => {
    const left = waveRemaining();
    pill.hidden = left === null || Boolean(document.querySelector("dialog[open].sos-sheet"));
    if (left === null) return;
    pill.classList.toggle("is-done", left <= 0);
    // only touch the DOM when something changed – rewriting restarts the icon animation every second
    const html = left > 0
      ? `<span class="wave-pill-icon">🌊</span><span>Welle aussitzen</span><strong>${formatClock(left)}</strong>`
      : '<span class="wave-pill-icon">🏄</span><span>Geschafft! Welle bestätigen</span><strong>→</strong>';
    if (left > 0 && pill.querySelector("strong") && pill.dataset.state === "run") pill.querySelector("strong").textContent = formatClock(left);
    else if (pill.dataset.state !== (left > 0 ? "run" : "done")) {
      pill.dataset.state = left > 0 ? "run" : "done";
      pill.innerHTML = html;
    }
  };
  onWave(render);
  setInterval(render, 1000);
  refreshWave(api).catch(() => {});
  setInterval(() => refreshWave(api).catch(() => {}), 60000);
}
