import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { db } from "./db";

const execAsync = promisify(exec);
const STORAGE_DIR = path.join(process.cwd(), "storage", "videos");

export interface DownloadResult {
  filePath: string;
  title: string;
  duration: number;
  fileSize: number;
  format: string;
}

function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

async function getCookiesArgs(): Promise<string[]> {
  try {
    // Prefer cookies file if configured
    const fileSetting = await db.settings.findUnique({ where: { key: "cookies_file" } });
    if (fileSetting?.value && fs.existsSync(fileSetting.value)) {
      return ["--cookies", fileSetting.value];
    }
    // Fall back to browser cookies
    const browserSetting = await db.settings.findUnique({ where: { key: "cookies_from" } });
    if (browserSetting?.value) {
      return ["--cookies-from-browser", browserSetting.value];
    }
  } catch {}
  return [];
}

async function tryDownload(url: string, videoId: string, useCookies: boolean): Promise<DownloadResult> {
  ensureStorageDir();

  const outputTemplate = path.join(STORAGE_DIR, `${videoId}.%(ext)s`);
  const cookiesArgs = useCookies ? await getCookiesArgs() : [];

  const cmd = [
    "yt-dlp",
    "--no-check-certificates",
    "--no-warnings",
    ...cookiesArgs,
    "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "--extractor-retries", "3",
    "--retries", "3",
    "--format", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
    "--merge-output-format", "mp4",
    "--output", outputTemplate,
    "--print", "%(title)s",
    "--print", "%(duration)s",
    "--print", "%(filesize_approx)s",
    "--print", "%(ext)s",
    url,
  ].join(" ");

  const { stdout } = await execAsync(cmd, { timeout: 300000, maxBuffer: 10 * 1024 * 1024 });
  const lines = stdout.trim().split("\n");
  const title = lines[lines.length - 4]?.trim() || "Unknown";
  const duration = parseFloat(lines[lines.length - 3]?.trim() || "0");
  const fileSize = parseInt(lines[lines.length - 2]?.trim() || "0", 10);
  const ext = lines[lines.length - 1]?.trim() || "mp4";

  const filePath = path.join(STORAGE_DIR, `${videoId}.${ext}`);
  return { filePath, title, duration, fileSize, format: ext };
}

export async function downloadVideo(url: string, videoId: string): Promise<DownloadResult> {
  // First try with cookies (for Chinese platforms)
  const cookiesArgs = await getCookiesArgs();
  if (cookiesArgs.length > 0) {
    try {
      return await tryDownload(url, videoId, true);
    } catch (error: any) {
      const msg = error.message || String(error);
      // If cookies failed due to browser lock, try without
      if (msg.includes("cookies") || msg.includes("Cookie") || msg.includes("could not decrypt") || msg.includes("locked")) {
        // Fall through to try without cookies
      } else {
        throw new Error(`下载失败: ${msg}`);
      }
    }
  }

  // Try without cookies (works for YouTube, TikTok international)
  try {
    return await tryDownload(url, videoId, false);
  } catch (error: any) {
    const msg = error.message || String(error);
    if (msg.includes("cookies") || msg.includes("Cookie") || msg.includes("login") || msg.includes("Login")) {
      throw new Error(
        "此平台需要登录Cookie。请：\n" +
        "1. 关闭 Chrome/Edge 浏览器\n" +
        "2. 在设置页面配置 Cookie 来源（chrome/edge/firefox）\n" +
        "3. 重新提交视频链接\n\n" +
        "或者使用浏览器扩展导出 cookies.txt 文件。"
      );
    }
    throw new Error(`下载失败: ${msg}`);
  }
}
