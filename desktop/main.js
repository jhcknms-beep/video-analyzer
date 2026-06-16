const { app, BrowserWindow, Menu, Tray, nativeImage } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");
let mainWindow = null;
let backendProc = null;
let frontendProc = null;
let tray = null;

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "1";

// ── Kill old processes ──
function killOld() {
  try { require("child_process").execSync("taskkill /f /im python.exe 2>nul & taskkill /f /im pythonw.exe 2>nul", { shell: "cmd.exe", stdio: "ignore" }); } catch {}
}

// ── Start backend ──
function startBackend() {
  const pythonPath = path.join(
    process.env.LOCALAPPDATA,
    "Programs/Python/Python312/pythonw.exe"
  );
  backendProc = spawn(pythonPath, ["-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"], {
    cwd: path.join(ROOT, "backend"),
    windowsHide: true,
    stdio: "ignore",
    detached: true,
  });
  backendProc.unref();
}

// ── Start frontend ──
function startFrontend() {
  const cmd = process.platform === "win32" ? "cmd" : "bash";
  const args = process.platform === "win32" ? ["/c", "npm run dev"] : ["-c", "npm run dev"];
  frontendProc = spawn(cmd, args, {
    cwd: path.join(ROOT, "frontend"),
    windowsHide: true,
    stdio: "ignore",
    detached: true,
  });
  frontendProc.unref();
}

// ── Wait for server ──
function waitFor(url, retries = 80) {
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode === 200) resolve();
        else if (retries-- > 0) setTimeout(check, 1000);
        else reject(new Error("Server timeout"));
      }).on("error", () => {
        if (retries-- > 0) setTimeout(check, 1000);
        else reject(new Error("Server not ready"));
      });
    };
    check();
  });
}

// ── Create window ──
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 600,
    title: "Video Analyzer",
    backgroundColor: "#141414",
    show: false,
    icon: path.join(ROOT, "frontend", "public", "icon.svg"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL("http://localhost:3000");

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ── App lifecycle ──
app.whenReady().then(async () => {
  killOld();
  startBackend();
  startFrontend();

  try {
    await Promise.all([
      waitFor("http://localhost:8001/health"),
      waitFor("http://localhost:3000"),
    ]);
  } catch (e) {
    console.error("Startup failed:", e.message);
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("before-quit", () => {
  killOld();
});
