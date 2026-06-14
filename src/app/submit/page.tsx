"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Plus,
  Trash,
  Globe,
  YoutubeLogo,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const platformExamples: Record<string, string> = {
  douyin: "https://www.douyin.com/video/...",
  tiktok: "https://www.tiktok.com/@user/video/...",
  youtube: "https://www.youtube.com/watch?v=...",
  bilibili: "https://www.bilibili.com/video/BV...",
  kuaishou: "https://www.kuaishou.com/short-video/...",
  xiaohongshu: "https://www.xiaohongshu.com/explore/...",
};

export default function SubmitPage() {
  const router = useRouter();
  const [singleUrl, setSingleUrl] = useState("");
  const [batchUrls, setBatchUrls] = useState("");
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSingleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!singleUrl.trim()) return;
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: singleUrl.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const video = await res.json();
      setSuccess("任务已创建，正在处理中...");
      setSingleUrl("");
      router.push(`/videos/${video.id}`);
    } catch (err: any) {
      setError(err.message || "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBatchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const urls = batchUrls
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
    if (urls.length === 0) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/videos/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setSuccess(`已提交 ${data.count} 个视频任务，正在排队处理中...`);
      setBatchUrls("");
      router.push("/videos");
    } catch (err: any) {
      setError(err.message || "批量提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">提交分析</h1>
        <p className="text-sm text-zinc-500">输入视频公开链接，系统将自动下载并分析</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("single")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            mode === "single"
              ? "bg-white/[0.08] text-zinc-200 ring-1 ring-white/[0.1]"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          单个链接
        </button>
        <button
          onClick={() => setMode("batch")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            mode === "batch"
              ? "bg-white/[0.08] text-zinc-200 ring-1 ring-white/[0.1]"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          批量提交
        </button>
      </div>

      {/* Form */}
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-6 backdrop-blur-sm">
          {mode === "single" ? (
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url" className="text-sm font-medium text-zinc-300">
                  视频链接
                </Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="粘贴视频公开链接..."
                  value={singleUrl}
                  onChange={(e) => setSingleUrl(e.target.value)}
                  className="h-12 rounded-xl border-white/[0.08] bg-zinc-950 text-sm placeholder:text-zinc-600"
                />
                <p className="text-xs text-zinc-600">
                  支持抖音、TikTok、YouTube、B站、快手、小红书等平台
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-red-500/5 border border-red-500/10 px-4 py-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
              {success && (
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 px-4 py-3">
                  <p className="text-sm text-emerald-400">{success}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting || !singleUrl.trim()}
                className="w-full h-12 rounded-xl bg-emerald-500/90 text-sm font-medium text-zinc-950 hover:bg-emerald-500 disabled:opacity-40 active:scale-[0.98] transition-all"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950/30 border-t-zinc-950" />
                    提交中...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Play weight="fill" className="h-4 w-4" />
                    开始分析
                  </span>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleBatchSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="batch" className="text-sm font-medium text-zinc-300">
                  批量链接（每行一个）
                </Label>
                <Textarea
                  id="batch"
                  placeholder="https://www.youtube.com/watch?v=...&#10;https://www.bilibili.com/video/BV...&#10;https://www.douyin.com/video/..."
                  value={batchUrls}
                  onChange={(e) => setBatchUrls(e.target.value)}
                  rows={8}
                  className="rounded-xl border-white/[0.08] bg-zinc-950 text-sm placeholder:text-zinc-600 resize-none"
                />
                <p className="text-xs text-zinc-600">
                  每行一个链接，支持混合不同平台，最多 100 条
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-red-500/5 border border-red-500/10 px-4 py-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
              {success && (
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 px-4 py-3">
                  <p className="text-sm text-emerald-400">{success}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting || batchUrls.trim().length === 0}
                className="w-full h-12 rounded-xl bg-emerald-500/90 text-sm font-medium text-zinc-950 hover:bg-emerald-500 disabled:opacity-40 active:scale-[0.98] transition-all"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950/30 border-t-zinc-950" />
                    批量提交中...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Play weight="fill" className="h-4 w-4" />
                    批量分析 ({batchUrls.split("\n").filter((u) => u.trim()).length} 条)
                  </span>
                )}
              </Button>
            </form>
          )}
        </div>

        {/* Examples Sidebar */}
        <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <Globe weight="fill" className="h-4 w-4 text-zinc-500" />
            <h3 className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">平台示例</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(platformExamples).map(([platform, example]) => (
              <div key={platform} className="space-y-1">
                <span className="text-[11px] font-medium text-zinc-500">{platform}</span>
                <p className="text-[11px] text-zinc-600 break-all leading-relaxed">{example}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
