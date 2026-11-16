// Reminders for prayer times (Islam) and daily prayers / Sunday service (Christianity).
// Runs in the background while Reşo sits in the tray.
import { notify, chime } from "../ui.js";
import { faith, loadFaith, activeReligions, prayerConfig, todayKey } from "./state.js";
import { prayerTimes, ymdIn, formatClock, PRAYERS } from "./calc.js";

const fired = new Set();

function once(key, action) {
  if (fired.has(key)) return;
  fired.add(key);
  if (fired.size > 500) fired.clear();
  action();
}

function remind(title, body, showToast) {
  chime("message");
  notify(`Reşo · ${title}`, body);
  showToast?.(`${title} – ${body}`);
}

export function checkReminders(now = new Date(), showToast) {
  const current = faith();
  const religions = activeReligions(current, now);
  if (!religions.length) return;
  const minute = (date) => Math.floor(date.getTime() / 60000);
  const today = todayKey(now);

  if (religions.includes("islam") && current.prayerReminders) {
    const config = prayerConfig(current);
    if (config) {
      const times = prayerTimes(ymdIn(config.timeZone, now), config);
      const lead = Number(current.reminderLead) || 0;
      const wanted = String(current.remindPrayers).split(",");
      for (const prayer of PRAYERS) {
        const at = times[prayer.id];
        if (!at || prayer.noPrayer || !wanted.includes(prayer.id)) continue;
        if (minute(now) === minute(at) - lead) {
          once(`${today}:${prayer.id}`, () => remind(
            lead ? `${prayer.label} in ${lead} Minuten` : `Zeit für ${prayer.label}`,
            `${prayer.hint} um ${formatClock(at, config.timeZone)}. Eine kleine Pause für dein Herz.`,
            showToast,
          ));
        }
      }
      const friday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: config.timeZone }).format(now) === "Fri";
      if (current.jumuah && friday && times.dhuhr && minute(now) === minute(times.dhuhr) - 45) {
        once(`${today}:jumuah`, () => remind("Freitagsgebet", "Heute ist Dschumuʿa – das gemeinsame Gebet beginnt bald.", showToast));
      }
    }
  }

  if (religions.includes("christian") && current.christianReminders) {
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    if (hhmm === current.morningPrayer) once(`${today}:morning`, () => remind("Morgengebet", "Ein guter Moment, den Tag in Gottes Hände zu legen.", showToast));
    if (hhmm === current.eveningPrayer) once(`${today}:evening`, () => remind("Abendgebet", "Danke sagen, loslassen, zur Ruhe kommen.", showToast));
    if (current.angelus && ["06:00", "12:00", "18:00"].includes(hhmm)) once(`${today}:angelus:${hhmm}`, () => remind("Angelus", "Der Engel des Herrn brachte Maria die Botschaft …", showToast));
    if (current.sundayService && now.getDay() === 0) {
      const [h, m] = String(current.sundayTime || "10:00").split(":").map(Number);
      const before = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m - 45);
      if (minute(now) === minute(before)) once(`${today}:service`, () => remind("Gottesdienst", `Heute um ${current.sundayTime} – Gemeinschaft tut gut.`, showToast));
    }
  }
}

export function startFaithReminders({ showToast }) {
  loadFaith().catch(() => {});
  const tick = () => {
    try {
      checkReminders(new Date(), showToast);
    } catch {
      // never break the app because of a reminder
    }
  };
  setInterval(tick, 20000);
  setTimeout(tick, 5000);
}
