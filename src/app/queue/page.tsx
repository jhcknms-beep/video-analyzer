"use client";

import { useEffect, useState } from "react";
import { Queue, Circle, Clock } from "@phosphor-icons/react";

interface QueueStatus {
  queueLength: number;
  running: number;
}

export default function QueuePage() {
  const [status, setStatus] = useState<QueueStatus>({ queueLength: 0, running: 0 });

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/queue/status");
      const data = await res.json();
      setStatus(data);
    } catch {
      // keep existing
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">队列状态</h1>
        <p className="text-sm text-zinc-500">实时监控视频处理队列</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Running */}
        <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-medium tracking-wide text-zinc-500 uppercase">处理中</span>
          </div>
          <p className="text-4xl font-semibold tracking-tight text-emerald-400">{status.running}</p>
        </div>

        {/* Queued */}
        <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <Clock weight="fill" className="h-4 w-4 text-zinc-500" />
            <span className="text-xs font-medium tracking-wide text-zinc-500 uppercase">排队中</span>
          </div>
          <p className="text-4xl font-semibold tracking-tight text-zinc-300">{status.queueLength}</p>
        </div>
      </div>

      {/* Idle State */}
      {status.running === 0 && status.queueLength === 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-12 backdrop-blur-sm text-center">
          <Queue weight="duotone" className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">队列空闲</p>
          <p className="text-xs text-zinc-600 mt-1">提交新的视频链接以开始处理</p>
        </div>
      )}
    </div>
  );
}
