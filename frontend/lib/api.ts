const API_BASE = "http://localhost:8001";

export async function uploadVideos(files: File[]): Promise<{ jobs: import("./types").JobMeta[] }> {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));

  const res = await fetch(`${API_BASE}/api/videos/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function getStatus(ids?: string[]): Promise<{ jobs: import("./types").JobMeta[] }> {
  const params = ids?.length ? `?ids=${ids.join(",")}` : "";
  const res = await fetch(`${API_BASE}/api/videos/status${params}`);
  if (!res.ok) throw new Error("Failed to fetch status");
  return res.json();
}

export async function getResults(jobId: string): Promise<import("./types").JobResult> {
  const res = await fetch(`${API_BASE}/api/videos/${jobId}/results`);
  if (!res.ok) throw new Error("Failed to fetch results");
  return res.json();
}

export async function downloadFromUrl(url: string): Promise<{
  job_id: string;
  platform: string;
  title: string;
  duration: number;
  uploader: string;
  resolution: string;
  status: string;
  message: string;
}> {
  const res = await fetch(`${API_BASE}/api/videos/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Download failed");
  }
  return res.json();
}

export async function exportFeishuSheet(jobIds: string[]): Promise<{ url: string; count: number }> {
  const res = await fetch(`${API_BASE}/api/videos/export-feishu-sheet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_ids: jobIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Export failed");
  }
  return res.json();
}

export async function exportFeishu(jobId: string): Promise<{ url: string; message: string }> {
  const res = await fetch(`${API_BASE}/api/videos/${jobId}/export-feishu`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Feishu export failed");
  }
  return res.json();
}

export async function startJob(jobId: string): Promise<void> {
  await fetch(`${API_BASE}/api/videos/${jobId}/start`, { method: "POST" });
}
export async function startBatch(jobIds: string[]): Promise<void> {
  await fetch(`${API_BASE}/api/videos/start-batch`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job_ids: jobIds }) });
}
export async function pauseJob(jobId: string): Promise<void> {
  await fetch(`${API_BASE}/api/videos/${jobId}/pause`, { method: "POST" });
}

export async function renameJob(jobId: string, name: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/videos/${jobId}/rename`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Rename failed");
}

export async function deleteJob(jobId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/videos/${jobId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete job");
}

export async function exportResults(jobId: string, format: "json" | "csv" = "json"): Promise<void> {
  const res = await fetch(`${API_BASE}/api/videos/${jobId}/export?format=${format}`);
  if (!res.ok) throw new Error("Export failed");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `analysis_${jobId}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}
