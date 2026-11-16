// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createCore, localIso } = require("../electron/core.cjs");
const { MemoryStore } = require("../electron/store.cjs");
const { createMonitor } = require("../electron/monitor.cjs");

function setup(data = {}) {
  let clock = new Date("2026-11-16T12:00:00");
  const store = new MemoryStore(data);
  const fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({}) });
  const core = createCore({ store, fetchImpl, now: () => clock });
  return { store, core, call: (method, path, body) => core.handle(method, path, body), tick: (minutes) => { clock = new Date(clock.getTime() + minutes * 60000); } };
}

test("settings are validated and saved", async () => {
  const { call, store } = setup();
  const ok = await call("POST", "/api/settings", { hourlyRate: 30, communityName: "  Neuer   Weg ", streakStart: "2026-11-10T08:00" });
  assert.equal(ok.status, 200);
  assert.equal(store.data.community_author_name, "Neuer Weg");
  assert.equal(store.data.streak_start_iso, "2026-11-10T08:00:00");
  assert.equal((await call("POST", "/api/settings", { streakStart: "2999-01-01T00:00" })).status, 400);
  assert.equal((await call("POST", "/api/settings", { hourlyRate: true })).status, 400);
  assert.equal((await call("POST", "/api/settings", { triggerWords: [] })).status, 400);
});

test("emergency contact never ends up in the synced preferences", async () => {
  const { call, store } = setup();
  const prefs = { theme: "dark", contactName: "Mama", contactPhone: "0151 123" };
  await call("POST", "/api/preferences", { prefs });
  assert.equal("contactPhone" in store.data.web_ui_prefs, false);
  assert.deepEqual((await call("GET", "/api/preferences")).body.prefs, prefs);
  for (const bad of [{ "bad key": 1 }, { x: [1] }, { x: "a".repeat(601) }, { x: Number.NaN }]) {
    assert.equal((await call("POST", "/api/preferences", { prefs: bad })).status, 400);
  }
});

test("a wave only counts after 15 minutes and without a trigger", async () => {
  const { call, core, store, tick } = setup();
  await call("POST", "/api/wave", { action: "start" });
  assert.equal((await call("POST", "/api/wave", { action: "complete" })).status, 400);
  tick(16);
  const done = await call("POST", "/api/wave", { action: "complete" });
  assert.equal(done.body.survived.status, "survived");
  assert.equal(store.data.habits_prevented, 1);

  await call("POST", "/api/wave", { action: "start" });
  tick(1);
  core.recordTrigger("casino"); // relapse-like moment during the wave
  tick(16);
  assert.equal((await call("POST", "/api/wave", { action: "complete" })).status, 400);
  assert.equal(store.data.craving_waves.at(0).status, "voided"); // same day → the earlier wave no longer counts either
  assert.equal(store.data.trigger_stats.casino, 1);
});

test("relapse only when the user says so", async () => {
  const { call, store } = setup();
  await call("POST", "/api/streak/reset", {});
  assert.equal(store.data.relapses, undefined);
  await call("POST", "/api/streak/reset", { relapse: true });
  assert.equal(store.data.relapses.length, 1);
});

test("check-ins, capsules and rewards are validated", async () => {
  const { call } = setup();
  assert.equal((await call("POST", "/api/checkin", { mood: 4, craving: 2, pledge: true })).body.checkin.mood, 4);
  assert.equal((await call("POST", "/api/checkin", { mood: 0, craving: 1 })).status, 400);
  const capsules = (await call("POST", "/api/capsules", { action: "create", text: "Hallo Zukunft", openAt: "2026-12-01" })).body.capsules;
  assert.equal(capsules[0].ready, false);
  assert.equal(capsules[0].text, ""); // sealed
  assert.equal((await call("POST", "/api/capsules", { action: "open", id: capsules[0].id })).status, 400);
  assert.equal((await call("POST", "/api/rewards", { rewards: [{ name: "Konzert", price: 80 }] })).body.rewards[0].emoji, "🎁");
  assert.equal((await call("POST", "/api/rewards", { rewards: [{ name: "x", price: -1 }] })).status, 400);
});

test("only http(s) links may be opened", async () => {
  const opened = [];
  const store = new MemoryStore();
  const core = createCore({ store, host: { openExternal: async (url) => opened.push(url) }, fetchImpl: async () => ({ ok: true, json: async () => ({}) }) });
  assert.equal((await core.handle("POST", "/api/app/open-external", { url: "file:///C:/Windows" })).status, 400);
  assert.equal((await core.handle("POST", "/api/app/open-external", { url: "https://example.com" })).status, 200);
  assert.deepEqual(opened, ["https://example.com/"]);
});

test("localIso keeps the stored, timezone-less format", () => {
  assert.equal(localIso(new Date("2026-01-02T03:04:05")), "2026-01-02T03:04:05");
});

test("keyboard monitor finds trigger words and very fast typing", () => {
  const found = [];
  let stressed = 0;
  const monitor = createMonitor({ onTrigger: (word) => found.push(word), onStress: () => { stressed += 1; } });
  monitor.configure({ triggerWords: ["casino"], stressDetection: true });
  let at = 1000;
  for (const character of "online casino") monitor.handleChar(character, (at += 30));
  assert.deepEqual(found, ["casino"]);
  assert.equal(stressed, 0); // 13 keys → not yet 15
  for (const character of "abcdef") monitor.handleChar(character, (at += 30));
  assert.equal(stressed, 1);
  for (const character of "abcdefghijklmnopq") monitor.handleChar(character, (at += 30));
  assert.equal(stressed, 1, "at most one warning per minute");
});

test("faith data is only stored sealed and never backed up", async () => {
  const fs = require("node:fs");
  const os = require("node:os");
  const path = require("node:path");
  const { createSealer } = require("../electron/seal.cjs");
  const sealer = createSealer({ safeStorage: null, directory: fs.mkdtempSync(path.join(os.tmpdir(), "reso-seal-")) });
  const store = new MemoryStore();
  const core = createCore({ store, host: { seal: sealer.seal, unseal: sealer.unseal }, fetchImpl: async () => ({ ok: true, json: async () => ({}) }) });
  assert.equal((await core.handle("GET", "/api/faith")).body.state, null);
  await core.handle("POST", "/api/faith", { state: { religions: ["islam", "christian"], journal: [{ text: "Danke, Gott" }] } });
  assert.ok(store.data.faith_sealed.startsWith("gcm:"));
  assert.ok(!JSON.stringify(store.data).includes("Danke"));
  assert.deepEqual((await core.handle("GET", "/api/faith")).body.state.religions, ["islam", "christian"]);
  assert.equal((await core.handle("POST", "/api/faith", { state: [1] })).status, 400);
  await core.handle("POST", "/api/faith", { state: null });
  assert.equal(store.data.faith_sealed, undefined);
});

test("energy saver is on by default and can be switched off", async () => {
  const store = new MemoryStore();
  const core = createCore({ store, fetchImpl: async () => ({ ok: true, json: async () => ({}) }) });
  assert.equal((await core.handle("GET", "/api/settings")).body.energySaver, true);
  await core.handle("POST", "/api/settings", { energySaver: false });
  assert.equal(store.data.energy_saver, false);
  assert.equal((await core.handle("GET", "/api/settings")).body.energySaver, false);
  assert.equal((await core.handle("POST", "/api/settings", { energySaver: "nein" })).status, 400);
});
