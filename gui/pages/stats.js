import { escapeHtml, formatEuro } from "../api.js";

function bars(activity, incidents) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return {
      label: new Intl.DateTimeFormat("de-DE", { weekday: "short" }).format(date),
      minutes: Math.max(0, Number(activity[key]) || 0),
      incidents: Math.max(0, Number(incidents[key]) || 0),
    };
  });
  const maximum = Math.max(60, ...days.map((day) => day.minutes));
  return days.map((day) => `<div class="bar-column"><div class="bar-value">${day.minutes}m</div><div class="bar-track"><span style="height:${Math.max(4, day.minutes / maximum * 100)}%"></span></div><small>${day.label}</small></div>`).join("");
}

export async function render(root, { api }) {
  const data = await api("/api/analytics");
  const [hours, money] = data.savings;
  const triggers = Object.entries(data.triggerStats || {}).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 5);
  root.innerHTML = `
    <div class="page-heading"><div><span class="eyebrow">DEIN WEG IN ZAHLEN</span><h2>Analytics</h2><p class="muted">Ein Überblick über deinen Einsatz, ganz ohne Wertung.</p></div><span class="status-chip">Alles lokal gespeichert</span></div>
    <div class="metric-grid stats-metrics">
      <article class="metric-card"><span class="eyebrow">FOKUSZEIT</span><strong>${Math.floor(data.totalFocusMinutes / 60)} <small>Std.</small></strong><p>${data.totalFocusMinutes} Minuten insgesamt</p></article>
      <article class="metric-card"><span class="eyebrow">ZURÜCKGEWONNENE ZEIT</span><strong>${hours} <small>Std.</small></strong><p>Fokuszeit plus bewusste Pausen</p></article>
      <article class="metric-card"><span class="eyebrow">GESCHÄTZTER WERT</span><strong>${formatEuro(money)}</strong><p>Basierend auf deinen Einstellungen</p></article>
    </div>
    <div class="content-grid">
      <section class="panel-card chart-card"><div class="panel-heading"><div><span class="eyebrow">LETZTE 7 TAGE</span><h3>Fokus-Minuten</h3></div></div><div class="bar-chart">${bars(data.dailyActivity || {}, data.dailyIncidents || {})}</div><div class="chart-legend"><span><i></i> Fokuszeit</span></div></section>
      <section class="panel-card"><div class="panel-heading"><div><span class="eyebrow">DEINE GEWOHNHEITEN</span><h3>Bewusste Entscheidungen</h3></div></div><div class="large-stat">${data.habitsPrevented}<small>Momente</small></div><p class="muted">Du hast innegehalten und eine andere Entscheidung getroffen.</p></section>
    </div>
    <section class="panel-card"><div class="panel-heading"><div><span class="eyebrow">MUSTER</span><h3>Erfasste Auslöser</h3></div></div>${triggers.length ? `<div class="trigger-list">${triggers.map(([name, count]) => `<div class="trigger-row"><span>${escapeHtml(name)}</span><strong>${Number(count) || 0}×</strong></div>`).join("")}</div>` : '<p class="muted">Noch keine Auslöser erfasst.</p>'}<p class="fine-print">Diese Ansichten sind persönliche Reflexionshilfen, keine klinischen Einschätzungen.</p></section>`;
}
