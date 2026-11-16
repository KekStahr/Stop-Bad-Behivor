import { api, onDesktopEvent } from "./api.js";
import { startHelpWatcher, requestHelp } from "./help.js";
import { openIntervention } from "./intervention.js";
import { loadPrefs, prefs, applyPrefs } from "./prefs.js";
import { reveal } from "./ui.js";
import { openSos } from "./sos.js";
import { openPalette } from "./palette.js";
import { openAccount } from "./account.js";
import { startCompanion, invalidateCompanion } from "./companion.js";
import { openCheckin, openOnboarding, syncTriggerCatalog } from "./flows.js";
import { startSidebar } from "./sidebar.js";
import { startWavePill } from "./wave.js";
import { render as renderHome } from "./pages/home.js";
import { render as renderTimer } from "./pages/timer.js";
import { render as renderStats } from "./pages/stats.js";
import { render as renderSettings } from "./pages/settings.js";
import { render as renderCommunity, setPendingRoom, openCrisisTab } from "./pages/community.js";
import { render as renderFaith, openFaithReader, openFaithPrayer } from "./pages/faith.js";
import { startFaithReminders } from "./faith/reminders.js";
import { loadFaith, faith, onFaithChange } from "./faith/state.js";

const pages = {
  home: { title: "Übersicht", render: renderHome },
  timer: { title: "Fokus", render: renderTimer },
  community: { title: "Community", render: renderCommunity },
  stats: { title: "Statistik", render: renderStats },
  faith: { title: "Glaube", render: renderFaith },
  settings: { title: "Einstellungen", render: renderSettings },
};

const content = document.querySelector("#page-content");
const toast = document.querySelector("#toast");
const indicator = document.querySelector(".nav-indicator");
const status = document.querySelector("#connection-status");
let activePage = "home";
let toastTimer;
let activeCleanup;
let navigationId = 0;

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("is-error", isError);
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3400);
}

function moveIndicator() {
  const active = document.querySelector(`.nav-link[data-page="${activePage}"]`);
  if (!active || !indicator) return;
  indicator.style.transform = `translateY(${active.offsetTop}px)`;
  indicator.style.height = `${active.offsetHeight}px`;
  indicator.classList.add("is-ready");
}

async function navigate(page, { keepScroll = false } = {}) {
  if (!pages[page]) return;
  const id = ++navigationId;
  activeCleanup?.();
  activeCleanup = undefined;
  activePage = page;
  document.querySelectorAll("[data-page]").forEach((button) => {
    const active = button.dataset.page === page;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  moveIndicator();
  document.title = `${pages[page].title} · Life`;

  const fresh = document.createElement("div");
  fresh.className = `page-inner page-${page}`;
  const scroll = document.querySelector("#main").scrollTop;
  try {
    const cleanup = await pages[page].render(fresh, { api, showToast, refresh: () => navigate(activePage, { keepScroll: true }), goTo: navigate });
    if (id !== navigationId) {
      cleanup?.();
      return;
    }
    activeCleanup = cleanup;
    status.classList.remove("is-error");
    refreshAccountLabel();
  } catch (error) {
    if (id !== navigationId) return;
    status.textContent = "Verbindung gestört";
    status.classList.add("is-error");
    fresh.innerHTML = `
      <div class="error-state reveal">
        <div class="error-icon">!</div>
        <h2>Diese Seite konnte nicht geladen werden</h2>
        <p class="muted">${String(error.message).replace(/[<>&]/g, "")}</p>
        <button class="button button-primary" id="retry-page" type="button">Erneut versuchen</button>
      </div>`;
    fresh.querySelector("#retry-page").addEventListener("click", () => navigate(activePage));
  }
  content.replaceChildren(fresh);
  document.querySelector("#main").scrollTop = keepScroll ? scroll : 0;
  reveal(fresh);
}

document.querySelectorAll("[data-page]").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.page !== activePage) navigate(button.dataset.page);
  });
});
const context = { api, showToast, goTo: (page) => navigate(page) };

async function refreshAccountLabel() {
  try {
    const account = await api("/api/account");
    status.textContent = account.connected ? `☁︎ ${account.email || "Synchronisiert"}` : "Mit Google anmelden";
    status.classList.toggle("is-synced", account.connected);
  } catch {
    status.textContent = "Lokal gespeichert";
  }
}

const commands = [
  { icon: "⌂", label: "Übersicht", hint: "Strg 1", run: () => navigate("home") },
  { icon: "⏱️", label: "Fokus-Session starten", keywords: "timer konzentration", hint: "Strg 2", run: () => navigate("timer") },
  { icon: "💬", label: "Community & Chats", keywords: "freunde nachricht gruppe", hint: "Strg 3", run: () => navigate("community") },
  { icon: "📊", label: "Statistik", keywords: "diagramm prognose zukunft", hint: "Strg 4", run: () => navigate("stats") },
  { icon: "⚙️", label: "Einstellungen", hint: "Strg 6", run: () => navigate("settings") },
  { icon: "🕊️", label: "Glaube – Gebet, Bibel & Koran", keywords: "gott gebet bibel koran gebetszeiten moschee kirche", hint: "Strg 5", run: () => navigate("faith") },
  { icon: "🌱", label: "Täglicher Check-in", keywords: "stimmung verlangen tagebuch", run: () => openCheckin({ ...context, onSaved: () => activePage === "home" && navigate("home", { keepScroll: true }) }) },
  { icon: "🤝", label: "Mit einer Vertrauensperson sprechen", keywords: "hilfe mensch reden chat", run: () => requestHelp(context) },
  { icon: "🛟", label: "Ich brauche Hilfe", keywords: "sos notfall atem verlangen", hint: "Strg H", run: () => openSos({ goTo: navigate }) },
  { icon: "☁️", label: "Konto & Google-Synchronisierung", keywords: "anmelden login backup kalender", run: () => openAccount(context) },
  { icon: "🧭", label: "Einführung erneut ansehen", keywords: "onboarding start", run: () => openOnboarding({ ...context, onDone: () => navigate("home") }) },
];

