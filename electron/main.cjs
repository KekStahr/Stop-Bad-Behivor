const { app, BrowserWindow, Menu, Notification, Tray, globalShortcut, ipcMain, nativeImage, powerMonitor, protocol, safeStorage, shell } = require("electron");
const { execFile } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { Store } = require("./store.cjs");
const { createCore, dayKey } = require("./core.cjs");
const { createSealer } = require("./seal.cjs");
const { createGoogle } = require("./google.cjs");
const { createMonitor } = require("./monitor.cjs");

const QUIT_DELAY_MS = 30 * 60 * 1000;
const BROWSERS = ["chrome.exe", "msedge.exe", "firefox.exe", "opera.exe", "brave.exe", "vivaldi.exe", "iexplore.exe", "discord.exe"];
const startHidden = process.argv.includes("--hidden");

let mainWindow = null;
let pauseWindow = null;
let tray = null;
let allowQuit = false;
const APP_ICON = path.join(__dirname, "assets", "icon.ico"); // taskbar and Alt+Tab show Life, not the Electron atom
let updateReady = ""; // version of a downloaded update, installed on the next restart
let quitTimer = null;
let store;
let core;
let monitor;

// Separate data folder for tests; also gives that instance its own single-instance lock.
const isolatedData = process.env.RESO_USER_DATA;
if (isolatedData) {
  app.setPath("userData", isolatedData);
  allowQuit = true; // test instances may close immediately
} else {
  // The data folder stays where it has always been, even though the app is now called "Life".
  app.setPath("userData", path.join(app.getPath("appData"), "reso-desktop"));
}
app.setName("Life");

// Energy saver (default on): no GPU process. Life's interface is simple enough to draw on the
// CPU, and this removes the biggest memory and CPU consumer. Must be decided before "ready".
function energySaverEnabled() {
  try {
    const stored = JSON.parse(fs.readFileSync(path.join(app.getPath("userData"), "stats_data.json"), "utf8"));
    return stored.energy_saver !== false;
  } catch {
    return true;
  }
}
const energySaver = energySaverEnabled();
if (energySaver) app.disableHardwareAcceleration();

protocol.registerSchemesAsPrivileged([
  { scheme: "reso", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

// Only one Life at a time: a second start just brings the running one to the front.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => showWindow());
  app.whenReady().then(start).catch((error) => {
    console.error("Life start-up failed:", error);
    app.exit(1);
  });
}

function registerAppProtocol() {
  const guiDirectory = path.resolve(__dirname, "..", "gui");
  const contentTypes = new Map([[".html", "text/html; charset=utf-8"], [".js", "text/javascript; charset=utf-8"], [".css", "text/css; charset=utf-8"], [".png", "image/png"], [".svg", "image/svg+xml"], [".mp3", "audio/mpeg"], [".mp4", "audio/mp4"], [".json", "application/json; charset=utf-8"]]);
  protocol.handle("reso", async (request) => {
    const url = new URL(request.url);
    if (url.hostname !== "app") return new Response("Not found", { status: 404 });
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return new Response("Invalid path", { status: 400 });
    }
    const filePath = path.resolve(guiDirectory, pathname === "/" ? "index.html" : pathname.slice(1));
    if (!filePath.toLowerCase().startsWith(`${guiDirectory}${path.sep}`.toLowerCase())) return new Response("Not found", { status: 404 });
    try {
      const body = await fs.promises.readFile(filePath);
      const headers = { "Content-Type": contentTypes.get(path.extname(filePath)) || "application/octet-stream", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store", "Accept-Ranges": "bytes" };
      // byte ranges let the audio player jump straight to a part of the prayer recording
      const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") || "");
      if (range && (range[1] || range[2])) {
        const start = range[1] ? Number(range[1]) : Math.max(0, body.length - Number(range[2]));
        const end = range[1] && range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
        if (start > end || start >= body.length) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${body.length}` } });
        return new Response(body.subarray(start, end + 1), { status: 206, headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${body.length}`, "Content-Length": String(end - start + 1) } });
      }
      return new Response(body, { headers: { ...headers, "Content-Length": String(body.length) } });
    } catch (error) {
      if (error.code === "ENOENT" || error.code === "EISDIR") return new Response("Not found", { status: 404 });
      throw error;
    }
  });
}

const prefs = () => store.data.web_ui_prefs || {};
const emit = (type, payload = {}) => mainWindow?.webContents.send("reso-event", { type, payload });

