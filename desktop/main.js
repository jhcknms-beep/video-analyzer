// Video Analyzer - Desktop Wrapper
// Opens the app in a frameless Chrome window for native desktop feel.
// Requires: Chrome or Edge installed.

const { exec, spawn } = require("child_process");
const path = require("path");
const http = require("http");

const ROOT = path.resolve(__dirname, "..");
const BACKEND_DIR = path.join(ROOT, "backend");
const FRONTEND_URL = "http://localhost:3000";

// 1. Start backend
function startBackend() {
  const proc = spawn("pythonw", ["-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"], {
    cwd: BACKEND_DIR,
    windowsHide: true,
    stdio: "ignore",
    detached: true,
  });
  proc.unref();
}

// 2. Start frontend
function startFrontend() {
  const proc = spawn("cmd", ["/c", "npm run dev"], {
    cwd: path.join(ROOT, "frontend"),
    windowsHide: true,
    stdio: "ignore",
    detached: true,
  });
  proc.unref();
}

// 3. Wait for frontend to be ready, then open app window
function waitForServer(url, retries = 60) {
  return new Promise((resolve, reject) => {
    function check() {
      http.get(url, (res) => {
        if (res.statusCode === 200) resolve();
        else if (retries-- > 0) setTimeout(check, 1000);
        else reject(new Error("Server not ready"));
      }).on("error", () => {
        if (retries-- > 0) setTimeout(check, 1000);
        else reject(new Error("Server not ready"));
      });
    }
    check();
  });
}

async function main() {
  console.log("Starting Video Analyzer...");
  startBackend();
  startFrontend();
  console.log("Waiting for services...");

  try {
    await waitForServer("http://localhost:3000");
  } catch {
    console.log("Server timeout — please start manually.");
    process.exit(1);
  }

  // Open in Chrome app mode (frameless window)
  const chromePaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
  ];

  let chrome = null;
  for (const cp of chromePaths) {
    try { require("fs").accessSync(cp); chrome = cp; break; } catch {}
  }

  if (chrome) {
    spawn(chrome, [
      `--app=${FRONTEND_URL}`,
      "--window-size=1400,900",
      "--window-position=center",
    ], { detached: true, stdio: "ignore" }).unref();
  } else {
    // Fallback: open in default browser
    const { exec } = require("child_process");
    exec(`start ${FRONTEND_URL}`);
  }

  console.log("Desktop app launched!");
  // Keep alive briefly then exit
  setTimeout(() => process.exit(0), 3000);
}

main();
