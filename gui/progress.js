// Gamification computed from data the app already stores – nothing extra to sync.
import { MAJOR_MILESTONES, soberSeconds } from "./recovery.js";

const DAY = 86400;
const TITLES = ["Neuanfang", "Entdecker", "Kämpferin & Kämpfer", "Wegbereiter", "Hüter", "Leuchtturm", "Meister", "Legende"];

export const dayKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const daysAgo = (count) => {
  const date = new Date();
  date.setDate(date.getDate() - count);
  return date;
};

export function survivedWaves(analytics) {
  return (analytics.waves || []).filter((wave) => wave.status === "survived");
}

export function computeXp(analytics) {
  const soberDays = soberSeconds(analytics.streakStart) / DAY;
  const checkins = Object.values(analytics.checkins || {});
  const parts = [
    ["Freie Tage", Math.floor(soberDays) * 10],
    ["Check-ins", checkins.length * 5 + checkins.filter((entry) => entry.pledge).length * 2],
    ["Überstandene Wellen", survivedWaves(analytics).length * 15],
    ["Fokuszeit", Math.floor((Number(analytics.totalFocusMinutes) || 0) / 5)],
    ["Große Meilensteine", MAJOR_MILESTONES.filter((milestone) => soberDays >= milestone.days).length * 50],
  ];
  return { total: parts.reduce((sum, [, value]) => sum + value, 0), parts };
}

// Level n needs 50·n·(n+1) XP: quick early levels, slower later – like the milestones.
export function levelFor(xp) {
  let level = 0;
  while (50 * (level + 1) * (level + 2) <= xp) level += 1;
  const floor = 50 * level * (level + 1);
  const ceiling = 50 * (level + 1) * (level + 2);
  return {
    level: level + 1,
    title: TITLES[Math.min(TITLES.length - 1, Math.floor(level / 5))],
    progress: (xp - floor) / (ceiling - floor),
    toNext: ceiling - xp,
  };
}

export function checkinStreak(checkins = {}) {
  let streak = 0;
  for (let offset = checkins[dayKey(new Date())] ? 0 : 1; checkins[dayKey(daysAgo(offset))]; offset += 1) streak += 1;
  return streak;
}

function longestCheckinStreak(checkins = {}) {
  const keys = Object.keys(checkins).sort();
  let best = 0;
  let run = 0;
  let previous = null;
  for (const key of keys) {
    const current = new Date(key);
    run = previous && (current - previous) / (DAY * 1000) <= 1.01 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = current;
  }
  return best;
}

export function dailyQuests(analytics) {
  const today = dayKey(new Date());
  const checkin = analytics.checkins?.[today];
  let wroteToday = false;
  try {
    wroteToday = localStorage.getItem("reso:lastMessageDay") === today;
  } catch {
    // storage unavailable
  }
  return [
    { id: "pledge", icon: "🤝", label: "Tagesversprechen geben", done: Boolean(checkin?.pledge), action: "checkin" },
    { id: "gratitude", icon: "🙏", label: "Etwas Dankbares notieren", done: Boolean(checkin?.gratitude), action: "checkin" },
    { id: "focus", icon: "⏱️", label: "10 Minuten Fokus", done: (Number(analytics.dailyActivity?.[today]) || 0) >= 10, action: "timer" },
    { id: "community", icon: "💬", label: "Jemandem Mut machen", done: wroteToday, action: "community" },
  ];
}

export function personalRecords(analytics) {
  const activity = Object.values(analytics.dailyActivity || {}).map(Number);
  const wavesByDay = {};
  for (const wave of survivedWaves(analytics)) {
    const key = String(wave.start).slice(0, 10);
    wavesByDay[key] = (wavesByDay[key] || 0) + 1;
  }
  return [
    { icon: "🔥", label: "Längste Serie", value: Math.max(Number(analytics.longestStreak) || 0, Math.floor(soberSeconds(analytics.streakStart) / DAY)), unit: "Tage" },
    { icon: "⏱️", label: "Meiste Fokuszeit an einem Tag", value: Math.max(0, ...activity), unit: "Min." },
    { icon: "🌊", label: "Wellen an einem Tag besiegt", value: Math.max(0, ...Object.values(wavesByDay)), unit: "" },
    { icon: "📅", label: "Längste Check-in-Serie", value: longestCheckinStreak(analytics.checkins), unit: "Tage" },
  ];
}

// 12 weeks ending today: one cell per day, Monday first.
export function successCalendar(analytics) {
  const start = analytics.streakStart ? new Date(analytics.streakStart) : null;
  const relapseDays = new Set((analytics.relapses || []).map((value) => String(value).slice(0, 10)));
  const today = new Date();
  const offset = (today.getDay() + 6) % 7;
  const cells = [];
  for (let index = 83 + offset - 6; index >= -(6 - offset); index -= 1) {
    const date = daysAgo(index);
    const key = dayKey(date);
    let state = "none";
    if (index < 0) state = "future";
    else if (relapseDays.has(key)) state = "relapse";
    else if (start && date >= new Date(start.toDateString())) state = (Number(analytics.dailyIncidents?.[key]) || 0) > 0 ? "hard" : "free";
    cells.push({ key, date, state, mood: analytics.checkins?.[key]?.mood || 0 });
  }
  return cells.slice(-84);
}
