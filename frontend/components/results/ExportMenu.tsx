"use client";

import { useState } from "react";
import { Download, FileJson, FileSpreadsheet, Cloud, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AnalysisResult } from "@/lib/types";
import { downloadJSON, downloadCSV } from "@/lib/export";
import { exportFeishu } from "@/lib/api";
import { toast } from "sonner";

interface Props {
  result: AnalysisResult;
  jobId: string;
}

export function ExportMenu({ result, jobId }: Props) {
  const [exporting, setExporting] = useState(false);

  const handleFeishu = async () => {
    setExporting(true);
    toast("Creating Feishu document...", {
      id: "feishu-export",
      duration: Infinity,
      icon: <Loader2 className="h-4 w-4 animate-spin text-teal-400" />,
      style: { borderColor: "oklch(0.70 0.11 185 / 0.3)" },
    });
    try {
      const res = await exportFeishu(jobId);
      toast("Document ready", {
        id: "feishu-export",
        duration: 4000,
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
        style: { borderColor: "oklch(0.70 0.13 160 / 0.3)" },
      });
      window.open(res.url, "_blank");
    } catch (err: any) {
      toast("Export failed", {
        id: "feishu-export",
        duration: 5000,
        description: err.message,
        icon: <AlertCircle className="h-4 w-4 text-red-400" />,
        style: { borderColor: "oklch(0.60 0.20 22 / 0.3)" },
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
        <Download className="h-4 w-4" />
        Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleFeishu} disabled={exporting}>
          {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Cloud className="h-4 w-4 mr-2" />}
          Lark Doc
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadJSON(result, jobId)}>
          <FileJson className="h-4 w-4 mr-2" />
          JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadCSV(result, jobId)}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
