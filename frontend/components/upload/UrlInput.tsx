"use client";

import { useState } from "react";
import { Link2, Loader2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const PLATFORM_EXAMPLES: Record<string, string> = {
  "douyin.com": "https://v.douyin.com/xxxxx/",
  "tiktok.com": "https://www.tiktok.com/@user/video/123456",
  "xiaohongshu.com": "https://www.xiaohongshu.com/explore/xxxxx",
  "bilibili.com": "https://www.bilibili.com/video/BV1xx411c7mD",
  "youtube.com": "https://www.youtube.com/watch?v=xxxxxxxx",
  "kuaishou.com": "https://www.kuaishou.com/short-video/xxxxx",
};

interface Props {
  onDownload: (url: string) => Promise<void>;
  isDownloading: boolean;
}

export function UrlInput({ onDownload, isDownloading }: Props) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    const trimmed = url.trim();
    if (!trimmed) {
      setError("请输入视频链接");
      return;
    }

    // Basic URL validation
    try {
      new URL(trimmed);
    } catch {
      setError("链接格式不正确");
      return;
    }

    try {
      await onDownload(trimmed);
      setUrl("");
    } catch (err: any) {
      setError(err.message || "下载失败");
    }
  };

  return (
    <div className="space-y-6">
      {/* URL Input */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Paste link: Douyin / TikTok / Xiaohongshu"
              className="pl-9 h-11 text-sm"
              disabled={isDownloading}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isDownloading || !url.trim()}
            className="h-11 px-6 shrink-0"
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                下载中...
              </>
            ) : (
              <>
                <Globe className="h-4 w-4 mr-2" />
                获取视频
              </>
            )}
          </Button>
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>

      {/* Supported Platforms */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">支持的平台</p>
        <div className="flex flex-wrap gap-2">
          {[
            { name: "抖音", color: "hover:border-black/40 dark:hover:border-white/20" },
            { name: "TikTok", color: "hover:border-black/40 dark:hover:border-white/20" },
            { name: "小红书", color: "hover:border-red-200 dark:hover:border-red-800" },
          ].map((p) => (
            <Card
              key={p.name}
              className={`border transition-colors cursor-default ${p.color} bg-transparent`}
            >
              <CardContent className="px-3 py-1.5 text-xs font-medium">
                {p.name}
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          下载视频需要一定时间，完成后自动加入分析队列
        </p>
      </div>
    </div>
  );
}
