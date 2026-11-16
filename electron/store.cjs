// Local data store. Same file and schema the former Python backend used,
// so existing progress is picked up unchanged.
const fs = require("node:fs");
const path = require("node:path");

const DEFAULTS = () => ({
  timer_activations: 0,
  total_focus_minutes: 0,
  habits_prevented: 0,
  streak: 0,
  longest_streak: 0,
  streak_start_iso: null,
  last_active_date: null,
  trigger_words: ["casino", "porno", "gambling"],
  trigger_stats: {},
  daily_activity: {},
  daily_moods: {},
  savings_goal: { name: "Traum-Erfüllung", target_amount: 100.0 },
  stress_detection_enabled: false,
  weekday_hour_matrix: {},
  daily_incidents: {},
  incident_hours: {},
  relapse_reflections: [],
  hourly_rate: 25.0,
  daily_expense: 0,
  default_timer_mins: 25,
  shutdown_deadline_epoch: null,
  community_author_id: "",
  community_author_name: "",
});

class Store {
  constructor(directory) {
    this.file = path.join(directory, "stats_data.json");
    this.data = this.load();
  }

  load() {
    const defaults = DEFAULTS();
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, "utf8"));
      if (parsed && typeof parsed === "object") return { ...defaults, ...parsed };
    } catch (error) {
      if (error.code !== "ENOENT") {
        // keep a copy of an unreadable file instead of silently overwriting it
        try {
          fs.copyFileSync(this.file, `${this.file}.broken-${Date.now()}`);
        } catch {
          // nothing to preserve
        }
      }
    }
    return defaults;
  }

  // Write to a temp file and swap it in, so a crash never leaves half a file.
  save() {
    const temp = `${this.file}.tmp`;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const handle = fs.openSync(temp, "w");
    try {
      fs.writeSync(handle, JSON.stringify(this.data, null, 2));
      fs.fsyncSync(handle);
    } finally {
      fs.closeSync(handle);
    }
    fs.renameSync(temp, this.file);
  }
}

class MemoryStore {
  constructor(data = {}) {
    this.data = { ...DEFAULTS(), ...data };
    this.saves = 0;
  }

  save() {
    this.saves += 1;
  }
}

module.exports = { Store, MemoryStore, DEFAULTS };