// ---- autostart -------------------------------------------------------------------
function loginItemArgs() {
  return app.isPackaged ? ["--hidden"] : [app.getAppPath(), "--hidden"];
}
function getAutostart() {
  return app.getLoginItemSettings({ args: loginItemArgs() }).openAtLogin;
}
function setAutostart(enabled) {
  app.setLoginItemSettings({ openAtLogin: Boolean(enabled), args: loginItemArgs() });
}

// ---- quitting: only via the tray, after a 30-minute wait ---------------------------------
function quitDeadline() {
  const deadline = Number(store.data.shutdown_deadline_epoch);
  return Number.isFinite(deadline) && deadline > 0 ? deadline * 1000 : null;
}
function scheduleQuit() {
  clearInterval(quitTimer);
  quitTimer = null;
  const deadline = quitDeadline();
  if (!deadline) {
    updateTray();
    return;
  }
  const tick = () => {
    const left = deadline - Date.now();
    if (left <= 0) {
      clearInterval(quitTimer);
      store.data.shutdown_deadline_epoch = null;
      store.save();
      allowQuit = true;
      app.quit();
      return;
    }
    updateTray();
  };
  tick();
  quitTimer = setInterval(tick, 1000);
}
function quitAction(action) {
  if (action === "start" && !quitDeadline()) {
    store.data.shutdown_deadline_epoch = (Date.now() + QUIT_DELAY_MS) / 1000;
    store.save();
    emit("quit-changed", appState());
    tray?.displayBalloon({ iconType: "info", title: "Life beendet sich in 30 Minuten", content: "Du kannst es dir jederzeit anders überlegen: Rechtsklick auf das Symbol → „Beenden abbrechen“." });
  } else if (action === "cancel") {
    store.data.shutdown_deadline_epoch = null;
    store.save();
    emit("quit-changed", appState());
  }
  scheduleQuit();
  return appState();
}
function appState() {
  return { quitDeadline: quitDeadline(), autostart: getAutostart(), monitorAvailable: monitor?.available() || false, energySaver };
}

