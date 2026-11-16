// Shown when the keyboard monitor caught a blocked word: what is at stake,
// what happens if you go on, and what to do instead – right now.
import { escapeHtml } from "./api.js";
import { prefs, formatMoney } from "./prefs.js";
import { openSheet } from "./ui.js";
import { confetti } from "./flows.js";
import { ADDICTIONS, nextMilestone, soberSeconds, humanDuration } from "./recovery.js";
import { requestHelp } from "./help.js";
import { openBubbles } from "./calm.js";
import { activeReligions } from "./faith/state.js";
import { randomVerse } from "./faith/data.js";

const CONSEQUENCES = {
  general: "Die Gewohnheit holt sich mehr, je öfter du ihr nachgibst.",
  alcohol: "Ein Glas wird selten bei einem bleiben – und morgen zahlt dein Körper dafür.",
  nicotine: "Eine Zigarette weckt die Sucht wieder auf. Dein Körper fängt beim Entzug von vorne an.",
  drugs: "Nach einer Pause kann schon die gewohnte Menge gefährlich sein. Bitte sei vorsichtig.",
  gambling: "Verluste wollen zurückgeholt werden – genau so beginnt die Spirale.",
  gaming: "Aus „nur eine Runde“ werden schnell Stunden, die dir woanders fehlen.",
  porn: "Der kurze Reiz stumpft ab – danach braucht es immer mehr dafür.",
  social: "Das Scrollen kostet dich Zeit und Ruhe – und gibt dir am Ende wenig zurück.",
  food: "Der Heißhunger ist in 20 Minuten weg. Die Schuldgefühle bleiben länger.",
  shopping: "Der Kick vom Kaufen hält Minuten. Die Rechnung kommt trotzdem.",
};

export function openIntervention(word, { api, showToast, goTo }) {
  Promise.all([api("/api/dashboard"), api("/api/analytics")]).then(([data]) => {
    const seconds = soberSeconds(data.streakStart);
    const days = Math.floor(seconds / 86400);
    const saved = (seconds / 86400) * (Number(data.dailyExpense) || 0);
    const next = nextMilestone(seconds);
    const addiction = prefs.addiction in ADDICTIONS ? prefs.addiction : "general";
    const religions = activeReligions();
    const verse = religions.length ? randomVerse([religions[Math.floor(Math.random() * religions.length)]], "temptation") : null;
    const { dialog, close } = openSheet({
      title: "Stopp. Halte kurz inne.",
      wide: true,
      body: `
        <div class="intervention">
          <div class="intervention-hero">
            <span class="intervention-icon">✋</span>
            <div><strong>Du hast gerade „${escapeHtml(word)}“ eingegeben.</strong>
            <span>${prefs.closeBrowsers !== false ? "Reşo hat deine Browser geschlossen, damit du kurz Abstand bekommst." : "Atme einmal tief durch, bevor du weitermachst."}</span></div>
          </div>

          <h4>Was du jetzt aufs Spiel setzt</h4>
          <div class="stake-grid">
            <div><b>${days}</b><small>${days === 1 ? "Tag" : "Tage"} frei</small></div>
            <div><b class="sensitive">${formatMoney(saved)}</b><small>gespart</small></div>
            <div><b>${escapeHtml(next.next ? next.next.icon : "🕊️")}</b><small>${next.next ? `${escapeHtml(next.next.label)} in ${escapeHtml(humanDuration(next.remainingSeconds))}` : "alle Meilensteine"}</small></div>
          </div>
          ${prefs.why.trim() ? `<blockquote class="intervention-why"><span>♥ Dein Warum</span>${escapeHtml(prefs.why)}</blockquote>` : ""}
          ${verse ? `<blockquote class="intervention-verse">„${escapeHtml(verse.text)}“<span>${escapeHtml(verse.ref)}</span></blockquote>` : ""}

          <h4>Wenn du jetzt weitermachst</h4>
          <ul class="consequences">
            <li>Dein Zähler fängt wieder bei null an${days ? ` – ${days} ${days === 1 ? "Tag" : "Tage"} Arbeit` : ""}.</li>
            <li>Dein Gehirn lernt: Verlangen heißt nachgeben. Das nächste Verlangen wird dadurch stärker.</li>
            <li>${escapeHtml(CONSEQUENCES[addiction])}</li>
          </ul>
          <p class="not-worth">Das ist es nicht wert.</p>

          <h4>Stattdessen – jetzt sofort</h4>
          <div class="quick-actions">
            <button type="button" data-do="sos"><span>🌬️</span>Atmen & Welle aussitzen</button>
            <button type="button" data-do="crisis"><span>🤝</span>Mit jemandem reden</button>
            <button type="button" data-do="focus"><span>⏱️</span>15 Min. Fokus starten</button>
            <button type="button" data-do="calm"><span>🎈</span>Kurz ablenken</button>
          </div>
          <p class="muted small">Oder: Steh auf, trink ein Glas Wasser, geh 10 Minuten raus. Das Verlangen ist in 15–30 Minuten vorbei.</p>
          <div class="sheet-actions"><button class="button button-primary button-large" id="stay-strong" type="button">Ich lasse es heute 💪</button></div>
        </div>`,
    });
    dialog.querySelector("#stay-strong").addEventListener("click", () => {
      close();
      confetti();
      showToast("Stark. Genau so baust du dein neues Leben.");
    });
    dialog.querySelectorAll("[data-do]").forEach((button) => button.addEventListener("click", async () => {
      const action = button.dataset.do;
      if (action === "calm") return openBubbles();
      close();
      if (action === "sos") window.dispatchEvent(new Event("reso:sos"));
      else if (action === "crisis") requestHelp({ showToast });
      else if (action === "focus") {
        try {
          await api("/api/timer/start", { method: "POST", body: { minutes: 15 } });
          goTo("timer");
        } catch (error) {
          showToast(error.message, true);
        }
      }
      return undefined;
    }));
  }).catch(() => window.dispatchEvent(new Event("reso:sos")));
}
