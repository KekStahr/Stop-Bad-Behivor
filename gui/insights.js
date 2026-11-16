// Local early-warning model. Learns from past trigger alerts, resisted cravings and
// check-ins on this device only – nothing leaves the computer.
const WEEKDAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const HOUR = 3600 * 1000;

const pyWeekday = (date) => (date.getDay() + 6) % 7; // backend stores Monday = 0

function observedWeeks(dailyIncidents) {
  const dates = Object.keys(dailyIncidents || {}).map((key) => new Date(key).getTime()).filter(Number.isFinite);
  if (!dates.length) return 1;
  return Math.max(1, (Date.now() - Math.min(...dates)) / (7 * 24 * HOUR));
}

// Expected alerts per week for every weekday/hour slot, smoothed over neighbouring hours
// and blended with the person's general time-of-day pattern.
// Signals: typed triggers (1.0), craving waves the person reported (0.6) and
// relapses (1.5 – these are the moments the model must protect against most).
const SIGNALS = [["weekdayHourMatrix", 1], ["cravingMatrix", 0.6], ["relapseMatrix", 1.5]];

export function buildRiskModel(analytics) {
  const raw = Array.from({ length: 7 }, (_, day) =>
    Array.from({ length: 24 }, (_, hour) => SIGNALS.reduce((sum, [key, weight]) =>
      sum + weight * (Number(analytics?.[key]?.[String(day)]?.[String(hour)]) || 0), 0)));
  const total = raw.flat().reduce((sum, value) => sum + value, 0);
  const weeks = observedWeeks(analytics?.dailyIncidents);
  const hourly = Array.from({ length: 24 }, (_, hour) => raw.reduce((sum, row) => sum + row[hour], 0) / 7);
  const score = raw.map((row, day) => row.map((value, hour) => {
    const previous = raw[day][(hour + 23) % 24];
    const next = raw[day][(hour + 1) % 24];
    return (value + 0.45 * (previous + next) + 0.35 * hourly[hour]) / weeks;
  }));
  const max = Math.max(0.0001, ...score.flat());

  // Cravings reported in check-ins nudge the whole model up when things get harder lately.
  const checkins = Object.entries(analytics?.checkins || {}).sort(([a], [b]) => a.localeCompare(b)).slice(-7);
  const recentCraving = checkins.length ? checkins.reduce((sum, [, entry]) => sum + (Number(entry.craving) || 0), 0) / checkins.length : 0;
  const trend = 1 + Math.max(0, recentCraving - 2) * 0.12;

  return {
    ready: total >= 3,
    total,
    weeks,
    score,
    max,
    trend,
    level(day, hour) {
      const value = (score[day][hour] / max) * Math.min(1, total / 6) * trend;
      return Math.min(1, value);
    },
  };
}

export function riskLabel(value) {
  if (value >= 0.66) return { key: "high", text: "Hohes Risiko", short: "Hoch", color: "var(--red)" };
  if (value >= 0.33) return { key: "medium", text: "Erhöhtes Risiko", short: "Erhöht", color: "var(--orange)" };
  return { key: "low", text: "Ruhig", short: "Ruhig", color: "var(--green)" };
}

// Next risky window within `hours` from now (null when calm or not enough data yet).
export function upcomingRisk(model, hours = 6, threshold = 0.5) {
  if (!model.ready) return null;
  const now = new Date();
  for (let offset = 0; offset <= hours; offset += 1) {
    const at = new Date(now.getTime() + offset * HOUR);
    const level = model.level(pyWeekday(at), at.getHours());
    if (level >= threshold) {
      at.setMinutes(0, 0, 0);
      return { at, level, offset, label: riskLabel(level) };
    }
  }
  return null;
}

export function topWindows(model, count = 3) {
  const slots = [];
  model.score.forEach((row, day) => row.forEach((_, hour) => slots.push({ day, hour, level: model.level(day, hour) })));
  return slots
    .filter((slot) => slot.level > 0.2)
    .sort((a, b) => b.level - a.level)
    .slice(0, count)
    .map((slot) => ({ ...slot, label: `${WEEKDAYS[slot.day]}, ${slot.hour}–${(slot.hour + 1) % 24} Uhr` }));
}

export function hourProfile(model, date = new Date()) {
  const day = pyWeekday(date);
  return Array.from({ length: 24 }, (_, hour) => (model.ready ? model.level(day, hour) : 0));
}

export const SUPPORT_IDEAS = [
  "Plane jetzt etwas Schönes für diese Zeit – Sport, ein Anruf, ein Spaziergang.",
  "Schreib jemandem aus deiner Community, bevor es schwer wird.",
  "Starte eine Fokus-Session, damit dein Kopf eine Aufgabe hat.",
  "Leg dir Wasser, einen Snack und etwas für die Hände bereit.",
];

