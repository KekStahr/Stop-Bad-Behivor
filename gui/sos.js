import { api, escapeHtml } from "./api.js";
import { prefs } from "./prefs.js";
import { openSheet } from "./ui.js";
import { confetti } from "./flows.js";
import { openBubbles } from "./calm.js";
import { BREATH_PATTERNS, HELP_LINES } from "./recovery.js";
import { requestHelp } from "./help.js";
import { startWave, cancelWave, completeWave, waveRemaining, currentWave, formatClock } from "./wave.js";

const HALT = [
  { id: "hungry", emoji: "🍎", label: "Hungrig", tip: "Iss jetzt etwas Kleines – ein niedriger Blutzucker lässt Verlangen viel stärker wirken." },
  { id: "angry", emoji: "😤", label: "Wütend", tip: "Schreib die Wut ungefiltert auf, beweg dich 5 Minuten kräftig oder atme 4-7-8. Wut darf da sein – sie muss nicht handeln." },
  { id: "lonely", emoji: "🫂", label: "Einsam", tip: "Schreib jetzt einem Freund oder der Community. Eine einzige Nachricht verändert oft den ganzen Abend." },
  { id: "tired", emoji: "😴", label: "Müde", tip: "Müdigkeit senkt die Selbstkontrolle stark. Leg dich 20 Minuten hin oder geh heute früher schlafen." },
];

