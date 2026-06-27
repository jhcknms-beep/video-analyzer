"""Video Analyzer - Native Desktop App (pywebview)"""

import sys
import time
import subprocess
import os
import webview

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PYTHON = sys.executable  # use the same Python that's running this script
CREATE_FLAGS = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0

def start_backend():
    subprocess.Popen(
        [PYTHON, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"],
        cwd=os.path.join(ROOT, "backend"),
        creationflags=CREATE_FLAGS,
    )

def start_frontend():
    subprocess.Popen(
        ["cmd", "/c", "npm run dev"],
        cwd=os.path.join(ROOT, "frontend"),
        creationflags=CREATE_FLAGS,
    )

def wait_for(url, timeout=60):
    import urllib.request
    start = time.time()
    while time.time() - start < timeout:
        try:
            urllib.request.urlopen(url, timeout=2)
            return True
        except Exception:
            time.sleep(1)
    return False

if __name__ == "__main__":
    start_backend()
    start_frontend()
    wait_for("http://localhost:8001/health")
    wait_for("http://localhost:3000")

    webview.create_window(
        "Video Analyzer",
        "http://localhost:3000",
        width=1440,
        height=920,
        min_size=(900, 600),
    )
    webview.start()
