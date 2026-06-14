"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FilmSlate, ArrowRight, Trash } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface VideoItem {
  id: string;
  url: string;
  platform: string;
  title: string | null;
  status: string;
  error: string | null;
  duration: number | null;
  createdAt: string;
  analyses: Array<{
    id: string;
    type: string;
    summary: string | null;
    sentiment: string | null;
  }>;
}

const platformLabels: Record<string, string> = {
  tiktok: "TikTok",
  douyin: "抖音",
  youtube: "YouTube",
  bilibili: "B站",
  kuaishou: "快手",
  xiaohongshu: "小红书",
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "排队中", className: "bg-zinc-700/50 text-zinc-400" },
  downloading: { label: "下载中", className: "bg-blue-500/10 text-blue-400" },
  downloaded: { label: "已下载", className: "bg-cyan-500/10 text-cyan-400" },
  analyzing: { label: "分析中", className: "bg-amber-500/10 text-amber-400" },
  completed: { label: "已完成", className: "bg-emerald-500/10 text-emerald-400" },
  error: { label: "失败", className: "bg-red-500/10 text-red-400" },
};

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
    const interval = setInterval(fetchVideos, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchVideos() {
    try {
      const res = await fetch("/api/videos");
      const data = await res.json();
      if (Array.isArray(data)) setVideos(data);
    } catch {
      // keep existing data
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确认删除此任务？")) return;
    await fetch(`/api/videos/${id}`, { method: "DELETE" });
    setVideos((prev) => prev.filter((v) => v.id !== id));
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">视频列表</h1>
          <p className="text-sm text-zinc-500">管理所有分析任务与查看结果</p>
        </div>
        <Link
          href="/submit"
          className="flex items-center gap-2 rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-500 active:scale-[0.98] transition-all"
        >
          新建任务
        </Link>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full bg-zinc-800 rounded-xl" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FilmSlate weight="duotone" className="h-12 w-12 text-zinc-700 mb-4" />
            <p className="text-sm text-zinc-500">暂无视频任务</p>
            <p className="text-xs text-zinc-600 mt-1 mb-5">提交一个视频链接开始分析</p>
            <Link
              href="/submit"
              className="flex items-center gap-2 rounded-xl bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              提交链接
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="text-left text-xs font-medium text-zinc-500 px-6 py-3.5">视频</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-6 py-3.5">平台</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-6 py-3.5">状态</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-6 py-3.5">时长</th>
                  <th className="text-right text-xs font-medium text-zinc-500 px-6 py-3.5">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {videos.map((video) => {
                  const cfg = statusConfig[video.status] || statusConfig.pending;
                  return (
                    <tr
                      key={video.id}
                      className="transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-6 py-3.5">
                        <Link href={`/videos/${video.id}`} className="block">
                          <p className="text-sm text-zinc-300 truncate max-w-[300px]">
                            {video.title || video.url}
                          </p>
                          {video.error && (
                            <p className="text-xs text-red-400/70 mt-0.5 truncate max-w-[300px]">
                              {video.error}
                            </p>
                          )}
                        </Link>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="text-xs text-zinc-500">
                          {platformLabels[video.platform] || video.platform}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <Badge className={`text-[11px] px-2 py-0.5 font-normal ${cfg.className}`}>
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="text-xs text-zinc-600 font-mono">
                          {video.duration ? `${Math.round(video.duration)}s` : "—"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/videos/${video.id}`}
                            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            详情
                          </Link>
                          <button
                            onClick={() => handleDelete(video.id)}
                            className="text-zinc-600 hover:text-red-400 transition-colors"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