// Radial 24-hour risk chart shared by the overview and the statistics page.
export function riskClock(profile, nowHour) {
  const size = 220;
  const center = size / 2;
  const inner = 42;
  const segments = profile.map((level, hour) => {
    const outer = inner + 12 + level * 38;
    const a0 = ((hour / 24) * 360 - 90 + 1) * (Math.PI / 180);
    const a1 = (((hour + 1) / 24) * 360 - 90 - 1) * (Math.PI / 180);
    const point = (radius, angle) => `${(center + radius * Math.cos(angle)).toFixed(1)},${(center + radius * Math.sin(angle)).toFixed(1)}`;
    const color = level >= 0.66 ? "var(--red)" : level >= 0.33 ? "var(--orange)" : "var(--green)";
    return `<path class="clock-seg ${hour === nowHour ? "is-now" : ""}" style="--i:${hour}" fill="${color}" fill-opacity="${0.35 + level * 0.65}"
      d="M${point(inner, a0)} L${point(outer, a0)} A${outer},${outer} 0 0 1 ${point(outer, a1)} L${point(inner, a1)} A${inner},${inner} 0 0 0 ${point(inner, a0)} Z"><title>${hour}–${hour + 1} Uhr</title></path>`;
  }).join("");
  const labels = [0, 6, 12, 18].map((hour) => {
    const angle = ((hour / 24) * 360 - 90) * (Math.PI / 180);
    return `<text x="${center + 104 * Math.cos(angle)}" y="${center + 104 * Math.sin(angle) + 4}" text-anchor="middle" class="axis">${hour}</text>`;
  }).join("");
  const label = riskLabel(profile[nowHour]);
  return `<svg class="risk-clock" viewBox="0 0 ${size} ${size}" role="img" aria-label="Risiko im Tagesverlauf">${segments}${labels}
    <text x="${center}" y="${center - 2}" text-anchor="middle" class="clock-now" fill="${label.color}">${label.short}</text>
    <text x="${center}" y="${center + 16}" text-anchor="middle" class="clock-sub">jetzt</text></svg>`;
}

export { WEEKDAYS, pyWeekday };

// ---- context signals (computer use, night, mood, recovery phase) ---------------------
const EPISODES = new Set(["trigger", "relapse", "craving"]);

// After how many minutes at the computer it typically gets hard – learned from past episodes.
export function sessionThreshold(contexts = [], fallback = 180) {
  const sessions = contexts.filter((context) => EPISODES.has(context.kind) && context.session >= 20)
    .map((context) => context.session).sort((a, b) => a - b);
  if (sessions.length < 3) return { minutes: fallback, learned: false, samples: sessions.length };
  // the earlier quarter of episodes: warning before most of them happen
  return { minutes: Math.max(45, sessions[Math.floor(sessions.length * 0.25)]), learned: true, samples: sessions.length };
}

export function lateNightShare(contexts = []) {
  const episodes = contexts.filter((context) => EPISODES.has(context.kind));
  if (episodes.length < 3) return 0;
  return episodes.filter((context) => context.hour >= 23 || context.hour < 5).length / episodes.length;
}

const hoursLabel = (minutes) => (minutes >= 60 ? `${Math.floor(minutes / 60)} Std.${minutes % 60 ? ` ${minutes % 60} Min.` : ""}` : `${minutes} Min.`);

// Combined risk right now, with human-readable reasons.
export function assessNow(analytics, usage = analytics?.usage || {}, date = new Date()) {
  const model = buildRiskModel(analytics);
  const contexts = analytics?.aiContexts || [];
  const threshold = sessionThreshold(contexts, Number(analytics?.remoteConfig?.session_warn_default) || 180);
  const reasons = [];
  let score = model.ready ? model.level(pyWeekday(date), date.getHours()) * 0.6 : 0;
  if (model.ready && score >= 0.2) reasons.push({ icon: "🕒", text: "Zu dieser Zeit wird es für dich oft schwer" });

  const session = Number(usage.sessionMinutes) || 0;
  if (session >= threshold.minutes * 0.85) {
    score += 0.3;
    reasons.push({ icon: "💻", text: `${hoursLabel(session)} am Stück am PC${threshold.learned ? " – danach wurde es bei dir oft schwer" : ""}` });
  }
  const hour = date.getHours();
  const night = hour >= 23 || hour < 5;
  if (night && (lateNightShare(contexts) >= 0.3 || (usage.lastNightMinutes || 0) >= 60)) {
    score += 0.15;
    reasons.push({ icon: "🌙", text: "Spät in der Nacht – Müdigkeit macht anfälliger" });
  } else if ((usage.lastNightMinutes || 0) >= 90) {
    score += 0.1;
    reasons.push({ icon: "😴", text: "Letzte Nacht lange wach – wenig Schlaf erhöht das Verlangen" });
  }
  const today = analytics?.checkins?.[`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`];
  if (today && (today.craving >= 4 || today.mood <= 2)) {
    score += 0.2;
    reasons.push({ icon: "🌧️", text: today.craving >= 4 ? "Heute starkes Verlangen gemeldet" : "Heute gedrückte Stimmung gemeldet" });
  }
  const start = Date.parse(analytics?.streakStart || "");
  const days = Number.isFinite(start) ? (date.getTime() - start) / 86400000 : 99;
  if (days < 14) {
    score += 0.1;
    reasons.push({ icon: "🌱", text: "Die ersten zwei Wochen sind die schwersten" });
  }
  score = Math.min(1, score);
  return { score, label: riskLabel(score), reasons, threshold, session, breakIn: Math.max(0, Math.round(threshold.minutes - session)) };
}
