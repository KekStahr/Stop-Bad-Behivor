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
      <time>${new Date(event.t * 1000).toLocaleTimeString((globalThis.document?.documentElement.lang || "de-DE"), { hour: "2-digit", minute: "2-digit" })}</time>
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
  notify("Life · Jemand braucht deine Hilfe", `Thema: ${help.topic}. Tippe, um anzunehmen oder abzulehnen.`);
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
      <div class="offer" id="offer-body">
        <div class="offer-pulse">🤝</div>
        <p class="offer-topic">Sucht: <strong>${escapeHtml(help.topic)}</strong></p>
        ${help.note ? `<blockquote class="offer-note">„${escapeHtml(help.note)}“</blockquote>` : ""}
        <p class="muted small">Ihr bleibt beide anonym. Hör zu, sei freundlich – du musst keine Lösung haben. Bei akuter Gefahr: 112.</p>
        <div class="offer-timer"><span id="offer-bar" style="--w:100%"></span></div>
        <div class="offer-choice">
          <button class="button button-primary button-large" data-decision="accept" type="button">✓ Annehmen</button>
          <button class="button button-secondary button-large" data-decision="decline" type="button">✕ Ablehnen</button>
        </div>
        <small class="muted">Beim Ablehnen geht die Anfrage sofort an eine andere Vertrauensperson.</small>
      </div>`,
  });
  const total = seconds;
  const bar = dialog.querySelector("#offer-bar");
  const countdown = setInterval(() => {
    seconds -= 1;
    bar?.style.setProperty("--w", `${Math.max(0, (seconds / total) * 100)}%`);
    if (seconds <= 0 && !answered) close();
  }, 1000);

  const respond = (decision, pauseMinutes = 60) => api("/api/community/social/help", {
    method: "POST",
    body: { action: "respond", id: help.id, decision, pause_minutes: pauseMinutes, ...socialProfile() },
  });

  // after declining: how long should Life leave this person alone?
  const askPause = () => {
    const minutesToMidnight = () => {
      const now = new Date();
      return Math.max(1, Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now) / 60000));
    };
    dialog.querySelector("#offer-body").innerHTML = `
      <div class="offer-pulse">🌙</div>
      <p class="offer-topic"><strong>Danke für deine Ehrlichkeit.</strong></p>
      <p class="muted small">Die Person wird gerade an jemand anderen weitergegeben. Wie lange möchtest du keine Anfragen bekommen?</p>
      <div class="pause-grid">
        <button type="button" class="choice" data-pause="5">5 Minuten</button>
        <button type="button" class="choice" data-pause="15">15 Minuten</button>
        <button type="button" class="choice" data-pause="60">1 Stunde</button>
        <button type="button" class="choice" data-pause="today">Heute nicht mehr</button>
      </div>
      <form class="pause-own" id="pause-own">
        <input id="pause-minutes" type="number" min="1" max="10080" placeholder="Eigene Zeit" aria-label="Eigene Pause in Minuten">
        <select id="pause-unit" aria-label="Einheit"><option value="1">Minuten</option><option value="60">Stunden</option><option value="1440">Tage</option></select>
        <button class="button button-primary" type="submit">Übernehmen</button>
      </form>`;
    const save = async (minutes) => {
      try {
        await api("/api/community/social/help", { method: "POST", body: { action: "pause", pause_minutes: minutes, ...socialProfile() } });
        close();
        showToast(minutes >= 1440 ? "Alles klar – du hast Ruhe. 💙" : `Alles klar – ${minutes >= 60 ? `${Math.round(minutes / 60)} Std.` : `${minutes} Min.`} keine Anfragen.`);
      } catch (error) {
        showToast(error.message, true);
      }
    };
    dialog.querySelectorAll("[data-pause]").forEach((button) => button.addEventListener("click", () => save(button.dataset.pause === "today" ? minutesToMidnight() : Number(button.dataset.pause))));
    dialog.querySelector("#pause-own").addEventListener("submit", (event) => {
      event.preventDefault();
      const value = Number(dialog.querySelector("#pause-minutes").value);
      if (!(value > 0)) return showToast("Bitte gib eine Zeit ein.", true);
      save(Math.min(10080, Math.round(value * Number(dialog.querySelector("#pause-unit").value))));
      return undefined;
    });
  };

  dialog.querySelectorAll("[data-decision]").forEach((button) => button.addEventListener("click", async () => {
    answered = true;
    clearInterval(countdown);
    try {
      if (button.dataset.decision === "accept") {
        const result = await respond("accept");
        close();
        if (result.help.status === "accepted") openCrisis({ id: result.help.id });
        else showToast("Diese Anfrage ist leider schon vergeben.");
      } else {
        await respond("forward", 60); // pass it on right away – the pause can still be changed below
        askPause();
      }
    } catch (error) {
      close();
      showToast(error.message, true);
    }
  }));
}

// Polls in the background so helpers stay reachable while Life sits in the tray.
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
