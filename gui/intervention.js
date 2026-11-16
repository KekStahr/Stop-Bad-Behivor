// Shown when the keyboard monitor caught a blocked word: what is at stake,
// what happens if you go on, and what to do instead – right now.
import { escapeHtml } from "./api.js";
import { prefs, formatMoney } from "./prefs.js";
import { openSheet } from "./ui.js";
import { confetti } from "./flows.js";
import { ADDICTIONS, TRIGGER_CATALOG, nextMilestone, soberSeconds, humanDuration } from "./recovery.js";
import { requestHelp } from "./help.js";
import { openBubbles } from "./calm.js";
import { activeReligions } from "./faith/state.js";
import { VERSES } from "./faith/data.js";

// Verses that name a specific addiction are only shown for that kind of trigger.
const SPECIFIC = {
  "Sure Al-Māʾida 5:90": ["gambling", "alcohol", "drugs", "meds"],
  "Sure Al-Māʾida 5:91": ["gambling", "alcohol"],
  "Sure Al-Isrāʾ 17:32": ["porn", "dating"],
  "Sure An-Nūr 24:30": ["porn", "dating"],
  "Sure An-Nūr 24:31": ["porn", "dating"],
};
function verseForTrigger(word, religion) {
  const typed = String(word).toLowerCase();
  const category = TRIGGER_CATALOG.find((item) => item.words.some((entry) => entry.replace(/^=/, "") === typed))?.id;
  const pool = VERSES.filter((verse) => verse.religion === religion && verse.theme === "temptation");
  const specific = pool.filter((verse) => SPECIFIC[verse.ref]?.includes(category));
  const general = pool.filter((verse) => !SPECIFIC[verse.ref]);
  const list = specific.length && Math.random() < 0.6 ? specific : general;
  return list[Math.floor(Math.random() * list.length)] || null;
}

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
    const verse = religions.length ? verseForTrigger(word, religions[Math.floor(Math.random() * religions.length)]) : null;
    const { dialog, close } = openSheet({
      title: "Stopp. Halte kurz inne.",
      wide: true,
      body: `
        <div class="intervention">
          <div class="intervention-hero">
            <span class="intervention-icon">✋</span>
            <div><strong>Du hast gerade „${escapeHtml(word)}“ eingegeben.</strong>
            <span>${prefs.closeBrowsers !== false ? "Life hat deine Browser geschlossen, damit du kurz Abstand bekommst." : "Atme einmal tief durch, bevor du weitermachst."}</span></div>
          </div>

          <h4>Was du jetzt aufs Spiel setzt</h4>
          <div class="stake-grid">
            <div><span>💶</span><b class="sensitive">${formatMoney(saved)}</b><small>schon gespart</small></div>
            <div><span>💪</span><b>${Number(data.habitsPrevented) || 0}×</b><small>stark geblieben</small></div>
            <div><span>${escapeHtml(next.next ? next.next.icon : "🕊️")}</span><b>${next.next ? escapeHtml(humanDuration(next.remainingSeconds)) : "–"}</b><small>${next.next ? `bis „${escapeHtml(next.next.label)}“` : "alle Meilensteine geschafft"}</small></div>
          </div>
          ${prefs.why.trim() ? `<blockquote class="intervention-why"><span>♥ Dein Warum</span>${escapeHtml(prefs.why)}</blockquote>` : ""}
          ${verse ? `<blockquote class="intervention-verse">„${escapeHtml(verse.text)}“<span>${escapeHtml(verse.ref)}</span></blockquote>` : ""}

          <section class="consequence-box">
            <h4><span>⚠️</span>Wenn du jetzt weitermachst</h4>
            <ul class="consequences">
              <li><span>↺</span>Dein Zähler fängt wieder bei null an${days ? ` – ${days} ${days === 1 ? "Tag" : "Tage"} Arbeit sind weg` : ""}.</li>
              <li><span>🧠</span>Dein Gehirn lernt: Verlangen heißt nachgeben. Das nächste Verlangen wird dadurch stärker.</li>
              <li><span>⛓️</span>${escapeHtml(CONSEQUENCES[addiction])}</li>
            </ul>
            <p class="not-worth">Das ist es nicht wert.</p>
          </section>

          <section class="instead-box">
            <h4><span>✨</span>Stattdessen – jetzt sofort</h4>
            <div class="quick-actions instead-actions">
              <button type="button" data-do="sos" style="--tone:var(--teal)"><span>🌬️</span><b>Atmen & Welle aussitzen</b><small>Das Verlangen ebbt ab</small></button>
              <button type="button" data-do="crisis" style="--tone:var(--green)"><span>🤝</span><b>Mit jemandem reden</b><small>Anonym, 5 Minuten</small></button>
              <button type="button" data-do="focus" style="--tone:var(--indigo)"><span>⏱️</span><b>15 Min. Fokus starten</b><small>Kopf auf etwas anderes</small></button>
              <button type="button" data-do="calm" style="--tone:var(--orange)"><span>🎈</span><b>Kurz ablenken</b><small>Ein kleines Spiel</small></button>
              ${religions.length ? `<button type="button" data-do="pray" style="--tone:#c9a24a"><span>🕊️</span><b>Beten</b><small>${religions.includes("islam") && religions.length === 1 ? "Duʿāʾ bei Verlangen" : "Gebet bei Verlangen"}</small></button>` : ""}
            </div>
            <p class="instead-tip">🚶 Oder: Steh auf, trink ein Glas Wasser, geh 10 Minuten raus. Das Verlangen ist in 15–30 Minuten vorbei.</p>
          </section>
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
      if (action === "pray") {
        close();
        window.dispatchEvent(new CustomEvent("reso:faith-pray", { detail: "craving" }));
        return undefined;
      }
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
