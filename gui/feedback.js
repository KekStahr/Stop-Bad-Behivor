// Feedback to Reşo: pick the area, write what should be better. Used in its own window
// (feedback.html, desktop) and as a sheet where windows aren't possible (Android).
import { api, escapeHtml } from "./api.js";
import { openSheet } from "./ui.js";

// own window on the desktop, a sheet everywhere else
export function openFeedback() {
  api("/api/app/feedback-window", { method: "POST", body: {} }).catch(() => {
    const { dialog, close } = openSheet({ title: "Feedback an Reşo", wide: true, body: '<div id="feedback-sheet"></div>' });
    feedbackForm(dialog.querySelector("#feedback-sheet"), { onDone: close });
  });
}

export const FEEDBACK_AREAS = [
  ["overview", "🏠", "Übersicht & Widgets"], ["focus", "⏱️", "Fokus-Timer"], ["community", "💬", "Community & Chats"],
  ["stats", "📊", "Statistik"], ["faith", "🕊️", "Glaube"], ["prayer", "🤲", "Gebet lernen"],
  ["protection", "🛡️", "Schutz & Erkennung"], ["settings", "⚙️", "Einstellungen"], ["language", "🌍", "Sprache & Übersetzung"],
  ["design", "🎨", "Aussehen & Bedienung"], ["android", "📱", "Android-App"], ["other", "✨", "Etwas anderes"],
];

export function feedbackForm(container, { onDone } = {}) {
  let area = "";
  container.innerHTML = `
    <div class="feedback">
      <p class="sheet-text">Hilf mir, Life besser zu machen. Was fällt dir auf, was fehlt dir, was stört? Jede Nachricht lese ich selbst. <span class="feedback-sign">Reşo</span></p>
      <h4 class="feedback-step"><b>1</b> In welchem Bereich?</h4>
      <div class="feedback-areas">${FEEDBACK_AREAS.map(([id, icon, label]) => `<button type="button" class="choice" data-area="${id}"><span>${icon}</span>${escapeHtml(label)}</button>`).join("")}</div>
      <h4 class="feedback-step"><b>2</b> Was möchtest du mir sagen?</h4>
      <textarea id="feedback-text" rows="6" maxlength="2000" placeholder="Beschreib kurz, was passiert ist oder was du dir wünschst …"></textarea>
      <div class="feedback-foot"><small class="muted" id="feedback-count">0 / 2000</small>
        <button class="button button-primary" id="feedback-send" type="button" disabled>Feedback senden</button></div>
      <p class="muted small">Bitte keine persönlichen Daten wie Telefonnummer oder Adresse. Gesendet werden nur Bereich, Text, App-Version und Sprache.</p>
      <div class="feedback-thanks" id="feedback-thanks" hidden><span>💚</span><strong>Danke für dein Feedback!</strong><p>Es ist angekommen. Ich kümmere mich darum.</p></div>
    </div>`;
  const text = container.querySelector("#feedback-text");
  const send = container.querySelector("#feedback-send");
  const update = () => {
    container.querySelector("#feedback-count").textContent = `${text.value.length} / 2000`;
    send.disabled = !area || text.value.trim().length < 5;
  };
  container.querySelectorAll("[data-area]").forEach((button) => button.addEventListener("click", () => {
    area = button.dataset.area;
    container.querySelectorAll("[data-area]").forEach((item) => item.classList.toggle("is-selected", item === button));
    update();
    text.focus();
  }));
  text.addEventListener("input", update);
  send.addEventListener("click", async () => {
    send.disabled = true;
    send.textContent = "Wird gesendet …";
    try {
      await api("/api/feedback", { method: "POST", body: { area, text: text.value } });
      container.querySelector("#feedback-thanks").hidden = false;
      container.querySelectorAll(".feedback > :not(.feedback-thanks)").forEach((node) => { node.hidden = true; });
      setTimeout(() => onDone?.(), 2600);
    } catch (error) {
      send.textContent = "Feedback senden";
      send.disabled = false;
      window.alert(error.message);
    }
  });
}
