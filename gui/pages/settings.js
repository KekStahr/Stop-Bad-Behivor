import { escapeHtml } from "../api.js";

export async function render(root, { api, showToast }) {
  const data = await api("/api/settings");
  root.innerHTML = `
    <div class="page-heading"><div><span class="eyebrow">DEINE APP, DEINE REGELN</span><h2>Einstellungen</h2><p class="muted">Werte werden in deinem bestehenden lokalen Profil gespeichert.</p></div></div>
    <form id="settings-form" class="settings-layout">
      <section class="panel-card settings-section"><div class="panel-heading"><div><span class="eyebrow">PERSÖNLICHE ZIELE</span><h3>Dein Sparziel</h3></div></div>
        <label class="field-label">Name<input name="goalName" maxlength="80" required value="${escapeHtml(data.goalName)}"></label>
        <label class="field-label">Zielbetrag in Euro<input name="goalAmount" type="number" min="0.01" max="100000000" step="0.01" required value="${data.goalAmount}"></label>
      </section>
      <section class="panel-card settings-section"><div class="panel-heading"><div><span class="eyebrow">FOKUS & FINANZEN</span><h3>Deine Richtwerte</h3></div></div>
        <label class="field-label">Stundensatz in Euro<input name="hourlyRate" type="number" min="0" max="10000" step="0.01" required value="${data.hourlyRate}"></label>
        <label class="field-label">Geschätzte Ausgaben pro Tag<input name="dailyExpense" type="number" min="0" max="1000000" step="0.01" required value="${data.dailyExpense}"></label>
        <label class="field-label">Standard-Fokuszeit in Minuten<input name="defaultTimer" type="number" min="1" max="180" step="1" required value="${data.defaultTimer}"></label>
      </section>
      <section class="panel-card settings-section"><div class="panel-heading"><div><span class="eyebrow">DEIN SCHUTZ</span><h3>Trigger-Wörter</h3></div></div>
        <p class="muted">Kommagetrennt. Änderungen gelten auch für die native Überwachung.</p>
        <label class="field-label">Wörter zur Erkennung<textarea name="triggerWords" rows="4" maxlength="2000" required>${escapeHtml(data.triggerWords.join(", "))}</textarea></label>
        <label class="toggle-row"><span><strong>Stress-Erkennung</strong><small>Aktiviere die vorhandene lokale Erkennung beim schnellen Tippen.</small></span><input name="stressDetection" type="checkbox" ${data.stressDetection ? "checked" : ""}></label>
      </section>
      <div class="settings-actions"><span class="fine-print">Geheime Daten wie PIN und Webhook werden in der Web-Oberfläche nicht angezeigt.</span><button class="button button-primary" type="submit">Änderungen speichern</button></div>
    </form>`;

  root.querySelector("#settings-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const triggerWords = String(form.get("triggerWords")).split(",").map((word) => word.trim()).filter(Boolean);
    try {
      await api("/api/settings", {
        method: "POST",
        body: {
          hourlyRate: Number(form.get("hourlyRate")),
          dailyExpense: Number(form.get("dailyExpense")),
          defaultTimer: Number(form.get("defaultTimer")),
          savingsGoal: {
            name: String(form.get("goalName")).trim(),
            amount: Number(form.get("goalAmount")),
          },
          triggerWords,
          stressDetection: form.has("stressDetection"),
        },
      });
      showToast("Einstellungen gespeichert.");
    } catch (error) {
      showToast(error.message, true);
    }
  });
}
