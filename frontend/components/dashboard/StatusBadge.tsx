import { Badge } from "@/components/ui/badge";
import type { JobStatus } from "@/lib/types";

const STATUS_CONFIG: Record<JobStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending:   { label: "Pending", variant: "secondary" },
  queued:    { label: "Queued",  variant: "secondary" },
  extracting_frames: { label: "Extracting", variant: "secondary" },
  analyzing: { label: "Analyzing", variant: "default" },
  completed: { label: "Done", variant: "default" },
  partial:   { label: "Partial", variant: "outline" },
  failed:    { label: "Failed", variant: "destructive" },
  paused:    { label: "Paused", variant: "secondary" },
};

const STEP_LABELS: Record<string, string> = {
  extracting_metadata: "读取视频信息",
  extracting_frames: "提取关键帧",
  analyzing_group_1: "分析内容与结构",
  analyzing_group_2: "分析用户与需求",
  analyzing_group_3: "分析价值与转化",
  saving_results: "保存结果",
  completed: "完成",
  error: "出错",
};

interface Props {
  status: JobStatus;
  currentStep?: string;
  dimension?: string | null;
}

export function StatusBadge({ status, currentStep, dimension }: Props) {
  const cfg = STATUS_CONFIG[status] || { label: status || "Unknown", variant: "secondary" as const };
  const stepLabel = currentStep ? STEP_LABELS[currentStep] || currentStep : "";

  return (
    <div className="flex items-center gap-2">
      <Badge variant={cfg.variant}>
        {cfg.label}
      </Badge>
      {stepLabel && status !== "completed" && status !== "failed" && (
        <span className="text-xs text-muted-foreground">{stepLabel}</span>
      )}
    </div>
  );
}