document.querySelector("#sos-button").addEventListener("click", () => openSos({ goTo: navigate }));
document.querySelector("#donate-button").addEventListener("click", () => {
  api("/api/app/open-external", { method: "POST", body: { url: "https://streamelements.com/rehscho/tip" } }).catch((error) => showToast(error.message, true));
});
document.querySelector("#profile-button").addEventListener("click", () => openAccount(context));
window.addEventListener("reso:account", () => {
  invalidateCompanion();
  refreshAccountLabel();
  navigate(activePage, { keepScroll: true });
});
window.addEventListener("reso:palette", () => openPalette(commands));
window.addEventListener("reso:toast", (event) => showToast(event.detail.message, event.detail.isError));
window.addEventListener("reso:open-room", (event) => {
  setPendingRoom(event.detail);
  navigate("community");
});
window.addEventListener("reso:faith-pray", (event) => { openFaithPrayer(event.detail).catch(() => {}); });
window.addEventListener("reso:open-reader", (event) => {
  openFaithReader(event.detail);
  navigate("faith");
});
window.addEventListener("reso:open-crisis", (event) => {
  openCrisisTab(event.detail);
  navigate("community");
});

// ---- events from the desktop shell (tray, keyboard monitor, timer) ----
const quitBanner = document.createElement("div");
quitBanner.className = "quit-banner";
quitBanner.hidden = true;
document.querySelector("#main").prepend(quitBanner);
let quitTicker;
quitBanner.innerHTML = `<span>⏳ Life beendet sich in <strong id="quit-banner-left"></strong>. Bis dahin bin ich noch für dich da.</span>
  <button class="button button-light small" type="button">Abbrechen – ich bleibe</button>`;
quitBanner.querySelector("button").addEventListener("click", async () => {
  const state = await api("/api/app/quit", { method: "POST", body: { action: "cancel" } }).catch(() => null);
  if (state) window.dispatchEvent(new CustomEvent("reso:quit-state", { detail: state }));
});
function showQuitState(state) {
  clearInterval(quitTicker);
  quitBanner.hidden = !state?.quitDeadline;
  if (!state?.quitDeadline) return;
  const tick = () => {
    const left = Math.max(0, state.quitDeadline - Date.now());
    quitBanner.querySelector("#quit-banner-left").textContent = `${String(Math.floor(left / 60000)).padStart(2, "0")}:${String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}`;
  };
  tick();
  quitTicker = setInterval(tick, 1000);
}
window.addEventListener("reso:quit-state", (event) => showQuitState(event.detail));
window.addEventListener("reso:quit-state", (event) => {
  if (event.detail && "energySaver" in event.detail) document.documentElement.dataset.energy = event.detail.energySaver ? "on" : "off";
});
onDesktopEvent(({ type, payload }) => {
  if (type === "trigger") openIntervention(payload.word, context); else if (type === "sos") openSos({ goTo: navigate });
  else if (type === "navigate") navigate(payload.page);
  else if (type === "quit-changed") window.dispatchEvent(new CustomEvent("reso:quit-state", { detail: payload }));
  else if (type === "quit-blocked") showToast("Life beendest du über das Symbol unten rechts (Rechtsklick → Beenden, 30 Min. Wartezeit).");
  else if (type === "timer-finished") {
    showToast(`Fokus geschafft: ${payload.minutes} Minuten. Stark!`);
    if (activePage === "timer" || activePage === "home") navigate(activePage, { keepScroll: true });
  } else if (type === "account-changed") window.dispatchEvent(new Event("reso:account"));
});
api("/api/app/state").then((state) => window.dispatchEvent(new CustomEvent("reso:quit-state", { detail: state }))).catch(() => {});
window.addEventListener("resize", moveIndicator);
window.addEventListener("reso:navigate", (event) => navigate(event.detail));
window.addEventListener("reso:sos", () => openSos({ goTo: navigate }));
window.addEventListener("reso:layout", () => requestAnimationFrame(moveIndicator));
window.addEventListener("unhandledrejection", (event) => {
  showToast(event.reason?.message || "Aktion fehlgeschlagen.", true);
});
document.addEventListener("keydown", (event) => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
  if (event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (!document.querySelector("dialog.palette")) openPalette(commands);
    return;
  }
  if (event.key.toLowerCase() === "h") {
    event.preventDefault();
    openSos({ goTo: navigate });
    return;
  }
  const order = ["home", "timer", "community", "stats", "faith", "settings"];
  const index = Number(event.key) - 1;
  if (order[index]) {
    event.preventDefault();
    navigate(order[index]);
  }
});

applyPrefs();
await loadPrefs(api);
await navigate(pages[prefs.startPage] ? prefs.startPage : "home");
startCompanion(context);
startSidebar(context);
startWavePill(context);
startHelpWatcher(context);
startFaithReminders(context);
syncTriggerCatalog(api).catch(() => {});
// the "Glaube" entry can be hidden in the settings
const syncFaithNav = () => {
  const button = document.querySelector("#nav-faith");
  if (button) button.hidden = faith().navHidden === true;
  requestAnimationFrame(moveIndicator);
};
loadFaith().then(syncFaithNav).catch(() => {});
onFaithChange(syncFaithNav);
if (!prefs.onboarded) openOnboarding({ ...context, onDone: () => navigate("home") });
