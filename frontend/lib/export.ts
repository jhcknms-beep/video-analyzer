import type { AnalysisResult } from "./types";

export function generateCSV(result: AnalysisResult): string {
  const rows: Record<string, string> = {};

  function flatten(obj: unknown, prefix = ""): void {
    if (Array.isArray(obj)) {
      rows[prefix] = obj.join("; ");
    } else if (obj && typeof obj === "object") {
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        flatten(v, `${prefix}${k}.`);
      }
    } else {
      rows[prefix.slice(0, -1)] = String(obj ?? "");
    }
  }

  flatten(result);

  const keys = Object.keys(rows);
  const header = keys.join(",");
  const values = keys.map((k) => `"${(rows[k] || "").replace(/"/g, '""')}"`).join(",");
  return `${header}\n${values}`;
}

export function downloadCSV(result: AnalysisResult, jobId: string): void {
  const csv = generateCSV(result);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `analysis_${jobId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJSON(result: AnalysisResult, jobId: string): void {
  const json = JSON.stringify(result, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `analysis_${jobId}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
