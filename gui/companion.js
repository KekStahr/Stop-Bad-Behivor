import { escapeHtml } from "./api.js";
import { prefs } from "./prefs.js";
import { openSheet, notify, chime } from "./ui.js";
import { buildRiskModel, pyWeekday, riskLabel, assessNow } from "./insights.js";
import { openCheckin } from "./flows.js";

// Background companion while the app is open: early warnings and check-in reminders.
const HOUR = 3600 * 1000;
let analytics = null;
let analyticsAt = 0;

function remember(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable: worst case we remind twice
  }
  return null;
}

export function showWarning(slot, goTo) {
  const until = `${slot.start.getHours()}–${(slot.start.getHours() + 1) % 24} Uhr`;
  const plans = prefs.ifThenPlan.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 4);
  const { dialog, close } = openSheet({
    title: "Frühwarnung",
    body: `
      <div class="warning-hero" style="--tone:${slot.label.color}">
        <span class="warning-icon">🛡️</span>
        <div><strong>Zwischen ${until} wird es für dich oft schwer.</strong>
        <span>Das zeigen deine bisherigen Momente. Leg jetzt fest, was du stattdessen machst.</span></div>
      </div>
      ${plans.length ? `<div class="plan-list"><span class="eyebrow">Dein Plan</span>${plans.map((plan) => `<p>${escapeHtml(plan)}</p>`).join("")}</div>` : ""}
      <div class="quick-actions">
        <button type="button" data-do="sos"><span>🌬️</span>Atemübung</button>
        <button type="button" data-do="timer"><span>⏱️</span>Fokus starten</button>
        <button type="button" data-do="community"><span>💬</span>Jemandem schreiben</button>
        <button type="button" data-do="ok"><span>💪</span>Ich bin vorbereitet</button>
      </div>`,
  });
  dialog.querySelectorAll("[data-do]").forEach((button) => button.addEventListener("click", () => {
    close();
    const action = button.dataset.do;
    if (action === "sos") window.dispatchEvent(new Event("reso:sos"));
    else if (action !== "ok") goTo(action);
  }));
}

// Proactive break: long PC sessions were often the lead-up to hard moments.
let breakReminder = null;
function showBreak(assessment, { showToast }) {
  const hours = Math.floor(assessment.session / 60);
  const minutes = assessment.session % 60;
  notify("Reşo · Zeit für eine Pause", "Du sitzt schon lange am Computer. 30 Minuten Pause schützen dich jetzt am besten.");
  const { dialog, close } = openSheet({
    title: "Zeit für eine Pause",
    body: `
      <div class="warning-hero" style="--tone:var(--teal)">
        <span class="warning-icon">☕</span>
        <div><strong>Du bist seit ${hours ? `${hours} Std. ` : ""}${minutes} Min. am Computer.</strong>
        <span>${assessment.threshold.learned
          ? `Bisher wurde es bei dir nach etwa ${Math.round(assessment.threshold.minutes / 60 * 10) / 10} Std. oft schwer.`
          : "Nach langen Sitzungen steigt bei vielen das Verlangen."} Eine Pause jetzt verhindert, dass es so weit kommt.</span></div>
      </div>
      <div class="quick-actions">
        <button type="button" data-break="30"><span>🚶</span>30 Min. Pause machen</button>
        <button type="button" data-break="later"><span>⏰</span>In 30 Min. erinnern</button>
      </div>
      <p class="muted small">Steh auf, trink Wasser, geh kurz raus, iss etwas. Der Computer läuft nicht weg.</p>`,
  });
  dialog.querySelectorAll("[data-break]").forEach((button) => button.addEventListener("click", () => {
    close();
    clearTimeout(breakReminder);
    if (button.dataset.break === "30") {
      showToast("Gute Entscheidung. Ich melde mich in 30 Minuten.");
      breakReminder = setTimeout(() => notify("Reşo · Pause vorbei", "Schön, dass du dir die Zeit genommen hast. 💚"), 30 * 60000);
    } else {
      remember("reso:breakSnooze", String(Date.now() + 30 * 60000));
    }
  }));
}

async function tick({ api, showToast, goTo }) {
  if (document.querySelector("dialog[open]")) return; // never stack on top of what the person is doing
  const now = new Date();
  if (prefs.aiWarnings) {
    if (!analytics || Date.now() - analyticsAt > 30 * 60000) {
      analytics = await api("/api/analytics").catch(() => analytics);
      analyticsAt = Date.now();
    }
    const model = analytics && buildRiskModel(analytics);
    if (model?.ready) {
      for (let offset = 0; offset <= 1; offset += 1) {
        const start = new Date(now.getTime() + offset * HOUR);
        start.setMinutes(0, 0, 0);
        const level = model.level(pyWeekday(start), start.getHours());
        const lead = (Number(prefs.aiLeadMinutes) || 30) * 60000;
        const key = `${start.toISOString()}`;
        if (level >= 0.5 && start - now <= lead && start.getTime() + HOUR > now && remember("reso:warned") !== key) {
          remember("reso:warned", key);
          if (prefs.aiNotify) notify("Reşo · Frühwarnung", "Gleich kommt eine Zeit, die für dich oft schwer ist. Halte dich an deinen Plan. 💪");
          if (prefs.timerSound) chime("message");
          showWarning({ start, label: riskLabel(level) }, goTo);
          break;
        }
      }
    }
  }

  // Context signals: long sessions and late nights – warn before the spiral starts.
  if (prefs.aiWarnings && analytics) {
    const usage = await api("/api/usage").catch(() => null);
    if (usage) {
      const assessment = assessNow(analytics, usage, now);
      const sessionKey = `session-${Math.round((Date.now() - usage.sessionMinutes * 60000) / 600000)}`;
      const snoozed = Number(remember("reso:breakSnooze") || 0) > Date.now();
      if (usage.sessionMinutes >= assessment.threshold.minutes && !snoozed && remember("reso:breakWarned") !== sessionKey) {
        remember("reso:breakWarned", sessionKey);
        showBreak(assessment, { showToast });
        return;
      }
      const nightKey = `night-${now.toDateString()}`;
      if (now.getHours() === 23 && assessment.reasons.some((reason) => reason.icon === "🌙") && remember("reso:nightWarned") !== nightKey) {
        remember("reso:nightWarned", nightKey);
        notify("Reşo · Es ist spät", "Nachts wird es für dich oft schwer. Zeit für den Bildschirm-Feierabend? 🌙");
        showToast("Es ist spät – nachts wird es für dich oft schwer. Zeit für Feierabend am Bildschirm? 🌙");
      }
    }
  }

  if (prefs.checkinReminder && prefs.onboarded) {
    const [hour, minute] = prefs.checkinTime.split(":").map(Number);
    const today = now.toDateString();
    if (now.getHours() * 60 + now.getMinutes() >= hour * 60 + minute && remember("reso:checkinReminded") !== today) {
      const dashboard = await api("/api/dashboard").catch(() => null);
      remember("reso:checkinReminded", today);
      if (dashboard && !dashboard.todayCheckin) {
        notify("Reşo · Check-in", "Wie geht es dir heute? Nimm dir 20 Sekunden für dich.");
        openCheckin({ api, showToast });
      }
    }
  }
}

export function startCompanion(context) {
  const run = () => tick(context).catch(() => {});
  setTimeout(run, 4000);
  setInterval(run, 60000);
}

export function invalidateCompanion() {
  analytics = null;
}
