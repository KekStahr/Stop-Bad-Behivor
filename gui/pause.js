// "Kurz innehalten": 30 seconds of guided breathing (in 4 s, hold 2 s, out 6 s).
const TOTAL = 30;
const CYCLE = [["Einatmen", 4, 1], ["Halten", 2, 1], ["Ausatmen", 6, 0.55]];
const CIRCUMFERENCE = 741.4;

const card = document.querySelector("#card");
const circle = document.querySelector("#circle");
const glow = document.querySelector("#glow");
const phase = document.querySelector("#phase");
const count = document.querySelector("#count");
const text = document.querySelector("#text");
const progress = document.querySelector("#progress");
const primary = document.querySelector("#primary");
const later = document.querySelector("#later");

const setScale = (scale, seconds) => {
  for (const element of [circle, glow]) {
    element.style.setProperty("--d", `${seconds}s`);
    element.style.setProperty("--s", scale);
  }
};

function run() {
  primary.disabled = true;
  primary.textContent = "Atme mit …";
  later.textContent = "Abbrechen";
  const started = performance.now();
  let lastPhase = -1;

  const frame = (time) => {
    const elapsed = (time - started) / 1000;
    if (elapsed >= TOTAL) {
      card.classList.add("done");
      circle.classList.remove("hold");
      setScale(0.85, 0.8);
      progress.style.strokeDashoffset = "0";
      phase.textContent = "Gut gemacht";
      count.textContent = "30 Sekunden geschafft";
      text.textContent = "Jetzt mit klarem Kopf weiter.";
      primary.disabled = false;
      primary.textContent = "Fertig";
      primary.onclick = () => window.close();
      later.hidden = true;
      return;
    }
    let position = elapsed % 12;
    let index = 0;
    while (position >= CYCLE[index][1]) {
      position -= CYCLE[index][1];
      index += 1;
    }
    const [label, seconds, scale] = CYCLE[index];
    const cycleNumber = Math.floor(elapsed / 12);
    if (index + cycleNumber * 3 !== lastPhase) {
      lastPhase = index + cycleNumber * 3;
      phase.textContent = label;
      circle.classList.toggle("hold", label === "Halten");
      setScale(scale, seconds);
    }
    count.textContent = String(Math.ceil(seconds - position));
    progress.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - elapsed / TOTAL));
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

primary.addEventListener("click", run, { once: true });
later.addEventListener("click", () => window.close());
