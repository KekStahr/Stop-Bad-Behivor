import { escapeHtml } from "./api.js";
import { prefs } from "./prefs.js";
import { openSheet } from "./ui.js";
import { MAJOR_MILESTONES, soberSeconds } from "./recovery.js";
import { buildRiskModel, topWindows } from "./insights.js";

const DAY = 86400 * 1000;
const pad = (value) => String(value).padStart(2, "0");
const localIso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
const isoDate = (date) => localIso(date).slice(0, 10);
const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin";

// Calendar events are computed here and only validated + forwarded by the backend.
export async function calendarEvents(api, kind) {
  if (kind === "checkin") {
    const [hour, minute] = prefs.checkinTime.split(":").map(Number);
    const start = new Date();
    start.setHours(hour || 20, minute || 0, 0, 0);
    if (start < new Date()) start.setTime(start.getTime() + DAY);
    return [{
      summary: "🌱 Life: Dein täglicher Check-in",
      description: "Wie geht es dir heute? Nimm dir 20 Sekunden für dich in der Life-App.",
      start: localIso(start), end: localIso(new Date(start.getTime() + 10 * 60000)), timeZone: zone(),
      recurrence: "DAILY", reminderMinutes: 0,
    }];
  }
  const analytics = await api("/api/analytics");
  if (kind === "milestones") {
    const soberDays = soberSeconds(analytics.streakStart) / 86400;
    return MAJOR_MILESTONES.filter((milestone) => milestone.days > soberDays).slice(0, 6).map((milestone) => {
      const day = new Date(Date.now() + (milestone.days - soberDays) * DAY);
      return {
        summary: `${milestone.icon} Life: ${milestone.label} frei!`,
        description: "Heute erreichst du einen Meilenstein. Sei stolz auf dich – du hast es verdient.",
        start: isoDate(day), end: isoDate(new Date(day.getTime() + DAY)), timeZone: zone(), reminderMinutes: 540,
      };
    });
  }
  const windows = topWindows(buildRiskModel(analytics), 3);
  if (!windows.length) throw new Error("Es gibt noch nicht genug Daten für Risikozeiten. Life lernt noch.");
  return windows.map((window) => {
    const start = new Date();
    const offset = (window.day - ((start.getDay() + 6) % 7) + 7) % 7;
    start.setDate(start.getDate() + offset);
    start.setHours(window.hour, 0, 0, 0);
    if (start < new Date()) start.setDate(start.getDate() + 7);
    return {
      summary: "🛡️ Life: Achtsame Zeit",
      description: `Zu dieser Zeit wird es für dich oft schwer. Plane jetzt etwas Gutes:\n${prefs.ifThenPlan}`,
      start: localIso(start), end: localIso(new Date(start.getTime() + 3600000)), timeZone: zone(),
      recurrence: "WEEKLY", reminderMinutes: 30,
    };
  });
}

