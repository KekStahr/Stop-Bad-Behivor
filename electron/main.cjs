const { app, BrowserWindow, dialog, protocol } = require("electron");
const { spawn } = require("node:child_process");
const { createServer } = require("node:net");
const { randomBytes } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

let backend;
let mainWindow;
let backendUrl;
let backendToken;
let shutdownTimeout;
let shuttingDown = false;

protocol.registerSchemesAsPrivileged([
  {
    scheme: "reso",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

async function registerAppProtocol() {
  const guiDirectory = path.resolve(__dirname, "..", "gui");
  const contentTypes = new Map([
    [".html", "text/html; charset=utf-8"],
    [".js", "text/javascript; charset=utf-8"],
    [".css", "text/css; charset=utf-8"],
  ]);
  protocol.handle("reso", async (request) => {
    const url = new URL(request.url);
    if (url.hostname !== "app") return new Response("Not found", { status: 404 });

    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return new Response("Invalid path", { status: 400 });
    }
    const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
    const filePath = path.resolve(guiDirectory, relativePath);
    if (!filePath.toLowerCase().startsWith(`${guiDirectory}${path.sep}`.toLowerCase())) {
      return new Response("Not found", { status: 404 });
    }

    try {
      const content = await fs.promises.readFile(filePath);
      return new Response(content, {
        headers: {
          "Content-Type": contentTypes.get(path.extname(filePath)) || "application/octet-stream",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      if (error.code === "ENOENT" || error.code === "EISDIR") {
        return new Response("Not found", { status: 404 });
      }
      throw error;
    }
  });
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function startBackend(port, token, dataDirectory) {
  const packagedBackend = path.join(process.resourcesPath, "backend", "reso-backend.exe");
  const projectRoot = path.resolve(__dirname, "..");
  const environment = {
    ...process.env,
    RESO_API_PORT: String(port),
    RESO_API_TOKEN: token,
    PYTHONPATH: [projectRoot, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter),
  };

  if (app.isPackaged) {
    if (!fs.existsSync(packagedBackend)) {
      throw new Error("Das Python-Backend fehlt. Bitte den Desktop-Build vollständig erstellen.");
    }
    backend = spawn(packagedBackend, ["--hidden", "--web-api"], {
      cwd: dataDirectory,
      env: environment,
      windowsHide: true,
      stdio: "ignore",
    });
  } else {
    const python = process.env.RESO_PYTHON || "python";
    backend = spawn(python, ["-m", "backend.main", "--hidden", "--web-api"], {
      cwd: dataDirectory,
      env: environment,
      windowsHide: true,
      stdio: "ignore",
    });
  }

  backend.once("error", (error) => {
    dialog.showErrorBox("Reşo konnte nicht gestartet werden", error.message);
    app.quit();
  });
}

async function waitForBackend(port) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (!backend || backend.exitCode !== null) {
      throw new Error("Das lokale Python-Backend wurde unerwartet beendet.");
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return;
    } catch (error) {
      if (error.name !== "TypeError") throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Das lokale Python-Backend antwortet nicht.");
}

async function createWindow() {
  const dataDirectory = app.getPath("userData");
  fs.mkdirSync(dataDirectory, { recursive: true });

  if (!app.isPackaged) {
    const existingData = path.resolve(__dirname, "..", "backend", "data", "stats_data.json");
    const userData = path.join(dataDirectory, "stats_data.json");
    if (fs.existsSync(existingData) && !fs.existsSync(userData)) {
      fs.copyFileSync(existingData, userData);
    }
  }

  const port = await findFreePort();
  const token = randomBytes(32).toString("hex");
  backendUrl = `http://127.0.0.1:${port}`;
  backendToken = token;
  startBackend(port, token, dataDirectory);
  await waitForBackend(port);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 960,
    minHeight: 680,
    backgroundColor: "#111318",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: [
        `--reso-api-url=http://127.0.0.1:${port}`,
        `--reso-api-token=${token}`,
      ],
    },
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, url) => {
    try {
      const destination = new URL(url);
      if (destination.protocol !== "reso:" || destination.hostname !== "app") {
        event.preventDefault();
      }
    } catch {
      event.preventDefault();
    }
  });
  await mainWindow.loadURL("reso://app/index.html");
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await registerAppProtocol();
  await createWindow();
}).catch((error) => {
  console.error("Reşo start-up failed:", error);
  dialog.showErrorBox("Reşo konnte nicht gestartet werden", error.message);
  app.quit();
});

app.on("before-quit", (event) => {
  if (!backend || backend.exitCode !== null || backend.killed || shuttingDown) return;
  event.preventDefault();
  shuttingDown = true;
  shutdownTimeout = setTimeout(() => {
    if (!backend.killed) backend.kill();
    app.exit(0);
  }, 5000);
  fetch(`${backendUrl}/api/app/quit`, {
    method: "POST",
    headers: {
      "X-Reso-Token": backendToken,
      "Content-Type": "application/json",
    },
    body: "{}",
  }).catch(() => {}).finally(() => {
    backend.once("exit", () => {
      clearTimeout(shutdownTimeout);
      app.exit(0);
    });
  });
});

app.on("window-all-closed", () => app.quit());
