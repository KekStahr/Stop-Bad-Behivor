// The app's local API (formerly the Python backend). Pure Node: everything that needs
// Electron (tray, windows, safeStorage, autostart) is injected through `host`.
const crypto = require("node:crypto");

const SERVER = (process.env.RESO_SERVER_URL || "https://stop-bad-behivor-q1d4.onrender.com").replace(/\/+$/, "");
const WAVE_MINUTES = 15;
const SOCIAL_ACTIONS = new Set(["sync", "friends", "messages", "block", "report", "react", "challenges", "help"]);
const CONTACT_KEYS = ["contactName", "contactPhone"];
const PREFERENCE_KEY = /^[a-zA-Z][a-zA-Z0-9]{0,39}$/;
const ISO_LOCAL = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/;
const TIME_ZONE = /^[A-Za-z_+\-/0-9]{1,64}$/;
const OAUTH_CLIENT_ID = /^[0-9A-Za-z_\-.]{8,200}\.apps\.googleusercontent\.com$/;
// Never uploaded to the cloud backup.
const PRIVATE_BACKUP_KEYS = new Set([
  "account_id", "google_account_email", "cloud_backup_initialized", "cloud_backup_dirty", "google_refresh_token_enc",
  "pin_code", "webhook_url", "last_trigger_at", "last_trigger_category", "reframing_entries", "emotion_stats",
  "weekday_hour_matrix", "daily_incidents", "relapse_reflections", "shadow_letter", "stress_detection_enabled",
  "shutdown_deadline_epoch", "community_author_id", "community_author_name", "emergency_contact",
  "google_calendar_events", "google_calendar_enabled", "google_oauth_client", "relapse_matrix",
  "ai_contexts", "computer_usage", "faith_sealed",
]);