export function openAccount({ api, showToast }) {
  let poll;
  const { dialog } = openSheet({
    title: "Konto & Synchronisierung",
    onClose: () => clearTimeout(poll),
    body: '<div id="account-body" class="account"><div class="loading-state"><span class="spinner"></span>Lade …</div></div>',
  });
  const body = dialog.querySelector("#account-body");

  const render = (status) => {
    const busy = status.state === "pending";
    body.innerHTML = `
      <div class="account-hero ${status.connected ? "is-connected" : ""}">
        <span class="google-mark" aria-hidden="true">G</span>
        <div>
          <strong>${status.connected ? escapeHtml(status.email || "Google-Konto") : "Mit Google anmelden"}</strong>
          <span>${status.connected ? "Verbunden · deine Daten sind gesichert" : "Sichere deinen Fortschritt und mach auf jedem Gerät weiter."}</span>
        </div>
      </div>
      ${status.message ? `<div class="callout ${status.state === "error" ? "callout-error" : status.state === "done" ? "callout-success" : ""}">${busy ? '<span class="spinner"></span>' : ""}${escapeHtml(status.message)}</div>` : ""}
      ${!status.configured ? `
        <details class="oauth-setup" open>
          <summary>Google-Anmeldung einrichten (einmalig)</summary>
          <ol>
            <li>In der <strong>Google Cloud Console</strong> ein Projekt anlegen.</li>
            <li><strong>Google Calendar API</strong> aktivieren.</li>
            <li>Unter „Google Auth Platform“ den Zustimmungsbildschirm anlegen und deine Google-Adresse als <strong>Testnutzer</strong> eintragen.</li>
            <li>Einen OAuth-Client vom Typ <strong>„Desktop-App“</strong> erstellen und die Client-ID hier einfügen.</li>
          </ol>
          <label class="field">Client-ID<input type="text" id="oauth-id" placeholder="123456-abc.apps.googleusercontent.com" spellcheck="false"></label>
          <label class="field">Client-Secret (optional, bei Desktop-Apps nicht geheim)<input type="text" id="oauth-secret" spellcheck="false"></label>
          <button class="button button-secondary" data-action="config" type="button">Speichern</button>
        </details>` : ""}
      <ul class="benefit-list">
        <li><span>☁️</span><div><strong>Geräteübergreifend</strong><small>Streak, Ziele, Check-ins und Einstellungen auf jedem Computer.</small></div></li>
        <li><span>📅</span><div><strong>Google Kalender</strong><small>Erinnerungen an Check-ins, Meilensteine und deine Risikozeiten.</small></div></li>
        <li><span>🔒</span><div><strong>Privat</strong><small>Notfallkontakt, Auslöser-Muster und Reflexionen bleiben nur auf diesem Gerät.</small></div></li>
      </ul>
      ${status.connected ? `
        <div class="account-actions">
          <button class="button button-secondary" data-action="sync" type="button" ${busy ? "disabled" : ""}>Jetzt sichern</button>
          <button class="button button-secondary" data-action="restore" type="button" ${busy ? "disabled" : ""}>Von Konto laden</button>
          <button class="button button-danger-plain" data-action="logout" type="button" ${busy ? "disabled" : ""}>Abmelden</button>
        </div>
        <h4 class="account-subtitle">Google Kalender ${status.calendar ? '<span class="status-dot ok">erlaubt</span>' : '<span class="status-dot">nicht erlaubt</span>'}</h4>
        <div class="calendar-actions">
          ${[["checkin", "🌱", `Täglicher Check-in um ${prefs.checkinTime} Uhr`], ["milestones", "🏅", "Kommende Meilensteine eintragen"], ["risk", "🛡️", "Wöchentliche Risikozeiten (KI)"]].map(([kind, icon, label]) => `
            <button class="calendar-action" data-calendar="${kind}" type="button" ${status.calendar && !busy ? "" : "disabled"}>
              <span>${icon}</span><span>${label}</span><small>${status.calendarEvents?.[kind] ? `${status.calendarEvents[kind]} eingetragen · aktualisieren` : "Eintragen"}</small>
            </button>`).join("")}
        </div>
        ${status.calendar ? "" : '<p class="muted small">Um den Kalender zu nutzen, melde dich ab und erneut an und erlaube den Kalender-Zugriff.</p>'}
      ` : `
        <button class="button button-primary button-large google-button" data-action="login" type="button" ${busy || !status.configured ? "disabled" : ""}>
          <span class="google-mark small">G</span> Mit Google anmelden
        </button>`}`;
  };

  const load = async () => {
    try {
      const status = await api("/api/account");
      if (!dialog.isConnected) return;
      render(status);
      if (status.state === "pending") poll = setTimeout(load, 1500);
      else if (status.state === "done" && status.message.startsWith("Angemeldet")) window.dispatchEvent(new Event("reso:account"));
    } catch (error) {
      body.innerHTML = `<div class="callout callout-error">${escapeHtml(error.message)}</div>`;
    }
  };

  body.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    const calendar = event.target.closest("[data-calendar]")?.dataset.calendar;
    try {
      if (action === "config") {
        render(await api("/api/account/config", { method: "POST", body: { clientId: body.querySelector("#oauth-id").value, clientSecret: body.querySelector("#oauth-secret").value } }));
        showToast("Google-Anmeldung ist eingerichtet. Du kannst dich jetzt anmelden.");
      } else if (action) {
        render(await api(`/api/account/${action}`, { method: "POST", body: { calendar: true } }));
        poll = setTimeout(load, 1200);
      } else if (calendar) {
        const button = event.target.closest("[data-calendar]");
        button.disabled = true;
        const events = await calendarEvents(api, calendar);
        const result = await api("/api/calendar/events", { method: "POST", body: { kind: calendar, events } });
        showToast(`${result.created} Termin${result.created === 1 ? "" : "e"} in deinem Google Kalender eingetragen.`);
        load();
      }
    } catch (error) {
      showToast(error.message, true);
      load();
    }
  });
  load();
}
