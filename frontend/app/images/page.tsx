"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Upload, ImageIcon, Play, Link2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const API = "http://localhost:8001";
const WS_URL = "ws://localhost:8001/ws/progress";

interface WSJob {
  job_id: string; filename: string; status: string;
  progress_pct: number; current_step: string; error: string | null;
  analysis_type: string;
}

export default function ImagesPage() {
  const [mode, setMode] = useState<"content" | "reverse">("content");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [urlDownloading, setUrlDownloading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // WebSocket-based job state (persists across tab switches)
  const [jobs, setJobs] = useState<Map<string, WSJob>>(new Map());
  useEffect(() => {
    let reconnectTimer: any;
    const connect = () => {
      const ws = new WebSocket(WS_URL);
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "progress" && (msg.analysis_type || "") === "image") {
            setJobs(prev => { const n = new Map(prev); n.set(msg.job_id, msg); return n; });
          } else if (msg.type === "sync") {
            const imgs = (msg.jobs || []).filter((j: any) => (j.analysis_type || "video") === "image");
            const m = new Map<string, WSJob>(); imgs.forEach((j: any) => m.set(j.job_id, j)); setJobs(m);
          }
        } catch {}
      };
      ws.onclose = () => { reconnectTimer = setTimeout(connect, 3000); };
      return ws;
    };
    let ws = connect();
    return () => { clearTimeout(reconnectTimer); ws.close(); };
  }, []);

  const jobList = Array.from(jobs.values());
  const pendingJobs = jobList.filter(j => j.status === "pending");
  const activeJobs = jobList.filter(j => ["queued","extracting_frames","analyzing"].includes(j.status));
  const completedJobs = jobList.filter(j => j.status === "completed");
  const failedJobs = jobList.filter(j => j.status === "failed");

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith("image/"));
    setUploadFiles(prev => [...prev, ...arr]);
    setPreviews(prev => [...prev, ...arr.map(f => URL.createObjectURL(f))]);
  }, []);
  const removeFile = (i: number) => {
    URL.revokeObjectURL(previews[i]);
    setUploadFiles(p => p.filter((_, idx) => idx !== i));
    setPreviews(p => p.filter((_, idx) => idx !== i));
  };
  const clearFiles = () => { previews.forEach(p => URL.revokeObjectURL(p)); setUploadFiles([]); setPreviews([]); };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) { toast.error("No images"); return; }
    setUploading(true);
    try {
      const form = new FormData();
      uploadFiles.forEach(f => form.append("files", f));
      form.append("mode", mode);
      const r = await fetch(`${API}/api/images/upload`, {
        method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("va_token") || ""}` }, body: form,
      });
      if (!r.ok) throw new Error("Upload failed");
      toast.success(`${(await r.json()).jobs.length} image(s) added`);
      clearFiles();
    } catch (err: any) { toast.error(err.message); }
    setUploading(false);
  };

  const handleUrlDownload = async () => {
    if (!urlInput.trim()) { toast.error("Enter a URL"); return; }
    setUrlDownloading(true);
    try {
      const r = await fetch(`${API}/api/images/download`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("va_token") || ""}` },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Failed"); }
      const data = await r.json();
      toast.success(`${data.count} image(s) from ${data.platform}`);
      setUrlInput("");
    } catch (err: any) { toast.error(err.message); }
    setUrlDownloading(false);
  };

  const toggle = (id: string) => { setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); };

  const startAnalysis = async () => {
    const ids = Array.from(selected).filter(id => jobs.get(id)?.status === "pending");
    if (ids.length === 0) { toast.error("Select pending images first"); return; }
    setAnalyzing(true);
    try {
      await fetch(`${API}/api/images/analyze-batch`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("va_token") || ""}` },
        body: JSON.stringify({ job_ids: ids, mode }),
      });
      toast.success(`${ids.length} image(s) analysis started`);
      setSelected(new Set());
    } catch (err: any) { toast.error(err.message); }
    setAnalyzing(false);
  };

  const allPending = [...pendingJobs];

  return (
    <div className="space-y-8">
      <section className="flex items-end justify-between">
        <div><h1 className="text-xl font-semibold tracking-tight">Image Analysis</h1><p className="text-xs text-muted-foreground mt-0.5">Upload product images for e-commerce analysis</p></div>
        <div className="flex items-center gap-2">
          <Button variant={mode==="content"?"default":"outline"} size="sm" onClick={()=>setMode("content")}>Content</Button>
          <Button variant={mode==="reverse"?"default":"outline"} size="sm" onClick={()=>setMode("reverse")}>Prompt</Button>
        </div>
      </section>

      <div className="flex gap-2">
        <div className="relative flex-1"><Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
        <Input value={urlInput} onChange={e=>setUrlInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleUrlDownload()} placeholder="Paste product URL (Amazon, Shopee, Taobao, JD, VIP...)" className="pl-9 h-10 text-sm" disabled={urlDownloading}/></div>
        <Button onClick={handleUrlDownload} disabled={urlDownloading||!urlInput.trim()} className="h-10 px-5 shrink-0 gap-2">{urlDownloading?<><Loader2 className="h-4 w-4 animate-spin"/>...</>:<><Link2 className="h-4 w-4"/>Get Images</>}</Button>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragging?"border-primary bg-primary/5":"border-muted-foreground/25 hover:border-primary/50"}`}
        onDragOver={e=>{e.preventDefault();setIsDragging(true)}}
        onDragLeave={e=>{e.preventDefault();setIsDragging(false)}}
        onDrop={e=>{e.preventDefault();setIsDragging(false);e.dataTransfer.files&&addFiles(e.dataTransfer.files)}}
        onClick={()=>fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e=>{e.target.files&&addFiles(e.target.files);e.target.value=""}}/>
        <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground mb-2"/>
        <p className="text-sm font-medium">{isDragging?"Drop images":"Drag images or click"}</p>
        <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP, SVG</p>
      </div>

      {uploadFiles.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {uploadFiles.map((f,i)=>(
              <div key={i} className="relative group bg-card border rounded-lg overflow-hidden">
                <img src={previews[i]} className="w-full h-40 object-contain bg-black/10 rounded-t-lg"/>
                <p className="text-[11px] truncate p-1.5">{f.name}</p>
                <button className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100" onClick={e=>{e.stopPropagation();removeFile(i)}}><X className="h-3.5 w-3.5"/></button>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Button onClick={handleUpload} disabled={uploading||uploadFiles.length===0} className="gap-2"><Upload className="h-4 w-4"/>{uploading?"Uploading...":`Upload ${uploadFiles.length} images`}</Button>
            <Button variant="ghost" onClick={clearFiles}>Clear</Button>
          </div>
        </div>
      )}

      {allPending.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pending ({allPending.length})</h2>
            <Button size="sm" onClick={startAnalysis} disabled={selected.size===0||analyzing} className="gap-2 h-8"><Play className="h-3.5 w-3.5"/>Analyze ({selected.size})</Button>
          </div>
          <div className="space-y-1.5">
            {allPending.map(j=>(
              <div key={j.job_id} className="bg-card border border-border/50 rounded-md flex items-center px-3 py-2 gap-3">
                <Checkbox checked={selected.has(j.job_id)} onCheckedChange={()=>toggle(j.job_id)}/>
                <span className="text-sm truncate flex-1">{j.filename}</span>
                <Badge variant="secondary" className="text-[10px] shrink-0">pending</Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeJobs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Processing ({activeJobs.length})</h2>
          <div className="space-y-1.5">
            {activeJobs.map(j=>(
              <div key={j.job_id} className="bg-card border border-primary/30 rounded-md px-3 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm truncate flex-1">{j.filename}</span>
                  <Badge variant="default" className="text-[10px] shrink-0">{j.status}</Badge>
                </div>
                <Progress value={j.progress_pct} className="h-1"/>
              </div>
            ))}
          </div>
        </section>
      )}

      {completedJobs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Completed ({completedJobs.length})</h2>
          <p className="text-xs text-muted-foreground">Results in <a href="/history?filter=image" className="text-primary hover:underline">History</a></p>
        </section>
      )}

      {failedJobs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-destructive uppercase tracking-wider">Failed ({failedJobs.length})</h2>
          <div className="space-y-1.5">
            {failedJobs.map(j=>(<div key={j.job_id} className="bg-card border border-destructive/30 rounded-md px-3 py-2 text-sm text-muted-foreground">{j.filename} - {j.error||"Unknown error"}</div>))}
          </div>
        </section>
      )}

      {jobList.length===0 && uploadFiles.length===0 && (
        <div className="text-center py-12 text-muted-foreground"><p className="text-sm">Drop images or paste a product URL</p></div>
      )}
    </div>
  );
}