// The "I need help" sheet. Opening it starts a craving wave on the backend; after
// 15 minutes the "survived" button appears by itself.
export function openSos({ goTo } = {}) {
  const lines = HELP_LINES[prefs.helpRegion] || HELP_LINES.de;
  const pattern = BREATH_PATTERNS[prefs.breathPattern] || BREATH_PATTERNS.box;
  const contact = prefs.contactName.trim() || prefs.contactPhone.trim();
  const plans = prefs.ifThenPlan.split("\n").map((line) => line.trim()).filter(Boolean);
  const [emergency, ...others] = lines;
  let breathTimer;
  let ticker;

  const { dialog, close } = openSheet({
    title: "Du schaffst diesen Moment",
    wide: true,
    onClose: () => {
      clearTimeout(breathTimer);
      clearInterval(ticker);
    },
    body: `
      <button class="help-cta big" id="sos-helper" type="button"><span>🤝</span><span><strong>Mit einer Vertrauensperson sprechen</strong><small>Ein Mensch aus der Community schreibt sofort mit dir – anonym.</small></span></button>
      <p class="sheet-text">Verlangen kommt in Wellen. Nach <strong class="hl-teal">15–30 Minuten</strong> ebbt es ab – <strong>auch wenn du nicht nachgibst.</strong></p>
      <div class="sos-grid">
        <section class="sos-card tone-teal sos-breath">
          <span class="eyebrow">Atmen</span>
          <div class="breath-stage">
            <div class="breath-circle" id="breath-circle"></div>
            <div class="breath-copy"><strong id="breath-phase">Bereit</strong><span id="breath-count">${escapeHtml(pattern.label)}</span></div>
          </div>
          <button class="button button-teal" id="breath-toggle" type="button">Atemübung starten</button>
        </section>

        <section class="sos-card tone-orange wave-card">
          <span class="eyebrow">Welle aussitzen</span>
          <div class="wave-meter"><span id="wave-fill"></span></div>
          <strong class="sos-urge" id="urge-clock">15:00</strong>
          <p class="small" id="wave-text">Die Uhr läuft weiter, auch wenn du das Fenster schließt.</p>
          <button class="button button-plain small" id="wave-cancel" type="button">Ich hatte kein Verlangen</button>
        </section>

        <section class="sos-card tone-green">
          <span class="eyebrow">Jetzt sofort</span>
          <ul class="check-list">
            <li>Ein großes Glas <strong>Wasser</strong> trinken</li>
            <li>Den <strong>Raum wechseln</strong> oder an die frische Luft</li>
            <li><strong>Kaltes Wasser</strong> über die Handgelenke</li>
            <li><strong>Fünf Dinge</strong> benennen, die du siehst</li>
          </ul>
          <div class="button-row">
            <button class="button button-secondary small" id="sos-game" type="button">🎈 Ablenken</button>
            <button class="button button-secondary small" id="sos-community" type="button">💬 Schreiben</button>
          </div>
        </section>
      </div>

      <button class="survived" id="survived" type="button" hidden>
        <span>🏄</span><span><strong>Ich habe die Welle überstanden</strong><small>15 Minuten geschafft. Bestätigen, damit es zählt.</small></span>
      </button>

      <section class="halt">
        <span class="eyebrow">Was steckt gerade dahinter? (HALT)</span>
        <div class="halt-row">${HALT.map((item) => `<button type="button" class="halt-chip" data-halt="${item.id}"><span>${item.emoji}</span>${item.label}</button>`).join("")}</div>
        <p class="halt-tip" id="halt-tip" hidden></p>
      </section>

      ${plans.length || prefs.why.trim() ? `
        <div class="sos-grid two">
          ${plans.length ? `<section class="sos-card tone-indigo"><span class="eyebrow">Dein Plan</span><div class="plan-list">${plans.map((plan) => `<p>${escapeHtml(plan)}</p>`).join("")}</div></section>` : ""}
          ${prefs.why.trim() ? `<section class="sos-card tone-accent sos-why"><span class="eyebrow">♥ Dein Warum</span><blockquote>${escapeHtml(prefs.why)}</blockquote></section>` : ""}
        </div>` : ""}

      ${contact ? `
        <div class="contact-card">
          <div class="avatar">${escapeHtml((prefs.contactName.trim() || "?")[0].toUpperCase())}</div>
          <div><strong>${escapeHtml(prefs.contactName || "Vertrauensperson")}</strong><span>${escapeHtml(prefs.contactPhone)}</span></div>
          <small>Ruf an oder schreib eine Nachricht – du bist nicht allein.</small>
        </div>` : ""}

      <div class="help-lines">
        <span class="eyebrow">Sofort mit einem Menschen sprechen</span>
        <div class="help-emergency">
          <span class="help-icon">🚨</span>
          <div><strong>${escapeHtml(emergency.name)}</strong><small>${escapeHtml(emergency.note)}</small></div>
          <span class="help-number">${escapeHtml(emergency.number)}</span>
        </div>
        ${others.map((line) => `
          <div class="help-line">
            <span class="help-icon">📞</span>
            <div><strong>${escapeHtml(line.name)}</strong><small>${escapeHtml(line.note)}</small></div>
            <span class="help-number">${escapeHtml(line.number)}</span>
          </div>`).join("")}
      </div>`,
  });
  dialog.classList.add("sos-sheet");

  // ---- breathing ----
  let breathing = false;
  const circle = dialog.querySelector("#breath-circle");
  const phase = dialog.querySelector("#breath-phase");
  const count = dialog.querySelector("#breath-count");
  const toggle = dialog.querySelector("#breath-toggle");
  const runStep = (index) => {
    const [label, seconds] = pattern.steps[index % pattern.steps.length];
    phase.textContent = label;
    circle.style.transitionDuration = `${seconds}s`;
    circle.classList.toggle("is-hold", label === "Halten");
    if (label === "Einatmen") circle.classList.add("is-full");
    if (label === "Ausatmen") circle.classList.remove("is-full");
    let left = seconds;
    count.textContent = `${left}`;
    const tick = () => {
      left -= 1;
      if (!breathing) return;
      if (left <= 0) runStep(index + 1);
      else {
        count.textContent = `${left}`;
        breathTimer = setTimeout(tick, 1000);
      }
    };
    breathTimer = setTimeout(tick, 1000);
  };
  toggle.addEventListener("click", () => {
    breathing = !breathing;
    clearTimeout(breathTimer);
    toggle.textContent = breathing ? "Anhalten" : "Atemübung starten";
    if (breathing) runStep(0);
    else {
      circle.classList.remove("is-full", "is-hold");
      phase.textContent = "Bereit";
      count.textContent = pattern.label;
    }
  });

  // ---- wave ----
  const clock = dialog.querySelector("#urge-clock");
  const fill = dialog.querySelector("#wave-fill");
  const waveText = dialog.querySelector("#wave-text");
  const survived = dialog.querySelector("#survived");
  const cancel = dialog.querySelector("#wave-cancel");
  const renderWave = () => {
    const left = waveRemaining();
    if (left === null) {
      clock.textContent = "15:00";
      fill.style.width = "0%";
      return;
    }
    const total = currentWave().minutes * 60;
    clock.textContent = left > 0 ? formatClock(left) : "Geschafft 💪";
    fill.style.width = `${((total - left) / total) * 100}%`;
    if (left <= 0 && survived.hidden && !survived.classList.contains("is-done")) {
      survived.hidden = false;
      cancel.hidden = true;
      waveText.textContent = "Die stärkste Phase liegt hinter dir.";
    }
  };
  startWave(api).then(renderWave).catch((error) => { waveText.textContent = error.message; });
  ticker = setInterval(renderWave, 1000);
  cancel.addEventListener("click", async () => {
    await cancelWave(api).catch(() => {});
    renderWave();
    waveText.textContent = "Alles klar, keine Welle gezählt.";
    cancel.hidden = true;
  });
  survived.addEventListener("click", async () => {
    survived.disabled = true;
    try {
      await completeWave(api);
      survived.classList.add("is-done");
      survived.querySelector("strong").textContent = "Stark! Diese Welle hast du besiegt.";
      survived.querySelector("small").textContent = "Gezählt. Die nächste Welle wird leichter.";
      confetti();
    } catch (error) {
      survived.disabled = false;
      survived.classList.add("is-failed");
      survived.querySelector("small").textContent = error.message;
    }
  });

  // ---- HALT ----
  const tip = dialog.querySelector("#halt-tip");
  dialog.querySelectorAll("[data-halt]").forEach((button) => button.addEventListener("click", () => {
    const item = HALT.find((entry) => entry.id === button.dataset.halt);
    dialog.querySelectorAll("[data-halt]").forEach((chip) => chip.classList.toggle("is-selected", chip === button));
    tip.hidden = false;
    tip.textContent = item.tip;
  }));

  dialog.querySelector("#sos-game").addEventListener("click", () => openBubbles());
  dialog.querySelector("#sos-helper").addEventListener("click", () => {
    requestHelp({ showToast: (message, isError) => window.dispatchEvent(new CustomEvent("reso:toast", { detail: { message, isError } })) });
  });
  dialog.querySelector("#sos-community").addEventListener("click", () => {
    close();
    goTo?.("community");
  });
}
