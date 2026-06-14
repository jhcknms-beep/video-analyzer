"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Sheet, Loader2, Circle, Pencil, Check, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { exportFeishuSheet, renameJob, deleteJob } from "@/lib/api";
import { toast } from "sonner";

interface Job {
  job_id: string;
  filename: string;
  status: string;
  created_at: string;
  video_duration_seconds: number | null;
  processing_time_seconds: number | null;
  error: string | null;
}

export default function HistoryPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadJobs = useCallback(async () => {
    try {
      const r = await fetch("http://localhost:8001/api/videos/status");
      const data = await r.json();
      setJobs(data.jobs || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const [viewed, setViewed] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("va_viewed") || "[]"); } catch { return []; }
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");

  const startEdit = (job: Job) => { setEditId(job.job_id); setEditVal(job.filename); };
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
    if (selected.size === completed.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(completed.map((j) => j.job_id)));
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <h1 className="text-xl font-semibold">History</h1>
          <span className="text-sm text-muted-foreground">{completed.length} completed</span>
        </div>
        {selected.size > 0 && (
          <Button onClick={exportSheet} disabled={exporting} size="sm" className="gap-2">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sheet className="h-4 w-4" />}
            Export {selected.size} to Feishu Sheet
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : completed.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No completed analyses</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-10 p-3">
                  <Checkbox checked={selected.size === completed.length && completed.length > 0} onCheckedChange={toggleAll} />
                </th>
                <th className="p-3 text-left font-medium">Name</th>
                <th className="p-3 text-left font-medium w-16">Duration</th>
                <th className="p-3 text-left font-medium w-20">Processed</th>
                <th className="p-3 text-left font-medium w-20">Status</th>
                <th className="p-3 text-right font-medium w-16">Action</th>
              </tr>
            </thead>
            <tbody>
              {completed.map((job) => {
                const isUnviewed = !viewed.includes(job.job_id);
                return (
                <tr key={job.job_id} className={`border-b hover:bg-muted/30 transition-colors ${isUnviewed ? "bg-primary/5" : ""}`}>
                  <td className="p-3">
                    <Checkbox checked={selected.has(job.job_id)} onCheckedChange={() => toggle(job.job_id)} />
                  </td>
                  <td className="p-3" onDoubleClick={() => startEdit(job)}>
                    {editId === job.job_id ? (
                      <div className="flex items-center gap-1">
                        <input value={editVal} onChange={(e) => setEditVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveEdit(job.job_id); if (e.key === "Escape") setEditId(null); }} className="bg-transparent border-b border-primary px-1 py-0.5 text-sm w-full outline-none" autoFocus />
                        <button onClick={() => saveEdit(job.job_id)}><Check className="h-4 w-4 text-green-500" /></button>
                        <button onClick={() => setEditId(null)}><X className="h-4 w-4 text-muted-foreground" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group cursor-pointer" onClick={() => startEdit(job)}>
                        {isUnviewed && <Circle className="h-2 w-2 fill-primary text-primary shrink-0" />}
                        <p className={`font-medium truncate max-w-[240px] ${isUnviewed ? "text-foreground" : ""}`} title={job.filename}>{job.filename}</p>
                        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {job.video_duration_seconds ? `${Math.round(job.video_duration_seconds)}s` : "-"}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {job.processing_time_seconds
                      ? job.processing_time_seconds >= 60
                        ? `${Math.floor(job.processing_time_seconds / 60)}m ${Math.round(job.processing_time_seconds % 60)}s`
                        : `${Math.round(job.processing_time_seconds)}s`
                      : "-"}
                  </td>
                  <td className="p-3">
                    <Badge variant="default" className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">done</Badge>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Link href={`/jobs/${job.job_id}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">View</Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(job.job_id)} title="Delete">
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
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
  );
}
