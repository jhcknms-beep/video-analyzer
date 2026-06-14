"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChartBar,
  FilmSlate,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  TrendUp,
  Play,
} from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Stats {
  total: number;
  completed: number;
  processing: number;
  error: number;
  recentVideos: Array<{
    id: string;
    url: string;
    platform: string;
    title: string | null;
    status: string;
    createdAt: string;
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

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/videos");
        const videos = await res.json();
        if (Array.isArray(videos)) {
          setStats({
            total: videos.length,
            completed: videos.filter((v: any) => v.status === "completed").length,
            processing: videos.filter((v: any) =>
              ["pending", "downloading", "downloaded", "analyzing"].includes(v.status)
            ).length,
            error: videos.filter((v: any) => v.status === "error").length,
            recentVideos: videos.slice(0, 5),
          });
        }
      } catch {
        // leave as empty state
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const statCards = [
    { label: "总任务数", value: stats?.total ?? 0, icon: ChartBar, color: "text-zinc-400" },
    { label: "已完成", value: stats?.completed ?? 0, icon: CheckCircle, color: "text-emerald-400" },
    { label: "处理中", value: stats?.processing ?? 0, icon: Clock, color: "text-amber-400" },
    { label: "失败", value: stats?.error ?? 0, icon: XCircle, color: "text-red-400" },
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">控制台</h1>
        <p className="text-sm text-zinc-500">视频分析任务概览与最近活动</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-5 backdrop-blur-sm"
          >
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-8 bg-zinc-800" />
                <Skeleton className="h-8 w-12 bg-zinc-800" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2.5">
                  <stat.icon weight="fill" className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-xs font-medium tracking-wide text-zinc-500 uppercase">{stat.label}</span>
                </div>
                <p className={`mt-2 text-3xl font-semibold tracking-tight ${stat.color}`}>{stat.value}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Recent Videos + CTA */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Recent List */}
        <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold tracking-wide text-zinc-300 uppercase">最近任务</h2>
            <Link href="/videos" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              查看全部 <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-zinc-800 rounded-lg" />
              ))}
            </div>
          ) : !stats || stats.total === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <FilmSlate weight="duotone" className="h-10 w-10 text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500">暂无分析任务</p>
              <p className="text-xs text-zinc-600 mt-1">提交你的第一个视频链接开始分析</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {stats.recentVideos.map((video) => {
                const cfg = statusConfig[video.status] || statusConfig.pending;
                return (
                  <Link
                    key={video.id}
                    href={`/videos/${video.id}`}
                    className="flex items-center gap-4 py-3 transition-colors hover:bg-white/[0.02] rounded-lg px-3 -mx-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-300 truncate">{video.title || video.url}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {video.platform !== "unknown" && (
                          <span className="text-[11px] text-zinc-600">{platformLabels[video.platform] || video.platform}</span>
                        )}
                      </div>
                    </div>
                    <Badge className={`text-[11px] px-2 py-0.5 font-normal ${cfg.className}`}>{cfg.label}</Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* CTA Card */}
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-emerald-500/[0.04] to-zinc-900/60 p-6 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/30">
              <TrendUp weight="fill" className="h-[18px] w-[18px] text-emerald-400" />
            </div>
            <h2 className="text-sm font-semibold text-zinc-200">开始批量分析</h2>
            <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">
              支持抖音、TikTok、YouTube、B站、快手、小红书等主流平台视频链接批量提交分析
            </p>
          </div>
          <Link
            href="/submit"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/90 px-4 py-2.5 text-sm font-medium text-zinc-950 transition-all hover:bg-emerald-500 active:scale-[0.98]"
          >
            <Play weight="fill" className="h-4 w-4" />
            新建分析任务
          </Link>
        </div>
      </div>
    </div>
  );
}
