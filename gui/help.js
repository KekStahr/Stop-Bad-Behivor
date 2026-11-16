// Trusted-person help ("Vertrauensperson"): ask for a person, follow the search live,
// and – for people who offered to help – answer incoming requests in their own window.
import { api, escapeHtml } from "./api.js";
import { prefs } from "./prefs.js";
import { openSheet, notify, chime } from "./ui.js";
import { ADDICTIONS } from "./recovery.js";
import { faith, activeReligions } from "./faith/state.js";

const shownOffers = new Set();
let watcher = null;

// Profile fields the server needs for matching (sent with every community call).
export function socialProfile() {
  const days = prefs.helperDays.split(",").map(Number).filter((day) => day >= 0 && day <= 6);
  const schedule = prefs.helperFrom && prefs.helperTo ? { days, from: prefs.helperFrom, to: prefs.helperTo } : { days };
  return {
    show_online: prefs.showOnline,
    addiction: (ADDICTIONS[prefs.addiction] || ADDICTIONS.general).channel,
    helper_enabled: prefs.helperEnabled,
    helper_schedule: JSON.stringify(schedule),
    tz_offset: -new Date().getTimezoneOffset(),
    // only sent (never stored by the server) so hidden faith rooms can be shown
    faith: faith().community ? activeReligions().join(",") : "",
  };
}

const openCrisis = (detail) => window.dispatchEvent(new CustomEvent("reso:open-crisis", { detail }));

// Timeline of what happened with a request (shared with the crisis tab).
export function timeline(help) {
  return (help.events || []).map((event, index, all) => `
    <li class="help-event is-${event.kind} ${index === all.length - 1 ? "is-current" : ""}">
      <span class="help-dot"></span>
      <span>${escapeHtml(event.text)}</span>
      <time>${new Date(event.t * 1000).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</time>
    </li>`).join("");
}

// Seeker: go straight to the crisis chat and start looking for a trusted person.
export function requestHelp() {
  openCrisis({ start: true });
}

// ---- helper -------------------------------------------------------------------------
function showOffer(help, { showToast }) {
  shownOffers.add(help.id);
  chime("message");
  notify("Reşo · Jemand braucht deine Hilfe", `Thema: ${help.topic}. Tippe, um zu antworten.`);
  api("/api/app/show", { method: "POST", body: {} }).catch(() => {});
  let seconds = help.seconds_left ?? 45;
  let answered = false;
  const { dialog, close } = openSheet({
    title: "Eine Person braucht deine Hilfe",
    onClose: () => {
      clearInterval(countdown);
      if (!answered) showToast("Okay – die Anfrage geht gleich an jemand anderen.");
    },
    body: `
      <div class="offer">
        <div class="offer-pulse">🤝</div>
        <p class="offer-topic">Sucht: <strong>${escapeHtml(help.topic)}</strong></p>
        ${help.note ? `<blockquote class="offer-note">„${escapeHtml(help.note)}“</blockquote>` : ""}
        <p class="muted small">Du bleibst anonym. Hör zu, sei freundlich – du musst keine Lösung haben. Bei akuter Gefahr: 112.</p>
        <div class="offer-timer"><span id="offer-bar" style="--w:100%"></span></div>
        <div class="offer-actions">
          <button class="button button-primary button-large" data-decision="accept" type="button">Dieser Person helfen</button>
          <button class="button button-secondary" data-decision="forward" type="button">An eine andere Vertrauensperson weitersenden</button>
        </div>
        <small class="muted">Beim Weitersenden wirst du 1 Stunde lang nicht angefragt.</small>
      </div>`,
  });
  const total = seconds;
  const bar = dialog.querySelector("#offer-bar");
  const countdown = setInterval(() => {
    seconds -= 1;
    bar.style.setProperty("--w", `${Math.max(0, (seconds / total) * 100)}%`);
    if (seconds <= 0) close();
  }, 1000);
  dialog.querySelectorAll("[data-decision]").forEach((button) => button.addEventListener("click", async () => {
    answered = true;
    try {
      const result = await api("/api/community/social/help", {
        method: "POST",
        body: { action: "respond", id: help.id, decision: button.dataset.decision, ...socialProfile() },
      });
      close();
      if (result.help.status === "accepted") openCrisis({ id: result.help.id });
      else showToast("Danke. Wir fragen jemand anderen – du wirst 1 Stunde nicht angefragt.");
    } catch (error) {
      close();
      showToast(error.message, true);
    }
  }));
}

// Polls in the background so helpers stay reachable while Reşo sits in the tray.
export function startHelpWatcher(context) {
  const tick = async () => {
    try {
      const result = await api("/api/community/social/sync", { method: "POST", body: { room: "", ...socialProfile() } });
      for (const help of result.help || []) {
        if (help.role === "helper" && help.status === "offered" && !shownOffers.has(help.id)) showOffer(help, context);
      }
      window.dispatchEvent(new CustomEvent("reso:social", { detail: result }));
    } catch {
      // offline or server asleep – try again later
    }
    clearTimeout(watcher);
    watcher = setTimeout(tick, prefs.helperEnabled ? 5000 : 30000);
  };
  setTimeout(tick, 3000);
}