// ---- tray --------------------------------------------------------------------------
const clock = (ms) => `${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;
// tray texts in the app language (same dictionaries as the window)
let trayDict = { lang: null, map: {} };
function t(text) {
  const lang = prefs().language || (prefs().onboarded ? "de" : "en");
  if (trayDict.lang !== lang) {
    trayDict = { lang, map: {} };
    try { trayDict.map = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "gui", "i18n", `${lang}.json`), "utf8")); } catch { /* German stays */ }
  }
  return trayDict.map[text] || text;
}
// ---- automatic updates: GitHub releases of KekStahr/Stop-Bad-Behivor ------------------
// The installed app looks for a newer release, downloads it quietly and installs it when Life
// restarts. Users never download a file themselves.
function startUpdates() {
  if (!app.isPackaged) return; // running from source: nothing to update
  const { autoUpdater } = require("electron-updater");
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("update-downloaded", (info) => {
    updateReady = info.version;
    trayLabel = "";
    updateTray();
    emit("update-ready", { version: info.version });
  });
  autoUpdater.on("error", (error) => console.warn("Update check failed:", error.message));
  const check = () => autoUpdater.checkForUpdates().catch(() => {}); // offline is fine – next time
  setTimeout(check, 20000);
  setInterval(check, 4 * 3600000);
}
// Feedback opens in its own small window, so people can keep the app in view while writing.
let feedbackWindow = null;
function openFeedback() {
  if (feedbackWindow) { feedbackWindow.focus(); return true; }
  feedbackWindow = new BrowserWindow({
    icon: APP_ICON,
    width: 520,
    height: 660,
    minWidth: 420,
    autoHideMenuBar: true,
    backgroundColor: "#111113",
    title: "Life · Feedback",
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  feedbackWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  feedbackWindow.webContents.on("will-navigate", (event, url) => { if (!url.startsWith("reso://app/")) event.preventDefault(); });
  feedbackWindow.on("closed", () => { feedbackWindow = null; });
  feedbackWindow.loadURL("reso://app/feedback.html");
  return true;
}
function installUpdate() {
  if (!updateReady) return false;
  allowQuit = true; // a restart for an update is not "quitting" – Life is back a few seconds later
  require("electron-updater").autoUpdater.quitAndInstall(true, true);
  return true;
}

function trayMenu() {
  const deadline = quitDeadline();
  return Menu.buildFromTemplate([
    { label: t("Life öffnen"), click: () => showWindow() },
    { label: t("Ich brauche Hilfe"), click: () => { showWindow(); emit("sos"); } },
    { label: t("Kurz ablenken (Spiel)"), click: () => { showWindow(); emit("game"); } },
    { label: t("Fokus-Session"), click: () => { showWindow(); emit("navigate", { page: "timer" }); } },
    ...(updateReady ? [{ label: `${t("Update installieren und neu starten")} (${updateReady})`, click: installUpdate }] : []),
    { type: "separator" },
    deadline
      ? { label: t("Beendet sich in #").replace("#", clock(deadline - Date.now())), enabled: false }
      : { label: t("Beenden … (# Min. Wartezeit)").replace("#", "30"), click: () => { quitAction("start"); showWindow(); } },
    ...(deadline ? [{ label: t("Beenden abbrechen – ich bleibe"), click: () => quitAction("cancel") }] : []),
  ]);
}
let trayLabel = "";
function updateTray() {
  if (!tray) return;
  const deadline = quitDeadline();
  const label = deadline ? t("Life – beendet sich in #").replace("#", clock(deadline - Date.now())) : "Life";
  if (label === trayLabel) return;
  trayLabel = label;
  tray.setToolTip(label);
  tray.setContextMenu(trayMenu()); // refreshed every second while the countdown runs
}
function createTray() {
  const image = nativeImage.createFromPath(path.join(__dirname, "assets", "tray.png"));
  image.addRepresentation({ scaleFactor: 2, buffer: fs.readFileSync(path.join(__dirname, "assets", "tray@2x.png")) });
  tray = new Tray(image);
  tray.on("click", () => showWindow());
  updateTray();
}

// ---- windows -------------------------------------------------------------------------
function showWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    icon: APP_ICON,
    width: 1440,
    height: 960,
    minWidth: 960,
    minHeight: 680,
    show: !startHidden,
    backgroundColor: "#111318",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "assets", "icon.png"),
    title: "Life",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false, // keeps help requests and warnings working while in the tray
    },
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, url) => {
    try {
      const destination = new URL(url);
      if (destination.protocol !== "reso:" || destination.hostname !== "app") event.preventDefault();
    } catch {
      event.preventDefault();
    }
  });
  // The X only hides the window – Life keeps protecting you from the tray.
  mainWindow.on("close", (event) => {
    if (allowQuit) return;
    event.preventDefault();
    mainWindow.hide();
    if (!store.data.tray_hint_shown && Notification.isSupported()) {
      store.data.tray_hint_shown = true;
      store.save();
      new Notification({ title: "Life läuft weiter", body: "Du findest mich unten rechts im Infobereich. Zum Beenden: Rechtsklick auf das Symbol." }).show();
    }
  });
  mainWindow.on("session-end", () => { allowQuit = true; }); // Windows shutdown / sign-out
  mainWindow.loadURL("reso://app/index.html");
}

function openPauseWindow() {
  if (pauseWindow) {
    pauseWindow.show();
    pauseWindow.focus();
    return;
  }
  pauseWindow = new BrowserWindow({
    icon: APP_ICON,
    width: 400,
    height: 620,
    resizable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    backgroundColor: "#111113",
    title: "Life · Kurz innehalten",
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  pauseWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  pauseWindow.on("closed", () => { pauseWindow = null; });
  pauseWindow.loadURL("reso://app/pause.html");
}

// ---- computer usage (for the early-warning AI) -----------------------------------------
// Only minutes are counted – no window titles, apps or content.
let usageTicks = 0;
function trackUsage() {
  const usage = (store.data.computer_usage ||= { daily: {}, night: {} });
  const now = Date.now();
  const idle = powerMonitor.getSystemIdleTime();
  if (idle < 120) {
    if (!usage.sessionStart || now - (usage.lastActive || 0) > 15 * 60000) usage.sessionStart = now - idle * 1000;
    usage.lastActive = now;
    const key = dayKey();
    usage.daily[key] = (usage.daily[key] || 0) + 1;
    const hour = new Date().getHours();
    if (hour >= 23 || hour < 5) usage.night[key] = (usage.night[key] || 0) + 1;
  }
  usageTicks += 1;
  if (usageTicks % 5 === 0) {
    for (const bucket of [usage.daily, usage.night]) {
      for (const key of Object.keys(bucket).sort().slice(0, -60)) delete bucket[key];
    }
    store.save();
  }
}
function usageState() {
  const usage = store.data.computer_usage || { daily: {}, night: {} };
  const active = usage.lastActive && Date.now() - usage.lastActive < 15 * 60000;
  const yesterday = dayKey(new Date(Date.now() - 86400000));
  return {
    sessionMinutes: active ? Math.round((Date.now() - usage.sessionStart) / 60000) : 0,
    todayMinutes: usage.daily?.[dayKey()] || 0,
    lastNightMinutes: (usage.night?.[yesterday] || 0) + (new Date().getHours() < 5 ? usage.night?.[dayKey()] || 0 : 0),
    daily: usage.daily || {},
  };
}

// ---- keyboard monitor ---------------------------------------------------------------
let catalogWords = null; // words of the built-in catalog; everything else was typed in by the user
function configureMonitor() {
  const words = store.data.trigger_words || [];
  monitor.configure({
    triggerWords: words,
    ownWords: catalogWords ? words.filter((word) => !catalogWords.has(word)) : [],
    stressDetection: Boolean(store.data.stress_detection_enabled),
    layout: prefs().keyboardLayout === "us" ? "us" : "de",
  });
}

function onTrigger(word) {
  // Typing inside Life itself (e.g. talking about one's addiction in the community) is never a relapse.
  if (mainWindow?.isFocused()) return;
  core.recordTrigger(word);
  if (prefs().closeBrowsers !== false) { // on by default
    for (const name of BROWSERS) execFile("taskkill", ["/IM", name, "/F"], { windowsHide: true }, () => {});
  }
  showWindow();
  emit("trigger", { word });
}

// ---- start ---------------------------------------------------------------------------
async function start() {
  // dev runs get their own id – otherwise Windows shows the Electron atom for the installed Life in the taskbar
  app.setAppUserModelId(app.isPackaged ? "de.reso.desktop" : "de.reso.desktop.dev");
  registerAppProtocol();
  store = new Store(app.getPath("userData"));
  const google = createGoogle({ store, safeStorage, openExternal: (url) => shell.openExternal(url) });
  const sealer = createSealer({ safeStorage, directory: app.getPath("userData") });
  monitor = createMonitor({ onTrigger: (word) => onTrigger(word), onStress: () => openPauseWindow() });
  core = createCore({
    store,
    host: {
      google,
      emit,
      getAutostart,
      setAutostart,
      appState,
      quitAction,
      installUpdate,
      openFeedback,
      version: app.getVersion(),
      showWindow,
      openExternal: (url) => shell.openExternal(url),
      monitorAvailable: () => monitor.available(),
      monitorChanged: configureMonitor,
      usage: usageState,
      prefsChanged: () => { configureMonitor(); trayLabel = ""; updateTray(); }, // e.g. a new language
      seal: sealer.seal,
      unseal: sealer.unseal,
    },
  });
  core.ensureIdentity();
  if (!store.data.autostart_initialized && !isolatedData) { // start with Windows by default; changeable in the settings
    store.data.autostart_initialized = true;
    store.save();
    setAutostart(true);
  }

  ipcMain.handle("api", (event, request) => {
    if (!event.senderFrame?.url.startsWith("reso://app/")) return { status: 403, body: { error: "Nicht erlaubt." } };
    const { method = "GET", path: route = "", body } = request || {};
    return core.handle(String(method), String(route), body);
  });

  createTray();
  createWindow();
  configureMonitor();
  // Strg+Alt+H opens help from anywhere – in a craving moment nobody should have to search for the window
  if (!globalShortcut.register("CommandOrControl+Alt+H", () => { showWindow(); emit("sos"); })) console.warn("Strg+Alt+H is already taken by another program");
  app.on("will-quit", () => globalShortcut.unregisterAll());
  // the catalog lives in the GUI code; knowing it lets the user's own words match inside other words
  import(require("node:url").pathToFileURL(path.resolve(__dirname, "..", "gui", "recovery.js")).href)
    .then(({ ALL_CATALOG_WORDS }) => { catalogWords = ALL_CATALOG_WORDS; configureMonitor(); })
    .catch((error) => console.error("Trigger catalog not loaded:", error.message));
  monitor.start();
  scheduleQuit();
  core.scheduleCloud();
  trackUsage();
  startUpdates();
  setInterval(trackUsage, 60000);
}

app.on("before-quit", (event) => {
  if (!allowQuit) {
    event.preventDefault();
    showWindow();
    emit("quit-blocked");
    return;
  }
  monitor?.stop();
  core?.stopTimer();
});

app.on("window-all-closed", () => {
  // keep running in the tray
});
