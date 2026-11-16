// Run with: node tests/test_faith.mjs
import assert from "node:assert/strict";
import { prayerTimes, nextPrayer, westernEaster, orthodoxEaster, hijri, holidays, churchSeason, qibla, dateKey, tzOffsetMinutes, ramadanInfo } from "../gui/faith/calc.js";

const berlin = { lat: 52.52, lng: 13.405, timeZone: "Europe/Berlin", method: "mwl", asr: "standard", highLat: "angle" };
const clock = (date) => new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }).format(date);

// equinox in Berlin: noon near 12:13 CET, ordered prayers
const march = prayerTimes({ y: 2025, m: 3, d: 21 }, berlin);
const order = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"].map((id) => march[id].getTime());
assert.deepEqual([...order].sort((a, b) => a - b), order);
assert.match(clock(march.dhuhr), /^12:1\d$/);
assert.match(clock(march.sunrise), /^06:0\d$/);
assert.match(clock(march.maghrib), /^18:2\d$/);

// Hanafi Asr is later
const hanafi = prayerTimes({ y: 2025, m: 3, d: 21 }, { ...berlin, asr: "hanafi" });
assert.ok(hanafi.asr - march.asr > 30 * 60000);

// midsummer: 18° never reached in Berlin – the high-latitude rule still gives valid times
const june = prayerTimes({ y: 2025, m: 6, d: 21 }, berlin);
assert.ok(june.fajr && june.isha && june.fajr < june.sunrise && june.isha > june.maghrib);
assert.match(clock(june.dhuhr), /^13:0\d$/); // summer time, solar noon ≈ 13:08

// other time zone, manual offsets
const istanbul = prayerTimes({ y: 2025, m: 3, d: 21 }, { lat: 41.01, lng: 28.98, timeZone: "Europe/Istanbul", method: "diyanet", adjust: { maghrib: 2 } });
assert.match(new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }).format(istanbul.dhuhr), /^13:1\d$/);
assert.equal(tzOffsetMinutes("Europe/Berlin", new Date("2025-07-01T12:00:00Z")), 120);

const next = nextPrayer(berlin, new Date("2025-03-21T23:30:00+01:00"));
assert.equal(next.id, "fajr");

// Easter
assert.deepEqual([2024, 2025, 2026, 2027].map((year) => dateKey(westernEaster(year))), ["2024-03-31", "2025-04-20", "2026-04-05", "2027-03-28"]);
assert.deepEqual([2024, 2025, 2026, 2027].map((year) => dateKey(orthodoxEaster(year))), ["2024-05-05", "2025-04-20", "2026-04-12", "2027-05-02"]);

// Hijri (Umm al-Qura)
assert.deepEqual([hijri(new Date(2025, 2, 1)).month, hijri(new Date(2025, 2, 1)).day], [9, 1]);
assert.equal(hijri(new Date(2025, 2, 1), -1).month, 8); // moon sighting adjustment
assert.ok(ramadanInfo(new Date(2025, 2, 10)));

// holidays per tradition
const sunni = holidays({ islam: true, islamTradition: "sunni-hanafi" }, new Date(2025, 0, 1), 365).map((event) => `${dateKey(event.date)} ${event.title}`);
assert.ok(sunni.includes("2025-03-30 Ramadanfest (ʿĪd al-Fitr)"));
assert.ok(sunni.includes("2025-06-06 Opferfest (ʿĪd al-Aḍḥā)"));
assert.ok(!sunni.some((item) => item.includes("Ghadīr")));
const shia = holidays({ islam: true, islamTradition: "shia-jafari" }, new Date(2025, 0, 1), 365).map((event) => event.title);
assert.ok(shia.includes("ʿĪd al-Ghadīr") && !shia.includes("Laylat al-Qadr (Kadir Gecesi)"));

const protestant = holidays({ christian: true, christianTradition: "protestant" }, new Date(2025, 0, 1), 365).map((event) => `${dateKey(event.date)} ${event.title}`);
assert.ok(protestant.includes("2025-10-31 Reformationstag"));
assert.ok(protestant.includes("2025-11-19 Buß- und Bettag"));
assert.ok(!protestant.some((item) => item.includes("Fronleichnam")));
const catholic = holidays({ christian: true, christianTradition: "catholic" }, new Date(2025, 0, 1), 365).map((event) => `${dateKey(event.date)} ${event.title}`);
assert.ok(catholic.includes("2025-06-19 Fronleichnam") && catholic.includes("2025-11-30 1. Advent"));
const orthodox = holidays({ christian: true, christianTradition: "orthodox" }, new Date(2025, 0, 1), 365).map((event) => `${dateKey(event.date)} ${event.title}`);
assert.ok(orthodox.includes("2025-01-07 Orthodoxes Weihnachtsfest") && orthodox.includes("2025-04-20 Pascha – Orthodoxes Osterfest"));
const both = holidays({ christian: true, islam: true, christianTradition: "catholic", islamTradition: "sunni-shafii" }, new Date(2025, 0, 1), 365);
assert.ok(both.some((event) => event.religion === "islam") && both.some((event) => event.religion === "christian"));

assert.equal(churchSeason(new Date(2025, 2, 10)).name, "Fastenzeit");
assert.equal(churchSeason(new Date(2025, 11, 1)).name, "Advent");
assert.ok(Math.abs(qibla(52.52, 13.405) - 136) < 2); // Berlin → about 136° (south-east)
// content of the "Wege" tools: complete and every reference points to a real chapter/verse
const content = await import("../gui/faith/content.js");
const data = await import("../gui/faith/data.js");
assert.equal(content.ASMA.length, 99);
assert.equal(content.STEPS.length, 12);
assert.equal(content.FREEDOM.length, 21);
const inRange = (target) => (target.surah
  ? target.surah >= 1 && target.surah <= 114 && (target.ayah || 1) <= data.SURAH_AYAHS[target.surah - 1]
  : target.book >= 1 && target.book <= 66 && target.chapter <= data.BIBLE_CHAPTERS[target.book - 1]);
for (const plan of content.PLANS) assert.ok(plan.days.every((day) => inRange(day.target)), plan.id);
for (const story of content.STORIES.filter((item) => item.target)) assert.ok(inRange(story.target), story.title);
for (const [, , book, chapter] of content.GOD_NAMES) assert.ok(inRange({ book, chapter }));
for (const religion of ["christian", "islam"]) {
  assert.ok(content.STORIES.some((story) => story.religion === religion));
  assert.ok(content.FAITH_HELP.some((item) => item.religion === religion));
  assert.ok(content.GUIDES.some((guide) => guide.religion === religion));
}
for (const emotion of content.EMOTIONS) for (const theme of emotion.themes) assert.ok(data.VERSES.some((verse) => verse.theme === theme && verse.religion === "islam") && data.VERSES.some((verse) => verse.theme === theme && verse.religion === "christian"), theme);
console.log("ok");
