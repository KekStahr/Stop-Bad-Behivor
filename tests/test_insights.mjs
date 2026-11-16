// Run with: node tests/test_insights.mjs
import assert from "node:assert/strict";
import { buildRiskModel, topWindows, upcomingRisk } from "../gui/insights.js";

const empty = buildRiskModel({});
assert.equal(empty.ready, false);
assert.equal(upcomingRisk(empty), null);

// Friday (4) 22:00 is clearly the hardest hour; Monday is quiet.
const model = buildRiskModel({
  weekdayHourMatrix: { 4: { 21: 2, 22: 8 }, 5: { 22: 3 }, 0: { 9: 1 } },
  dailyIncidents: { [new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10)]: 1 },
});
assert.equal(model.ready, true);
const [top] = topWindows(model, 3);
assert.deepEqual([top.day, top.hour], [4, 22]);
assert.ok(model.level(4, 22) > model.level(4, 21));
assert.ok(model.level(0, 9) < 0.33, "a single Monday alert is not high risk");
// relapses weigh more than reported cravings
const mixed = buildRiskModel({ cravingMatrix: { 2: { 18: 3 } }, relapseMatrix: { 1: { 20: 3 } } });
assert.equal(mixed.ready, true);
assert.deepEqual([topWindows(mixed, 1)[0].day, topWindows(mixed, 1)[0].hour], [1, 20]);
console.log("ok");

// context signals: long PC sessions before episodes teach the model a personal threshold
import { sessionThreshold, assessNow } from "../gui/insights.js";
const contexts = [200, 230, 250, 400].map((session) => ({ kind: "trigger", session, hour: 21 }));
assert.deepEqual(sessionThreshold(contexts), { minutes: 230, learned: true, samples: 4 });
assert.equal(sessionThreshold([{ kind: "trigger", session: 300 }]).learned, false);
const calm = assessNow({ aiContexts: contexts, streakStart: "2020-01-01T00:00:00" }, { sessionMinutes: 30 }, new Date("2026-11-16T15:00:00"));
const tense = assessNow({ aiContexts: contexts, streakStart: "2020-01-01T00:00:00" }, { sessionMinutes: 220 }, new Date("2026-11-16T15:00:00"));
assert.ok(tense.score > calm.score && tense.reasons.some((reason) => reason.icon === "💻"));
console.log("ok");
