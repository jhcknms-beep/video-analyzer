export const PLATFORM_PATTERNS: Record<string, RegExp> = {
  tiktok: /tiktok\.com/,
  douyin: /douyin\.com/,
  youtube: /youtube\.com|youtu\.be/,
  bilibili: /bilibili\.com|b23\.tv/,
  kuaishou: /kuaishou\.com/,
  xiaohongshu: /xiaohongshu\.com|xhslink\.com/,
};

export const PLATFORM_NAMES: Record<string, string> = {
  tiktok: "TikTok",
  douyin: "抖音",
  youtube: "YouTube",
  bilibili: "B站",
  kuaishou: "快手",
  xiaohongshu: "小红书",
};

export function detectPlatform(url: string): string {
  for (const [key, pattern] of Object.entries(PLATFORM_PATTERNS)) {
    if (pattern.test(url)) return key;
  }
  return "unknown";
}

export function getPlatformName(key: string): string {
  return PLATFORM_NAMES[key] || key;
}
