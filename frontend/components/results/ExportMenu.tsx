"use client";

import { useState } from "react";
import { Download, FileJson, FileSpreadsheet, Cloud, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AnalysisResult } from "@/lib/types";
import { downloadJSON, downloadCSV } from "@/lib/export";
import { exportFeishu } from "@/lib/api";

interface Props {
  result: AnalysisResult;
  jobId: string;
}

export function ExportMenu({ result, jobId }: Props) {
  const [feishuLoading, setFeishuLoading] = useState(false);

  const handleFeishu = async () => {
    setFeishuLoading(true);
    try {
      const res = await exportFeishu(jobId);
      window.open(res.url, "_blank");
    } catch (err: any) {
      alert("Feishu export failed: " + err.message);
    } finally {
      setFeishuLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
        <Download className="h-4 w-4" />
        Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleFeishu} disabled={feishuLoading}>
          {feishuLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Cloud className="h-4 w-4 mr-2" />}
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
