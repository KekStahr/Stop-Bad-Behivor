export async function render(root, { api }) {
  const result = await api("/api/community");
  const stats = result.stats;
  const leaderboard = Array.isArray(result.leaderboard) ? result.leaderboard : [];
  root.innerHTML = `
    <div class="page-heading"><div><span class="eyebrow">GEMEINSAM STÄRKER</span><h2>Community</h2><p class="muted">Dein Fortschritt bleibt privat; teile nur, was du möchtest.</p></div></div>
    <section class="community-banner"><div class="community-orb">◎</div><div><span class="eyebrow">DU BIST NICHT ALLEIN</span><h3>Jeder geht seinen eigenen Weg.</h3><p>Deine persönlichen Daten und Nachrichten werden nicht in dieser Übersicht veröffentlicht.</p></div></section>
    <div class="metric-grid">
      <article class="metric-card"><span class="eyebrow">AKTIVE COMMUNITY</span><strong>${stats ? Number(stats.total_active_users) || 0 : "—"}</strong><p>${stats ? "Menschen auf ihrem Weg" : "Community-Dienst momentan nicht erreichbar"}</p></article>
      <article class="metric-card"><span class="eyebrow">GEMEINSAME FOKUSZEIT</span><strong>${stats ? Number(stats.total_community_focus_minutes) || 0 : "—"} <small>Min.</small></strong><p>Zusammen wachsen, jeder im eigenen Tempo</p></article>
      <article class="metric-card"><span class="eyebrow">FOKUS DER COMMUNITY</span><strong>${stats ? Number(stats.community_streak_hours) || 0 : "—"} <small>Std.</small></strong><p>Ein kleiner Schritt zählt</p></article>
    </div>
    <section class="panel-card"><div class="panel-heading"><div><span class="eyebrow">INSPIRATION</span><h3>Community-Rangliste</h3></div></div>
      ${leaderboard.length ? `<div class="leaderboard">${leaderboard.slice(0, 10).map((item) => `<div class="leader-row"><span class="leader-rank">#${Number(item.rank) || "—"}</span><strong>Fokus-Krieger</strong><span>🔥 ${Number(item.streak) || 0} Tage</span><span>${Number(item.focus_minutes) || 0} Fokus-Min.</span></div>`).join("")}</div>` : '<p class="muted">Die Rangliste ist momentan nicht verfügbar oder noch leer.</p>'}
      <p class="fine-print">Ranglistenwerte werden vom Community-Dienst bereitgestellt und nicht unabhängig verifiziert.</p>
    </section>
    <section class="notice-card"><strong>Support-Chat & Forum</strong><p>Die Ende-zu-Ende-verschlüsselte Support-Chat-Ansicht und das Forum sind weiterhin über „Klassische Ansicht“ oben rechts erreichbar. Die Web-Ansicht zeigt Community-Statistiken und die Rangliste.</p></section>`;
}
