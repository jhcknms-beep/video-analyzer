"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Upload, Link2, Play, Pause, Trash2, Pencil, Check, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { BatchUploadZone } from "@/components/upload/BatchUploadZone";
import { UrlInput } from "@/components/upload/UrlInput";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useWebSocket } from "@/hooks/useWebSocket";
import { uploadVideos, downloadFromUrl, deleteJob, renameJob, startJob, startBatch, pauseJob } from "@/lib/api";
import type { WSProgressMessage, JobStatus } from "@/lib/types";

export default function HomePage() {
  const { files, validFiles, isUploading, setIsUploading, addFiles, removeFile, clearFiles, inputRef } = useFileUpload();
  const { jobs } = useWebSocket();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [activeTab, setActiveTab] = useState("file");
  const [isDownloading, setIsDownloading] = useState(false);

  const startRename = (job: WSProgressMessage) => { setEditingId(job.job_id); setEditName(job.filename); };
  const saveRename = async (jobId: string) => {
    if (editName.trim()) {
      try {
        await renameJob(jobId, editName.trim());
        toast.success("Renamed");
      } catch (err: any) { toast.error("Rename failed: " + err.message); }
    }
    setEditingId(null);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  // Pending: not started yet
  const pendingJobs = jobs.filter((j) => j.status === "pending");
  // Active: currently processing
  const activeJobs = jobs.filter((j) => ["queued","extracting_frames","analyzing"].includes(j.status));
  const pausedJobs = jobs.filter((j) => j.status === "paused");
  const allPending = [...pendingJobs, ...pausedJobs];

  const handleUpload = useCallback(async () => {
    if (validFiles.length === 0) { toast.error("No files selected"); return; }
    setIsUploading(true);
    try {
      await uploadVideos(validFiles.map((f) => f.file));
      toast.success(`Added ${validFiles.length} video(s) to pending list`);
      clearFiles();
    } catch (err: any) { toast.error(err.message); }
    setIsUploading(false);
  }, [validFiles, setIsUploading, clearFiles]);

  const handleUrlDownload = useCallback(async (url: string) => {
    setIsDownloading(true);
    try {
      const r = await downloadFromUrl(url);
      toast.success(r.message);
    } catch (err: any) { throw err; }
    setIsDownloading(false);
  }, []);

  const handleStart = async () => {
    if (selected.size === 0) { toast.error("Select videos to start"); return; }
    const ids = Array.from(selected).filter((id) => allPending.find((j) => j.job_id === id));
    if (ids.length === 0) { toast.error("No pending videos selected"); return; }
    try { await startBatch(ids); toast.success(`Started ${ids.length} analysis`); setSelected(new Set()); }
    catch (err: any) { toast.error(err.message); }
  };

  const handlePause = async (id: string) => { try { await pauseJob(id); } catch {} };
  const handleDelete = async (id: string) => { try { await deleteJob(id); toast.success("Deleted"); } catch {} };
  const handleRename = async (id: string, name: string) => { try { await renameJob(id, name); } catch {} };

  return (
    <div className="space-y-8">
      <section className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Video Analyzer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Upload videos or paste links to analyze content</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5"><span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/40"/><span className="text-muted-foreground">{pendingJobs.length} pending</span></div>
          <div className="flex items-center gap-1.5"><span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/60"/><span className="text-muted-foreground">{activeJobs.length} active</span></div>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="file" className="gap-2"><Upload className="h-4 w-4"/> File Upload</TabsTrigger>
          <TabsTrigger value="url" className="gap-2"><Link2 className="h-4 w-4"/> Link Import</TabsTrigger>
        </TabsList>
        <TabsContent value="file" className="mt-4">
          <BatchUploadZone files={files} onAddFiles={addFiles} onRemoveFile={removeFile} onClearFiles={clearFiles} onUpload={handleUpload} isUploading={isUploading} inputRef={inputRef} />
        </TabsContent>
        <TabsContent value="url" className="mt-4">
          <UrlInput onDownload={handleUrlDownload} isDownloading={isDownloading} />
        </TabsContent>
      </Tabs>

      {/* Pending List */}
      {allPending.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pending ({allPending.length})</h2>
            <Button size="sm" onClick={handleStart} disabled={selected.size === 0} className="gap-2 h-8">
              <Play className="h-3.5 w-3.5" /> Analyze Selected ({selected.size})
            </Button>
          </div>
          <div className="rounded-lg border">
            <table className="w-full text-sm"><tbody>
              {allPending.map((j) => (
                <tr key={j.job_id} className="border-b last:border-0 hover:bg-muted/30" onDoubleClick={() => startRename(j)}>
                  <td className="p-2 w-8"><Checkbox checked={selected.has(j.job_id)} onCheckedChange={() => toggleSelect(j.job_id)} /></td>
                  <td className="p-2 max-w-[300px]">
                    {editingId === j.job_id ? (
                      <div className="flex items-center gap-1">
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveRename(j.job_id); if (e.key === "Escape") setEditingId(null); }} className="bg-transparent border-b border-primary px-1 py-0.5 text-sm w-full outline-none" autoFocus />
                        <button onClick={() => saveRename(j.job_id)}><Check className="h-4 w-4 text-green-500"/></button>
                        <button onClick={() => setEditingId(null)}><X className="h-4 w-4 text-muted-foreground"/></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 group cursor-pointer" onClick={() => startRename(j)}>
                        <span className="font-medium truncate" title={j.filename}>{j.filename}</span>
                        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0"/>
                      </div>
                    )}
                  </td>
                  <td className="p-2 text-xs text-muted-foreground w-16">{j.status === "paused" ? "Paused" : "Pending"}</td>
                  <td className="p-2 w-20 text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleDelete(j.job_id)}><Trash2 className="h-3 w-3"/></Button>
                  </td>
                </tr>
              ))}
            </tbody></table>
          </div>
        </section>
      )}

      {/* Active List */}
      {activeJobs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Processing ({activeJobs.length})</h2>
          <div className="rounded-lg border">
            <table className="w-full text-sm"><tbody>
              {activeJobs.map((j) => (
                <tr key={j.job_id} className="border-b last:border-0">
                  <td className="p-2 font-medium truncate max-w-[300px]" title={j.filename}>{j.filename}</td>
                  <td className="p-2 w-48"><div className="flex items-center gap-2"><Progress value={j.progress_pct} className="h-1.5 flex-1"/><span className="text-xs text-muted-foreground w-8">{Math.round(j.progress_pct)}%</span></div></td>
                  <td className="p-2 w-20 text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => handlePause(j.job_id)}><Pause className="h-3 w-3"/> Pause</Button>
                  </td>
                </tr>
              ))}
            </tbody></table>
          </div>
        </section>
      )}

      {allPending.length === 0 && activeJobs.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No tasks yet</p>
          <p className="text-sm">Upload videos or paste links to get started</p>
        </div>
      )}
    </div>
  );
}
