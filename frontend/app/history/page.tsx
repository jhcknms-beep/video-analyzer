"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Sheet, Loader2, Circle, Pencil, Check, X, Trash2, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { exportFeishuSheet, renameJob, deleteJob } from "@/lib/api";
import { toast } from "sonner";

interface Job {
  job_id: string;
  filename: string;
  original_filename: string;
  status: string;
  created_at: string;
  video_duration_seconds: number | null;
  processing_time_seconds: number | null;
  completed_at: string | null;
  error: string | null;
}

export default function HistoryPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadJobs = useCallback(async () => {
    try {
      const r = await fetch("http://localhost:8001/api/videos/status", { headers: { Authorization: `Bearer ${localStorage.getItem("va_token") || ""}` } });
      const data = await r.json();
      setJobs(data.jobs || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const [viewed, setViewed] = useState<string[]>([]);
  useEffect(() => {
    const token = localStorage.getItem("va_token");
    fetch("http://localhost:8001/api/auth/viewed", { headers: { Authorization: `Bearer ${token || ""}` } })
      .then(r => r.json()).then(d => setViewed(d.viewed || [])).catch(() => {});
  }, [loading]);
  const [viewGrid, setViewGrid] = useState(true);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");

  const startEdit = (job: Job) => { setEditId(job.job_id); setEditVal((job.original_filename || job.filename)); };
  const saveEdit = async (id: string) => {
    if (editVal.trim()) { try { await renameJob(id, editVal.trim()); } catch {} }
    setEditId(null);
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const completed = jobs.filter((j) => j.status === "completed");
    if (selected.size === allDone.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allDone.map((j) => j.job_id)));
    }
  };

  const handleDelete = async (id: string) => {
    try { await deleteJob(id); toast.success("Deleted"); loadJobs(); }
    catch (err: any) { toast.error(err.message); }
  };

  const exportSheet = async () => {
    if (selected.size === 0) return;
    setExporting(true);
    try {
      const data = await exportFeishuSheet(Array.from(selected));
      window.open(data.url, "_blank");
    } catch (err: any) {
      alert("Export failed: " + err.message);
    }
    setExporting(false);
  };

  const completed = jobs.filter((j) => j.status === "completed");
  const failed = jobs.filter((j) => j.status === "failed");
  const allDone = [...failed, ...completed]; // Failed first, then completed. Newest first via sort
  allDone.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));

  const filtered = search.trim()
    ? allDone.filter(j => (j.original_filename || j.filename).toLowerCase().includes(search.toLowerCase()))
    : allDone;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <h1 className="text-xl font-semibold">History</h1>
          <span className="text-sm text-muted-foreground">{completed.length} done, {failed.length} failed</span>
        </div>
        <input
          type="text" placeholder="Search..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="text-xs bg-transparent border border-border rounded px-2 py-1 w-40 text-muted-foreground focus:outline-none focus:border-primary/50"
        />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewGrid(!viewGrid)} title={viewGrid ? "List view" : "Grid view"}>
            {viewGrid ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          </Button>
        {selected.size > 0 && (
          <Button onClick={exportSheet} disabled={exporting} size="sm" className="gap-2">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sheet className="h-4 w-4" />}
            Export {selected.size} to Feishu Sheet
          </Button>
        )}
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">{allDone.length > 0 ? "No matching results" : "No analyses yet"}</p>
        </div>
      ) : (
        viewGrid ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((job) => {
            const isUnviewed = !viewed.includes(job.job_id);
            return (
              <div key={job.job_id} className={`bg-card border rounded-lg p-4 hover:border-primary/30 hover:-translate-y-0.5 transition-all ${job.status === "failed" ? "border-l-2 border-l-red-500 bg-red-500/5" : isUnviewed ? "border-l-2 border-l-primary bg-primary/5" : "border-border/50"}`} onDoubleClick={() => startEdit(job)}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Checkbox checked={selected.has(job.job_id)} onCheckedChange={() => toggle(job.job_id)} className="shrink-0" />
                    {editId === job.job_id ? (
                      <div className="flex items-center gap-1 flex-1">
                        <input value={editVal} onChange={(e) => setEditVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveEdit(job.job_id); if (e.key === "Escape") setEditId(null); }} className="bg-transparent border-b border-primary px-1 py-0.5 text-sm w-full outline-none" autoFocus />
                        <button onClick={() => saveEdit(job.job_id)}><Check className="h-4 w-4 text-green-500" /></button>
                        <button onClick={() => setEditId(null)}><X className="h-4 w-4 text-muted-foreground" /></button>
                      </div>
                    ) : (
                      <span className="text-sm font-medium truncate cursor-pointer flex-1" title={(job.original_filename || job.filename)}>
                        {isUnviewed && <Circle className="h-1.5 w-1.5 inline-block fill-primary text-primary mr-1.5 -mt-0.5" />}
                        {(job.original_filename || job.filename)}
                      </span>
                    )}
                  </div>
                  <Badge variant="default" className={`text-[10px] shrink-0 border-0 ${job.status === "failed" ? "bg-red-400/20 text-red-400" : "bg-emerald-400/20 text-emerald-400"}`}>{job.status === "failed" ? "failed" : "done"}</Badge>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    {job.video_duration_seconds ? `${Math.round(job.video_duration_seconds)}s` : "-"}
                    {job.processing_time_seconds ? ` · ${job.processing_time_seconds >= 60 ? Math.floor(job.processing_time_seconds/60)+"m" : Math.round(job.processing_time_seconds)+"s"}` : ""}
                    {job.completed_at ? ` · ${new Date(job.completed_at).toLocaleDateString()}` : ""}
                    {job.error ? ` · ${job.error.slice(0, 60)}` : ""}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <Link href={`/jobs/${job.job_id}`}><Button variant="ghost" size="sm" className="h-6 text-[11px]">View</Button></Link>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(job.job_id)}><Trash2 className="h-3 w-3 text-muted-foreground"/></Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        ) : (
        <div className="rounded-lg border"><table className="w-full text-sm"><tbody>
          {filtered.map((job) => (
            <tr key={job.job_id} className="border-b last:border-0 hover:bg-muted/30">
              <td className="p-2 w-8"><Checkbox checked={selected.has(job.job_id)} onCheckedChange={() => toggle(job.job_id)} /></td>
              <td className="p-2 font-medium truncate max-w-[300px]">{(job.original_filename || job.filename)}</td>
              <td className="p-2 text-muted-foreground text-xs w-16">{job.video_duration_seconds ? `${Math.round(job.video_duration_seconds)}s` : "-"}</td>
              <td className="p-2 text-muted-foreground text-xs w-28">{job.completed_at ? new Date(job.completed_at).toLocaleDateString() : "-"}</td>
              <td className="p-2 w-20 text-right"><Link href={`/jobs/${job.job_id}`}><Button variant="ghost" size="sm" className="h-7 text-xs">View</Button></Link></td>
            </tr>
          ))}
        </tbody></table></div>
        )
      )}
    </div>
  );
}
