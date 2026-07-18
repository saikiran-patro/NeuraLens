const { app, BrowserWindow, desktopCapturer, ipcMain, screen, session, shell } = require("electron");
const { spawn } = require("node:child_process");
const { appendFileSync, copyFileSync, existsSync, readFileSync, writeFileSync } = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "../..");
let backendProcess;
let mainWindow;
let localOrigin = "";
let sharingActive = false;
const overlayWindows = [];

function availablePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 8787;
      probe.close(() => resolve(port));
    });
  });
}

function ensureUserEnvironment() {
  if (!app.isPackaged) return path.join(projectRoot, "services", ".env");
  const environmentFile = path.join(app.getPath("userData"), ".env");
  const template = path.join(process.resourcesPath, "config", ".env.example");
  if (!existsSync(environmentFile) && existsSync(template)) copyFileSync(template, environmentFile);
  return environmentFile;
}

function updateEnvironmentValue(file, name, value) {
  const current = existsSync(file) ? readFileSync(file, "utf8") : "";
  const lines = current.split(/\r?\n/);
  const index = lines.findIndex((line) => line.startsWith(`${name}=`));
  const entry = `${name}=${value}`;
  if (index >= 0) lines[index] = entry;
  else lines.push(entry);
  writeFileSync(file, `${lines.filter((line, lineIndex) => line || lineIndex < lines.length - 1).join("\n")}\n`, { encoding: "utf8", mode: 0o600 });
}

async function startBackend() {
  const port = await availablePort();
  const entry = app.isPackaged
    ? path.join(process.resourcesPath, "backend", "index.cjs")
    : path.join(projectRoot, "dist-desktop", "backend", "index.cjs");
  const webRoot = app.isPackaged ? path.join(process.resourcesPath, "web") : path.join(projectRoot, "dist");
  const knowledgeRoot = app.isPackaged ? path.join(process.resourcesPath, "knowledge") : path.join(projectRoot, "knowledge");
  const logFile = path.join(app.getPath("logs"), "backend.log");
  localOrigin = `http://127.0.0.1:${port}`;

  backendProcess = spawn(process.execPath, [entry], {
    windowsHide: true,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(port),
      NEURALENS_STATIC_DIR: webRoot,
      NEURALENS_KNOWLEDGE_DIR: knowledgeRoot,
      NEURALENS_ENV_FILE: ensureUserEnvironment(),
      NEURALENS_WINDOWS_INSTALLER: "",
      npm_package_version: app.getVersion(),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const writeLog = (prefix, chunk) => {
    try { appendFileSync(logFile, `${new Date().toISOString()} ${prefix} ${String(chunk)}`); } catch { /* Logging must never stop startup. */ }
  };
  backendProcess.stdout?.on("data", (chunk) => writeLog("INFO", chunk));
  backendProcess.stderr?.on("data", (chunk) => writeLog("ERROR", chunk));

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${localOrigin}/api/health`);
      if (response.ok) return localOrigin;
    } catch { /* The local API is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("The local NeuraLens AI service did not start.");
}

function closeOverlays() {
  while (overlayWindows.length) overlayWindows.pop()?.destroy();
}

function showSharingOverlays(analyzing = false) {
  closeOverlays();
  for (const display of screen.getAllDisplays()) {
    const overlay = new BrowserWindow({
      ...display.bounds,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      focusable: false,
      fullscreenable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      hasShadow: false,
      show: false,
      webPreferences: { sandbox: true, contextIsolation: true },
    });
    overlay.setIgnoreMouseEvents(true);
    overlay.setAlwaysOnTop("screen-saver");
    overlay.loadFile(path.join(__dirname, "overlay.html"), { query: { analyzing: analyzing ? "1" : "0" } });
    overlay.once("ready-to-show", () => overlay.showInactive());
    overlayWindows.push(overlay);
  }
}

function configurePermissions() {
  const isLocal = (value = "") => value.startsWith(localOrigin);
  session.defaultSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin) =>
    isLocal(requestingOrigin) && ["media", "display-capture", "clipboard-sanitized-write"].includes(permission),
  );
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const requestUrl = details.requestingUrl || webContents.getURL();
    callback(isLocal(requestUrl) && ["media", "display-capture", "clipboard-sanitized-write"].includes(permission));
  });
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({ types: ["screen"], thumbnailSize: { width: 0, height: 0 } });
      const primary = screen.getPrimaryDisplay();
      const source = sources.find((candidate) => candidate.display_id === String(primary.id)) || sources[0];
      callback(source ? { video: source } : {});
    } catch {
      callback({});
    }
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 960,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: "#e9edf2",
    title: "NeuraLens AI",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(localOrigin)) event.preventDefault();
  });
  mainWindow.once("ready-to-show", () => mainWindow.show());
  void mainWindow.loadURL(`${localOrigin}/app`);
}

ipcMain.on("screen-share-state", (event, state) => {
  if (!event.sender.getURL().startsWith(localOrigin)) return;
  sharingActive = Boolean(state?.active);
  if (sharingActive) showSharingOverlays(Boolean(state?.analyzing));
  else closeOverlays();
});

ipcMain.handle("configure-deepgram", (event, suppliedKey) => {
  if (!event.sender.getURL().startsWith(localOrigin)) throw new Error("Configuration request was rejected.");
  const apiKey = String(suppliedKey || "").trim();
  if (apiKey.length < 20 || /^(your|replace|change|example|placeholder)/i.test(apiKey)) {
    throw new Error("Enter a valid Deepgram API key.");
  }
  updateEnvironmentValue(ensureUserEnvironment(), "DEEPGRAM_API_KEY", apiKey);
  setTimeout(() => {
    app.relaunch();
    app.quit();
  }, 700);
  return { ok: true };
});

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) app.quit();
else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app.whenReady().then(async () => {
    try {
      await startBackend();
      configurePermissions();
      createMainWindow();
      screen.on("display-added", () => sharingActive && showSharingOverlays());
      screen.on("display-removed", () => sharingActive && showSharingOverlays());
      screen.on("display-metrics-changed", () => sharingActive && showSharingOverlays());
    } catch (error) {
      const failure = new BrowserWindow({ width: 620, height: 300, title: "NeuraLens AI" });
      const message = encodeURIComponent(error instanceof Error ? error.message : "Desktop startup failed.");
      void failure.loadURL(`data:text/html,<style>body{font:16px Segoe UI;padding:40px;background:%23171b20;color:white}p{color:%23aeb6bf}</style><h1>NeuraLens AI could not start</h1><p>${message}</p>`);
    }
  });
}

app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0 && localOrigin) createMainWindow(); });
app.on("before-quit", () => {
  closeOverlays();
  if (backendProcess && !backendProcess.killed) backendProcess.kill();
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
