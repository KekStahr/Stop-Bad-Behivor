import { api } from "./api.js";
import { render as renderHome } from "./pages/home.js";
import { render as renderTimer } from "./pages/timer.js";
import { render as renderStats } from "./pages/stats.js";
import { render as renderSettings } from "./pages/settings.js";
import { render as renderCommunity } from "./pages/community.js";

const pages = {
  home: { title: "Übersicht", render: renderHome },
  timer: { title: "Fokus & Pausen", render: renderTimer },
  community: { title: "Community", render: renderCommunity },
  stats: { title: "Analytics", render: renderStats },
  settings: { title: "Einstellungen", render: renderSettings },
};

const content = document.querySelector("#page-content");
const toast = document.querySelector("#toast");
let activePage = "home";
let toastTimer;
let activeCleanup;

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("is-error", isError);
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

async function navigate(page) {
  if (!pages[page]) return;
  activeCleanup?.();
  activeCleanup = undefined;
  activePage = page;
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.page === page);
  });
  document.querySelector("#page-title").textContent = pages[page].title;
  content.classList.remove("page-enter");
  content.replaceChildren();
  try {
    activeCleanup = await pages[page].render(content, { api, showToast, refresh: () => navigate(activePage) });
    document.querySelector("#connection-status").textContent = "Lokal verbunden";
    content.classList.add("page-enter");
  } catch (error) {
    document.querySelector("#connection-status").textContent = "Verbindung gestört";
    content.innerHTML = `<div class="error-card"><strong>Die Seite konnte nicht geladen werden.</strong><p>${error.message}</p><button class="button button-muted" id="retry-page">Erneut versuchen</button></div>`;
    content.querySelector("#retry-page").addEventListener("click", () => navigate(activePage));
  }
}

document.querySelectorAll("[data-page]").forEach((button) => {
  button.addEventListener("click", () => navigate(button.dataset.page));
});

document.querySelector("#classic-view").addEventListener("click", async () => {
  try {
    await api("/api/app/show", { method: "POST", body: {} });
  } catch (error) {
    showToast(error.message, true);
  }
});

window.addEventListener("unhandledrejection", (event) => {
  showToast(event.reason?.message || "Aktion fehlgeschlagen.", true);
});

navigate("home");
