"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Film } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";

const API = "http://localhost:8001";

function useUnviewedCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch(`${API}/api/videos/status`);
        const data = await r.json();
        const completed = (data.jobs || []).filter((j: any) => j.status === "completed");
        const viewed = JSON.parse(localStorage.getItem("va_viewed") || "[]");
        setCount(completed.filter((j: any) => !viewed.includes(j.job_id)).length);
      } catch {}
    };
    check();
    const iv = setInterval(check, 10000);
    return () => clearInterval(iv);
  }, []);
  return count;
}

export function Nav() {
  const { isConnected } = useWebSocket();
  const [models, setModels] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const unviewed = useUnviewedCount();

  useEffect(() => {
    const load = () => {
      fetch(`${API}/api/models`)
        .then((r) => r.json())
        .then((d) => {
          setModels(d.models?.map((m: any) => m.name) || []);
          setCurrent(d.current || d.models?.[0]?.name || "");
        })
        .catch(() => {});
    };
    load();
    // Retry every 5s until models load (backend may start after frontend)
    const iv = setInterval(() => {
      if (models.length === 0) load();
      else clearInterval(iv);
    }, 5000);
    return () => clearInterval(iv);
  }, [models.length]);

  return (
    <header className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 font-semibold text-sm tracking-tight opacity-90 hover:opacity-100 transition-opacity">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Film className="h-3.5 w-3.5" />
            </span>
            <span className="hidden sm:inline">Video Analyzer</span>
          </Link>
          <nav className="flex items-center gap-0.5">
            <Link href="/" className="px-3 py-1.5 text-xs font-medium text-foreground/80 hover:text-foreground rounded transition-colors border-b-2 border-transparent hover:border-primary/50">Home</Link>
            <Link href="/history" className="px-3 py-1.5 text-xs font-medium text-foreground/80 hover:text-foreground rounded transition-colors border-b-2 border-transparent hover:border-primary/50 relative">
              History
              {unviewed > 0 && (
                <span className="absolute -top-0.5 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">{unviewed}</span>
              )}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {models.length >= 1 && (
            <select value={current} onChange={async (e) => {
              const m = e.target.value;
              await fetch(`${API}/api/models/switch`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: m }) });
              setCurrent(m);
            }} className="text-[11px] bg-secondary border border-border/50 rounded-md px-2 py-1 text-muted-foreground cursor-pointer focus:outline-none focus:border-primary/50">
              {models.map((m) => (<option key={m} value={m}>{m}</option>))}
            </select>
          )}
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={`inline-block h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse-dot" : "bg-red-400"}`} />
            {isConnected ? "Live" : "Offline"}
          </span>
        </div>
      </div>
    </header>
  );
}