class UserError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const pad = (value) => String(value).padStart(2, "0");
const dayKey = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
// Local, timezone-less ISO string – the format the stored data has always used.
const localIso = (date = new Date()) => `${dayKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
const pyWeekday = (date) => (date.getDay() + 6) % 7;
const isPrintable = (text, allowed = "") => [...text].every((character) => {
  const code = character.codePointAt(0);
  return allowed.includes(character) || (code >= 32 && code !== 127 && !(code >= 0x80 && code < 0xa0));
});
const number = (value, label, min, max) => {
  if (typeof value === "boolean" || value === null || value === "" || !Number.isFinite(Number(value))) throw new UserError(`${label} muss eine gültige Zahl sein.`);
  const result = Number(value);
  if (result < min || result > max) throw new UserError(`${label} muss zwischen ${min} und ${max} liegen.`);
  return result;
};
const bump = (object, key, amount = 1) => { object[key] = (object[key] || 0) + amount; };

function createCore({ store, host = {}, fetchImpl = globalThis.fetch, now = () => new Date() }) {
  const data = () => store.data;
  const save = () => {
    const values = data();
    if (values.account_id && values.cloud_backup_initialized) values.cloud_backup_dirty = true;
    store.save();
    scheduleCloud();
  };

  // ---- network ------------------------------------------------------------------
  async function request(url, { method = "GET", body, headers = {}, timeout = 8000 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetchImpl(url, {
        method,
        headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      let payload = {};
      try {
        payload = await response.json();
      } catch {
        payload = {};
      }
      return { ok: response.ok, status: response.status, payload };
    } finally {
      clearTimeout(timer);
    }
  }

  let cloudTimer = null;
  let lastStatsSync = 0;
  function scheduleCloud() {
    // public leaderboard numbers, at most every 10 minutes
    if (Date.now() - lastStatsSync > 10 * 60000) {
      lastStatsSync = Date.now();
      const values = data();
      const identity = ensureIdentity();
      request(`${SERVER}/sync`, {
        method: "POST",
        body: {
          username: `u-${crypto.createHash("sha256").update(identity.id).digest("hex").slice(0, 16)}`,
          streak: Math.floor(soberDays()),
          longest_streak: Math.max(values.longest_streak || 0, Math.floor(soberDays())),
          total_focus_minutes: values.total_focus_minutes || 0,
          habits_prevented: values.habits_prevented || 0,
        },
        timeout: 5000,
      }).catch(() => {});
    }
    if (data().account_id && host.google) {
      clearTimeout(cloudTimer);
      cloudTimer = setTimeout(() => uploadBackup().catch(() => {}), 15000);
    }
  }

  // ---- identity -------------------------------------------------------------------
  function ensureIdentity() {
    const values = data();
    let changed = false;
    if (!/^[0-9a-f]{32}$/.test(values.community_author_id || "")) {
      values.community_author_id = crypto.randomBytes(16).toString("hex");
      changed = true;
    }
    if (!values.community_author_name?.trim()) {
      values.community_author_name = `Gast-${values.community_author_id.slice(0, 6)}`;
      changed = true;
    }
    if (changed) store.save();
    return { id: values.community_author_id, name: values.community_author_name };
  }

  // ---- streak & stats -------------------------------------------------------------
  const soberSeconds = () => {
    const start = Date.parse(data().streak_start_iso || "");
    return Number.isFinite(start) ? Math.max(0, (now().getTime() - start) / 1000) : 0;
  };
  const soberDays = () => soberSeconds() / 86400;

  function savings() {
    const values = data();
    const minutes = (values.total_focus_minutes || 0) + (values.habits_prevented || 0) * 20;
    const hours = Math.round((minutes / 60) * 10) / 10;
    return [hours, Math.round(hours * Number(values.hourly_rate ?? 25) * 100) / 100];
  }

  function savingsGoal() {
    const goal = data().savings_goal || {};
    const target = Number(goal.target_amount) > 0 ? Number(goal.target_amount) : 100;
    const saved = Math.round(soberDays() * Number(data().daily_expense || 0) * 100) / 100;
    return { name: String(goal.name || "Traum-Erfüllung"), target, saved, progress: Math.min(100, Math.round((saved / target) * 1000) / 10) };
  }

  function rank() {
    const days = Math.floor(soberDays());
    if (days >= 30) return "👑 Meister der inneren Zitadelle";
    if (days >= 21) return "⚔️ Schatten-Krieger";
    if (days >= 14) return "🛡️ Fokus-Wächter";
    if (days >= 7) return "⚡ Disziplin-Novize";
    return "🌱 Willens-Anwärter";
  }

  function updateStreak() {
    const values = data();
    const days = Math.floor(soberDays());
    values.streak = days;
    if (days > (values.longest_streak || 0)) values.longest_streak = days;
    values.last_active_date = dayKey(now());
  }

  // Snapshot of the moment for the early-warning model: when, how long at the PC,
  // how the night was and how the person felt (research: craving, mood, sleep, time).
  function captureContext(kind) {
    const values = data();
    const at = now();
    const usage = host.usage ? host.usage() : {};
    const checkins = values.daily_checkins || {};
    const recent = checkins[dayKey(at)] || checkins[dayKey(new Date(at.getTime() - 86400000))] || {};
    values.ai_contexts = [...(values.ai_contexts || []), {
      t: localIso(at),
      kind,
      hour: at.getHours(),
      weekday: pyWeekday(at),
      session: usage.sessionMinutes || 0,
      night: usage.lastNightMinutes || 0,
      mood: recent.mood ?? null,
      craving: recent.craving ?? null,
      day: Math.floor(soberDays()),
    }].slice(-400);
  }

  function voidWavesToday(reason) {
    const today = dayKey(now());
    for (const wave of data().craving_waves || []) {
      if (wave && String(wave.start || "").slice(0, 10) === today && ["active", "survived"].includes(wave.status)) {
        wave.status = "voided";
        wave.voided_by = reason;
      }
    }
  }

  // Called by the keyboard monitor when a trigger word was typed.
  function recordTrigger(word) {
    const values = data();
    const at = now();
    bump(values, "habits_prevented");
    if (word) {
      values.trigger_stats ||= {};
      bump(values.trigger_stats, word);
    }
    values.incident_hours ||= {};
    bump(values.incident_hours, `${pad(at.getHours())}:00 Uhr`);
    values.weekday_hour_matrix ||= {};
    values.weekday_hour_matrix[String(pyWeekday(at))] ||= {};
    bump(values.weekday_hour_matrix[String(pyWeekday(at))], String(at.getHours()));
    values.daily_incidents ||= {};
    bump(values.daily_incidents, dayKey(at));
    values.last_trigger_at = localIso(at);
    captureContext("trigger");
    voidWavesToday("trigger");
    updateStreak();
    save();
  }

  function recordRelapse() {
    const values = data();
    const at = now();
    values.relapses = [...(values.relapses || []), localIso(at)].slice(-500);
    values.relapse_matrix ||= {};
    values.relapse_matrix[String(pyWeekday(at))] ||= {};
    bump(values.relapse_matrix[String(pyWeekday(at))], String(at.getHours()));
    captureContext("relapse");
    voidWavesToday("relapse");
  }

  function addTimerSession(minutes) {
    const values = data();
    bump(values, "timer_activations");
    bump(values, "total_focus_minutes", minutes);
    values.daily_activity ||= {};
    bump(values.daily_activity, dayKey(now()), minutes);
    updateStreak();
    save();
  }

  // ---- focus timer ------------------------------------------------------------------
  let timer = null;
  const timerState = () => ({
    running: Boolean(timer),
    remainingSeconds: timer ? Math.max(0, Math.round((timer.endAt - Date.now()) / 1000)) : 0,
    durationMinutes: timer?.minutes || 0,
  });
  function startTimer(minutes) {
    if (timer) throw new UserError("Es läuft bereits ein Fokus-Timer.", 409);
    const handle = setTimeout(() => {
      timer = null;
      addTimerSession(minutes);
      host.emit?.("timer-finished", { minutes });
    }, minutes * 60000);
    timer = { minutes, endAt: Date.now() + minutes * 60000, handle };
  }
  function stopTimer() {
    if (timer) clearTimeout(timer.handle);
    timer = null;
  }

  // ---- settings ---------------------------------------------------------------------
  function settingsState() {
    const values = data();
    const goal = values.savings_goal || {};
    return {
      hourlyRate: Number(values.hourly_rate ?? 25),
      dailyExpense: Number(values.daily_expense || 0),
      defaultTimer: values.default_timer_mins || 25,
      goalName: goal.name || "Traum-Erfüllung",
      goalAmount: Number(goal.target_amount || 100),
      triggerWords: values.trigger_words || [],
      stressDetection: Boolean(values.stress_detection_enabled),
      communityName: values.community_author_name || "",
      streakStart: values.streak_start_iso || null,
      autostart: host.getAutostart ? host.getAutostart() : false,
      energySaver: values.energy_saver !== false,
      monitorAvailable: host.monitorAvailable ? host.monitorAvailable() : false,
    };
  }

  function saveSettings(body) {
    const values = data();
    const updates = {};
    if ("hourlyRate" in body) updates.hourly_rate = number(body.hourlyRate, "Stundensatz", 0, 10000);
    if ("dailyExpense" in body) updates.daily_expense = number(body.dailyExpense, "Tagesausgaben", 0, 1000000);
    if ("defaultTimer" in body) {
      const minutes = body.defaultTimer;
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) throw new UserError("Der Standard-Timer muss zwischen 1 und 180 Minuten liegen.");
      updates.default_timer_mins = minutes;
    }
    if ("savingsGoal" in body) {
      const goal = body.savingsGoal;
      if (!goal || typeof goal !== "object" || typeof goal.name !== "string" || !goal.name.trim()) throw new UserError("Bitte gib deinem Sparziel einen Namen.");
      updates.savings_goal = { name: goal.name.trim().slice(0, 80), target_amount: number(goal.amount, "Sparziel", 0.01, 100000000) };
    }
    if ("triggerWords" in body) {
      const words = body.triggerWords;
      if (!Array.isArray(words) || words.length < 1 || words.length > 2000) throw new UserError("Bitte gib 1 bis 2000 Trigger-Wörter an.");
      const cleaned = [];
      for (const word of words) {
        if (typeof word !== "string") throw new UserError("Trigger-Wörter müssen Text sein.");
        const value = word.trim().toLowerCase();
        if (value.length < 2 || value.length > 40 || !isPrintable(value)) throw new UserError("Trigger-Wörter müssen 2 bis 40 druckbare Zeichen enthalten.");
        if (!cleaned.includes(value)) cleaned.push(value);
      }
      updates.trigger_words = cleaned;
    }
    if ("stressDetection" in body) {
      if (typeof body.stressDetection !== "boolean") throw new UserError("Die Stress-Erkennung muss ein Wahr/Falsch-Wert sein.");
      updates.stress_detection_enabled = body.stressDetection;
    }
    if ("communityName" in body) {
      const name = String(body.communityName ?? "").split(/\s+/).filter(Boolean).join(" ");
      if (typeof body.communityName !== "string" || name.length < 1 || name.length > 32 || !isPrintable(name)) throw new UserError("Der Community-Name muss 1 bis 32 Zeichen enthalten.");
      updates.community_author_name = name;
    }
    if (body.streakStart) {
      const start = new Date(String(body.streakStart));
      if (typeof body.streakStart !== "string" || !ISO_LOCAL.test(body.streakStart) || Number.isNaN(start.getTime())) throw new UserError("Das Startdatum hat ein ungültiges Format.");
      if (start > now()) throw new UserError("Das Startdatum darf nicht in der Zukunft liegen.");
      updates.streak_start_iso = localIso(start);
    }
    if ("energySaver" in body) {
      if (typeof body.energySaver !== "boolean") throw new UserError("Energiesparmodus muss ein Wahr/Falsch-Wert sein.");
      values.energy_saver = body.energySaver; // takes effect after a restart (graphics are set up at start)
    }
    if ("autostart" in body) {
      if (typeof body.autostart !== "boolean") throw new UserError("Autostart muss ein Wahr/Falsch-Wert sein.");
      host.setAutostart?.(body.autostart);
    }
    Object.assign(values, updates);
    if (updates.streak_start_iso) updateStreak();
    save();
    if (updates.trigger_words || "stress_detection_enabled" in updates) host.monitorChanged?.();
    return settingsState();
  }

  function cleanPreferences(prefs) {
    if (!prefs || typeof prefs !== "object" || Array.isArray(prefs) || Object.keys(prefs).length > 120) throw new UserError("Die Einstellungen haben ein ungültiges Format.");
    const cleaned = {};
    for (const [key, value] of Object.entries(prefs)) {
      if (!PREFERENCE_KEY.test(key)) throw new UserError("Ungültiger Einstellungsname.");
      if (typeof value === "boolean") cleaned[key] = value;
      else if (typeof value === "number") {
        if (!Number.isFinite(value)) throw new UserError(`${key} muss eine gültige Zahl sein.`);
        cleaned[key] = value;
      } else if (typeof value === "string") {
        if (value.length > 600 || !isPrintable(value, "\n\t")) throw new UserError(`${key} ist zu lang oder enthält ungültige Zeichen.`);
        cleaned[key] = value;
      } else throw new UserError(`${key} hat einen ungültigen Typ.`);
    }
    return cleaned;
  }

  // ---- check-in, waves, capsules, rewards ----------------------------------------------
  function cleanCheckin(body) {
    const entry = {};
    for (const [key, low, high] of [["mood", 1, 5], ["craving", 0, 5]]) {
      if (!Number.isInteger(body[key]) || body[key] < low || body[key] > high) throw new UserError(`${key} muss zwischen ${low} und ${high} liegen.`);
      entry[key] = body[key];
    }
    if ("pledge" in body && typeof body.pledge !== "boolean") throw new UserError("Das Tagesversprechen muss ein Wahr/Falsch-Wert sein.");
    entry.pledge = Boolean(body.pledge);
    for (const key of ["gratitude", "note"]) {
      const text = body[key] ?? "";
      if (typeof text !== "string" || text.length > 500 || !isPrintable(text, "\n")) throw new UserError("Notizen dürfen höchstens 500 Zeichen enthalten.");
      entry[key] = text.trim();
    }
    entry.time = `${pad(now().getHours())}:${pad(now().getMinutes())}`;
    return entry;
  }

  function activeWave() {
    const waves = data().craving_waves || [];
    const wave = waves.at(-1);
    if (!wave || wave.status !== "active") return null;
    const start = Date.parse(wave.start);
    if (!Number.isFinite(start)) return null;
    if (now().getTime() - start > 6 * 3600000) { // a wave may cross midnight
      wave.status = "expired";
      return null;
    }
    return { ...wave, elapsedSeconds: Math.floor((now().getTime() - start) / 1000) };
  }

  function waveAction(action) {
    const values = data();
    values.craving_waves ||= [];
    const waves = values.craving_waves;
    const active = activeWave();
    const at = now();
    if (action === "start") {
      if (!active) {
        waves.push({ id: at.getTime(), start: localIso(at), status: "active" });
        values.craving_waves = waves.slice(-500);
        values.craving_matrix ||= {};
        values.craving_matrix[String(pyWeekday(at))] ||= {};
        bump(values.craving_matrix[String(pyWeekday(at))], String(at.getHours()));
        captureContext("craving");
        save();
      }
      return { wave: activeWave(), minutes: WAVE_MINUTES };
    }
    if (action === "cancel") {
      if (active) {
        waves.at(-1).status = "cancelled";
        save();
      }
      return { wave: null, minutes: WAVE_MINUTES };
    }
    if (action === "complete") {
      if (!active) throw new UserError("Es läuft gerade keine Welle.");
      const left = WAVE_MINUTES * 60 - active.elapsedSeconds;
      if (left > 0) throw new UserError(`Noch ${Math.floor(left / 60) + 1} Minuten – du schaffst das.`);
      if (typeof values.last_trigger_at === "string" && values.last_trigger_at >= active.start) {
        waves.at(-1).status = "voided";
        save();
        throw new UserError("Während dieser Welle wurde ein Auslöser erkannt – sie zählt leider nicht. Morgen ist ein neuer Tag.");
      }
      Object.assign(waves.at(-1), { status: "survived", end: localIso(at) });
      bump(values, "habits_prevented");
      save();
      return { wave: null, survived: waves.at(-1), minutes: WAVE_MINUTES };
    }
    throw new UserError("Unbekannte Aktion.");
  }

  function publicCapsules() {
    const today = dayKey(now());
    return (data().time_capsules || []).filter((capsule) => capsule && typeof capsule === "object").map((capsule) => {
      const ready = String(capsule.open_at || "") <= today;
      return { id: capsule.id, created: capsule.created, openAt: capsule.open_at, opened: Boolean(capsule.opened), ready, text: ready ? capsule.text || "" : "" };
    });
  }

  function capsuleAction(body) {
    const values = data();
    values.time_capsules ||= [];
    const capsules = values.time_capsules;
    if (body.action === "create") {
      if (typeof body.text !== "string" || body.text.trim().length < 1 || body.text.length > 3000) throw new UserError("Der Brief muss 1 bis 3000 Zeichen enthalten.");
      if (typeof body.openAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.openAt)) throw new UserError("Ungültiges Öffnungsdatum.");
      if (body.openAt <= dayKey(now())) throw new UserError("Das Öffnungsdatum muss in der Zukunft liegen.");
      if (capsules.length >= 50) throw new UserError("Du hast bereits 50 Zeitkapseln.");
      capsules.push({ id: now().getTime(), text: body.text.trim(), created: dayKey(now()), open_at: body.openAt, opened: false });
    } else if (["open", "delete"].includes(body.action)) {
      const match = capsules.find((capsule) => capsule?.id === body.id);
      if (!match) throw new UserError("Zeitkapsel nicht gefunden.");
      if (body.action === "open") {
        if (String(match.open_at) > dayKey(now())) throw new UserError("Diese Zeitkapsel ist noch versiegelt.");
        match.opened = true;
      } else capsules.splice(capsules.indexOf(match), 1);
    } else throw new UserError("Unbekannte Aktion.");
    save();
    return publicCapsules();
  }

  function cleanRewards(rewards) {
    if (!Array.isArray(rewards) || rewards.length > 30) throw new UserError("Höchstens 30 Belohnungen.");
    return rewards.map((item, index) => {
      if (!item || typeof item !== "object") throw new UserError("Ungültige Belohnung.");
      const name = typeof item.name === "string" ? item.name.trim() : "";
      if (name.length < 1 || name.length > 60 || !isPrintable(name)) throw new UserError("Der Name einer Belohnung muss 1 bis 60 Zeichen haben.");
      if (typeof item.price !== "number" || !Number.isFinite(item.price) || item.price <= 0 || item.price > 10000000) throw new UserError("Der Preis muss größer als 0 sein.");
      if (item.redeemed != null && (typeof item.redeemed !== "string" || item.redeemed.length > 32)) throw new UserError("Ungültiges Einlöse-Datum.");
      const emoji = typeof item.emoji === "string" && item.emoji.length >= 1 && item.emoji.length <= 8 ? item.emoji : "🎁";
      return { id: Number(item.id) || index + 1, name, emoji, price: item.price, redeemed: item.redeemed ?? null };
    });
  }

  // ---- community --------------------------------------------------------------------
  async function social(action, body) {
    if (!SOCIAL_ACTIONS.has(action)) throw new UserError("Unbekannter API-Endpunkt.", 404);
    const identity = ensureIdentity();
    let result;
    try {
      result = await request(`${SERVER}/community/social/${action}`, {
        method: "POST",
        body: { ...body, author_id: identity.id, author_name: identity.name },
        timeout: 12000,
      });
    } catch {
      throw new UserError("Community-Server nicht erreichbar. Prüfe deine Internetverbindung.", 503);
    }
    if (result.ok) return result.payload;
    let detail = typeof result.payload?.detail === "string" ? result.payload.detail : null;
    if (result.status === 404 && (!detail || detail === "Not Found")) {
      detail = "Der Community-Server ist noch nicht auf dem neuesten Stand. Bitte den Server neu deployen.";
    }
    throw new UserError(detail || "Der Community-Server hat einen Fehler gemeldet.", result.status >= 400 && result.status < 500 ? result.status : 502);
  }

  async function communityOverview() {
    const [stats, board] = await Promise.all([
      request(`${SERVER}/community`, { timeout: 6000 }).catch(() => null),
      request(`${SERVER}/community/leaderboard`, { timeout: 6000 }).catch(() => null),
    ]);
    return { stats: stats?.ok ? stats.payload : null, leaderboard: board?.ok && Array.isArray(board.payload.leaderboard) ? board.payload.leaderboard : [] };
  }

  // Fresh tips and community numbers from the server, at most every 30 minutes.
  async function insights() {
    const values = data();
    const cached = values.ai_remote;
    if (!cached || Date.now() - (cached.fetchedAt || 0) > 30 * 60000) {
      try {
        const result = await request(`${SERVER}/community/insights`, { timeout: 6000 });
        if (result.ok) {
          values.ai_remote = { ...result.payload, fetchedAt: Date.now() };
          store.save();
        }
      } catch {
        // offline: keep the last known data
      }
    }
    return values.ai_remote || { tips: [], config: {}, community: {} };
  }

  async function quotes() {
    const values = data();
    try {
      const result = await request(`${SERVER}/community/quotes`, { timeout: 5000 });
      if (result.ok && Array.isArray(result.payload.quotes)) {
        values.quote_cache = result.payload.quotes.slice(0, 500);
        store.save();
      }
    } catch {
      // offline: use the cached list
    }
    return { quotes: Array.isArray(values.quote_cache) ? values.quote_cache : [] };
  }

  // ---- Google account, backup, calendar --------------------------------------------------
  let accountJob = { state: "idle", message: "" };
  const google = host.google;
  function accountStatus() {
    const values = data();
    return {
      configured: Boolean(google?.clientId()),
      connected: Boolean(values.account_id),
      email: values.google_account_email || "",
      calendar: Boolean(values.google_calendar_enabled),
      calendarEvents: Object.fromEntries(Object.entries(values.google_calendar_events || {}).map(([kind, ids]) => [kind, ids.length])),
      state: accountJob.state,
      message: accountJob.message,
    };
  }

  function backupPayload() {
    return Object.fromEntries(Object.entries(data()).filter(([key]) => !PRIVATE_BACKUP_KEYS.has(key)));
  }

  async function uploadBackup() {
    const token = await google.accessToken();
    const result = await request(`${SERVER}/user/backup`, { method: "POST", body: { stats_data: backupPayload() }, headers: { Authorization: `Bearer ${token}` }, timeout: 15000 });
    if (!result.ok) throw new Error(result.payload?.detail || `Sicherung fehlgeschlagen (${result.status}).`);
    Object.assign(data(), { cloud_backup_initialized: true, cloud_backup_dirty: false });
    store.save();
  }

  async function downloadBackup({ uploadIfMissing = false } = {}) {
    const token = await google.accessToken();
    const result = await request(`${SERVER}/user/restore`, { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 });
    if (result.status === 404) {
      if (uploadIfMissing) return uploadBackup();
      throw new Error("Für dieses Konto wurde kein Backup gefunden.");
    }
    const restored = result.payload?.stats_data;
    if (!result.ok || !restored || typeof restored !== "object" || Array.isArray(restored)) throw new Error("Das Cloud-Backup konnte nicht geladen werden.");
    const current = data();
    for (const [key, value] of Object.entries(restored)) {
      // only plain data keys, never prototype keys or ones whose type would change (a tampered backup must not break the app)
      if (PRIVATE_BACKUP_KEYS.has(key) || !/^[a-z][a-z0-9_]{0,63}$/.test(key)) continue;
      if (key in current && current[key] !== null && value !== null && (typeof current[key] !== typeof value || Array.isArray(current[key]) !== Array.isArray(value))) continue;
      current[key] = value;
    }
    if (Array.isArray(current.trigger_words)) current.trigger_words = current.trigger_words.filter((word) => typeof word === "string" && word.length >= 2 && word.length <= 40).slice(0, 2000);
    Object.assign(data(), { cloud_backup_initialized: true, cloud_backup_dirty: false });
    store.save();
    host.monitorChanged?.();
    return undefined;
  }

  async function runAccountJob(action, calendar) {
    try {
      if (action === "login") {
        const account = await google.login({ calendar });
        Object.assign(data(), {
          account_id: account.sub,
          google_account_email: account.email || "",
          google_calendar_enabled: account.calendar,
          cloud_backup_initialized: false,
          cloud_backup_dirty: false,
        });
        store.save();
        // Pull an existing backup first (another device), otherwise upload this one.
        if (data().cloud_backup_dirty) await uploadBackup();
        else await downloadBackup({ uploadIfMissing: true });
        accountJob = { state: "done", message: `Angemeldet als ${account.email}. Deine Daten sind synchronisiert.` };
        host.emit?.("account-changed", {});
      } else if (action === "logout") {
        await google.logout().catch(() => {});
        for (const key of ["account_id", "google_account_email", "cloud_backup_initialized", "cloud_backup_dirty", "google_calendar_enabled", "google_calendar_events"]) delete data()[key];
        store.save();
        accountJob = { state: "done", message: "Abgemeldet." };
        host.emit?.("account-changed", {});
      } else if (action === "sync") {
        await uploadBackup();
        accountJob = { state: "done", message: "Alles gesichert." };
      } else if (action === "restore") {
        await downloadBackup();
        accountJob = { state: "done", message: "Daten von deinem Konto geladen." };
        host.emit?.("account-changed", {});
      }
    } catch (error) {
      accountJob = { state: "error", message: error.message };
    }
  }

  function accountAction(action, body) {
    if (!google) throw new UserError("Google-Anmeldung ist nicht verfügbar.");
    if (action === "config") {
      const clientId = String(body.clientId || "").trim();
      const clientSecret = String(body.clientSecret || "").trim();
      if (!OAUTH_CLIENT_ID.test(clientId)) throw new UserError("Die Client-ID muss auf .apps.googleusercontent.com enden.");
      if (clientSecret.length > 200 || !isPrintable(clientSecret)) throw new UserError("Das Client-Secret ist ungültig.");
      data().google_oauth_client = { client_id: clientId, client_secret: clientSecret };
      store.save();
      return accountStatus();
    }
    if (!["login", "logout", "sync", "restore"].includes(action)) throw new UserError("Unbekannter API-Endpunkt.", 404);
    if (accountJob.state === "pending") throw new UserError("Es läuft bereits ein Vorgang.", 409);
    if (action === "login" && !google.clientId()) throw new UserError("Google-Anmeldung ist noch nicht eingerichtet.");
    if (action !== "login" && !data().account_id) throw new UserError("Bitte melde dich zuerst mit Google an.");
    accountJob = {
      state: "pending",
      message: { login: "Google-Anmeldung im Browser geöffnet …", logout: "Verbindung wird getrennt …", sync: "Synchronisiere …", restore: "Daten werden geladen …" }[action],
    };
    runAccountJob(action, body.calendar !== false);
    return accountStatus();
  }

  function calendarEventBody(event) {
    if (!event || typeof event !== "object") throw new UserError("Ungültiger Kalender-Eintrag.");
    const { summary, description = "", start, end, timeZone = "" } = event;
    if (typeof summary !== "string" || summary.length < 1 || summary.length > 120 || typeof description !== "string" || description.length > 1000) throw new UserError("Titel oder Beschreibung sind ungültig.");
    if (![start, end].every((value) => typeof value === "string" && ISO_LOCAL.test(value))) throw new UserError("Ungültige Zeitangabe.");
    if (typeof timeZone !== "string" || !TIME_ZONE.test(timeZone)) throw new UserError("Ungültige Zeitzone.");
    const reminder = event.reminderMinutes ?? 10;
    if (!Number.isInteger(reminder) || reminder < 0 || reminder > 1440) throw new UserError("Ungültige Erinnerung.");
    const allDay = !start.includes("T");
    const when = (value) => (allDay ? { date: value } : { dateTime: value, timeZone });
    const result = { summary, description, start: when(start), end: when(end), reminders: { useDefault: false, overrides: [{ method: "popup", minutes: reminder }] } };
    if (event.recurrence != null) {
      if (!["DAILY", "WEEKLY"].includes(event.recurrence)) throw new UserError("Ungültige Wiederholung.");
      result.recurrence = [`RRULE:FREQ=${event.recurrence}`];
    }
    return result;
  }

  async function calendarEvents(body) {
    const values = data();
    if (!values.account_id) throw new UserError("Bitte melde dich zuerst mit Google an.");
    if (!values.google_calendar_enabled) throw new UserError("Der Kalender-Zugriff wurde nicht erlaubt. Bitte melde dich erneut an und erlaube den Kalender.", 403);
    if (!["milestones", "checkin", "risk"].includes(body.kind)) throw new UserError("Unbekannte Kalender-Aktion.");
    if (!Array.isArray(body.events) || body.events.length > 12) throw new UserError("Ungültige Kalender-Einträge.");
    const prepared = body.events.map(calendarEventBody);
    values.google_calendar_events ||= {};
    for (const id of values.google_calendar_events[body.kind] || []) await google.deleteEvent(id).catch(() => {});
    values.google_calendar_events[body.kind] = [];
    for (const event of prepared) values.google_calendar_events[body.kind].push(await google.createEvent(event));
    store.save();
    return { created: prepared.length, kind: body.kind };
  }

  // ---- router ----------------------------------------------------------------------
  // Faith area: everything (religion, prayers, journal, location) is stored encrypted only.
  function faith(method, body) {
    const values = data();
    if (method === "GET") {
      if (!values.faith_sealed) return { state: null, encrypted: Boolean(host.seal) };
      try {
        return { state: JSON.parse(host.unseal(values.faith_sealed)), encrypted: true };
      } catch {
        throw new UserError("Deine Glaubens-Daten konnten nicht entschlüsselt werden.", 500);
      }
    }
    if (method !== "POST") throw new UserError("Nicht gefunden.", 404);
    if (!host.seal) throw new UserError("Verschlüsselung ist auf diesem Gerät nicht verfügbar.", 503);
    if (body.state === null) delete values.faith_sealed;
    else {
      if (!body.state || typeof body.state !== "object" || Array.isArray(body.state)) throw new UserError("Ungültige Daten.");
      const text = JSON.stringify(body.state);
      if (text.length > 6_000_000) throw new UserError("Zu viele Daten – bitte wähle ein kleineres Hintergrundbild.");
      values.faith_sealed = host.seal(text);
    }
    store.save(); // never part of the cloud backup
    return { saved: true };
  }

  // Scripture texts and place search, fetched here so the page itself never talks to other hosts.
  const SCRIPTURE = {
    quran: { base: "https://api.alquran.cloud", path: /^\/v1\/(surah|ayah)\/\d{1,3}(:\d{1,3})?(\/editions)?\/[a-z0-9.,-]{2,200}$/ },
    qurancom: { base: "https://api.quran.com", path: /^\/api\/v4\/(chapter_recitations\/\d{1,2}\/\d{1,3}\?segments=true|verses\/by_chapter\/\d{1,3}\?words=true&word_fields=text_uthmani&per_page=50(&page=[1-6])?)$/ },
    bible: { base: "https://api.getbible.net", path: /^\/v2\/[a-z0-9]{2,30}\/\d{1,2}\/\d{1,3}\.json$/ },
  };
  const scriptureCache = new Map();
  async function scripture(body) {
    let url;
    if (body.source === "geo") {
      const name = String(body.name || "").trim();
      if (name.length < 2 || name.length > 80) throw new UserError("Bitte gib einen Ort ein.");
      url = `https://geocoding-api.open-meteo.com/v1/search?count=8&language=de&format=json&name=${encodeURIComponent(name)}`;
    } else {
      const source = SCRIPTURE[body.source];
      if (!source || !source.path.test(String(body.path || ""))) throw new UserError("Ungültige Anfrage.");
      url = source.base + body.path;
    }
    if (scriptureCache.has(url)) return scriptureCache.get(url);
    let result;
    try {
      result = await request(url, { timeout: 15000 });
    } catch {
      throw new UserError("Keine Verbindung. Bitte prüfe deine Internetverbindung.", 502);
    }
    if (!result.ok) throw new UserError("Der Text konnte gerade nicht geladen werden.", 502);
    if (scriptureCache.size > 200) scriptureCache.clear();
    if (body.source !== "geo") scriptureCache.set(url, result.payload);
    return result.payload;
  }

  async function route(method, path, body = {}) {
    const values = data();
    if (method === "GET" && path === "/api/dashboard") {
      const [savedHours] = savings();
      const identity = ensureIdentity();
      return {
        name: identity.name.startsWith("Gast-") ? "" : identity.name,
        rank: rank(),
        totalFocusMinutes: values.total_focus_minutes || 0,
        habitsPrevented: values.habits_prevented || 0,
        savedHours,
        savingsGoal: savingsGoal(),
        timer: timerState(),
        streakStart: values.streak_start_iso || null,
        dailyExpense: Number(values.daily_expense || 0),
        todayCheckin: (values.daily_checkins || {})[dayKey(now())] || null,
        wave: activeWave(),
      };
    }
    if (method === "GET" && path === "/api/analytics") {
      return {
        dailyActivity: values.daily_activity || {},
        dailyIncidents: values.daily_incidents || {},
        triggerStats: values.trigger_stats || {},
        totalFocusMinutes: values.total_focus_minutes || 0,
        habitsPrevented: values.habits_prevented || 0,
        savings: savings(),
        weekdayHourMatrix: values.weekday_hour_matrix || {},
        streakStart: values.streak_start_iso || null,
        longestStreak: values.longest_streak || 0,
        dailyExpense: Number(values.daily_expense || 0),
        hourlyRate: Number(values.hourly_rate ?? 25),
        savingsGoal: savingsGoal(),
        timerSessions: values.timer_activations || 0,
        checkins: values.daily_checkins || {},
        reflections: (values.relapse_reflections || []).length,
        waves: (values.craving_waves || []).slice(-300),
        relapses: (values.relapses || []).slice(-300),
        cravingMatrix: values.craving_matrix || {},
        relapseMatrix: values.relapse_matrix || {},
        rewards: values.rewards || [],
        capsules: publicCapsules(),
        aiContexts: values.ai_contexts || [],
        usage: host.usage ? host.usage() : {},
      };
    }
    if (path === "/api/faith") return faith(method, body);
    if (method === "POST" && path === "/api/faith/fetch") return scripture(body);
    if (method === "GET" && path === "/api/usage") return host.usage ? host.usage() : {};
    if (method === "GET" && path === "/api/insights") return insights();
    if (method === "GET" && path === "/api/settings") return settingsState();
    if (method === "POST" && path === "/api/settings") return { settings: saveSettings(body) };
    if (method === "GET" && path === "/api/preferences") {
      const contact = values.emergency_contact || {};
      return { prefs: { ...(values.web_ui_prefs || {}), ...Object.fromEntries(CONTACT_KEYS.filter((key) => typeof contact[key] === "string").map((key) => [key, contact[key]])) } };
    }
    if (method === "POST" && path === "/api/preferences") {
      const prefs = cleanPreferences(body.prefs);
      values.emergency_contact = Object.fromEntries(CONTACT_KEYS.filter((key) => key in prefs).map((key) => [key, prefs[key]]));
      CONTACT_KEYS.forEach((key) => delete prefs[key]);
      values.web_ui_prefs = prefs;
      save();
      host.prefsChanged?.(prefs);
      return { prefs: { ...prefs, ...values.emergency_contact } };
    }
    if (method === "POST" && path === "/api/timer/start") {
      const minutes = body.minutes;
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) throw new UserError("Der Fokus-Timer muss zwischen 1 und 180 Minuten liegen.");
      startTimer(minutes);
      return { timer: timerState() };
    }
    if (method === "POST" && path === "/api/timer/stop") {
      stopTimer();
      return { timer: timerState() };
    }
    if (method === "POST" && path === "/api/streak/reset") {
      if (body.relapse === true) recordRelapse(); // a fresh start after onboarding is not a relapse
      Object.assign(values, { streak_start_iso: localIso(now()), streak: 0, last_active_date: dayKey(now()) });
      save();
      return {};
    }
    if (method === "POST" && path === "/api/checkin") {
      const entry = cleanCheckin(body);
      values.daily_checkins ||= {};
      values.daily_checkins[dayKey(now())] = entry;
      save();
      return { checkin: entry };
    }
    if (method === "POST" && path === "/api/reflection") {
      const cause = body.trigger;
      const next = body.nextAction;
      if (typeof cause !== "string" || typeof next !== "string" || !cause.trim() || !next.trim() || cause.length > 500 || next.length > 500) throw new UserError("Bitte beide Felder mit höchstens 500 Zeichen ausfüllen.");
      values.relapse_reflections = [...(values.relapse_reflections || []), { date: localIso(now()).replace("T", " ").slice(0, 16), trigger_cause: cause.trim(), next_action: next.trim() }];
      save();
      return { saved: true };
    }
    if (method === "GET" && path === "/api/wave") return { wave: activeWave(), minutes: WAVE_MINUTES };
    if (method === "POST" && path === "/api/wave") return waveAction(body.action);
    if (method === "POST" && path === "/api/capsules") return { capsules: capsuleAction(body) };
    if (method === "POST" && path === "/api/rewards") {
      values.rewards = cleanRewards(body.rewards);
      save();
      return { rewards: values.rewards };
    }
    if (method === "GET" && path === "/api/community") return communityOverview();
    if (method === "POST" && path.startsWith("/api/community/social/")) return social(path.split("/").pop(), body);
    if (method === "GET" && path === "/api/quotes") return quotes();
    if (method === "GET" && path === "/api/account") return accountStatus();
    if (method === "POST" && path.startsWith("/api/account/")) return accountAction(path.split("/").pop(), body);
    if (method === "POST" && path === "/api/calendar/events") return calendarEvents(body);
    if (method === "GET" && path === "/api/app/state") return host.appState ? host.appState() : {};
    if (method === "POST" && path === "/api/app/quit") return host.quitAction ? host.quitAction(body.action) : {};
    if (method === "POST" && path === "/api/app/show") {
      host.showWindow?.();
      return { shown: true };
    }
    if (method === "POST" && path === "/api/feedback") {
      const area = String(body?.area || "");
      const text = String(body?.text || "").trim();
      if (text.length < 5 || text.length > 2000 || !isPrintable(text, "\n\t")) throw new UserError("Bitte schreib 5 bis 2000 Zeichen.");
      const result = await request(`${SERVER}/feedback`, { method: "POST", body: { area, text, version: host.version || "", language: String(data().web_ui_prefs?.language || "").slice(0, 8) }, timeout: 10000 })
        .catch(() => ({ ok: false, payload: { detail: "Keine Verbindung. Bitte versuch es später noch einmal." } }));
      if (!result.ok) throw new UserError(result.payload?.detail || "Feedback konnte nicht gesendet werden.");
      return { sent: true };
    }
    if (method === "POST" && path === "/api/app/feedback-window") {
      if (!host.openFeedback?.()) throw new UserError("Kein eigenes Fenster möglich.");
      return {};
    }
    if (method === "POST" && path === "/api/app/install-update") {
      if (!host.installUpdate?.()) throw new UserError("Es ist gerade kein Update bereit.");
      return {};
    }
    if (method === "POST" && path === "/api/app/open-external") {
      let url;
      try {
        url = new URL(String(body.url || ""));
      } catch {
        throw new UserError("Ungültiger Link.");
      }
      if (!["http:", "https:"].includes(url.protocol)) throw new UserError("Nur http- und https-Links können geöffnet werden.");
      await host.openExternal?.(url.toString());
      return { opened: true };
    }
    throw new UserError("Unbekannter API-Endpunkt.", 404);
  }

  async function handle(method, path, body) {
    try {
      return { status: 200, body: await route(method, path, body && typeof body === "object" ? body : {}) };
    } catch (error) {
      if (error instanceof UserError) return { status: error.status, body: { error: error.message } };
      console.error("API-Fehler", path, error);
      return { status: 500, body: { error: "Die Anfrage konnte nicht verarbeitet werden." } };
    }
  }

  return { handle, recordTrigger, ensureIdentity, timerState, stopTimer, scheduleCloud, uploadBackup };
}

module.exports = { createCore, UserError, SERVER, localIso, dayKey };
