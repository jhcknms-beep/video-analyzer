"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AnalysisResults } from "@/components/results/AnalysisResults";
import { ExportMenu } from "@/components/results/ExportMenu";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { getResults } from "@/lib/api";
import type { JobResult, AnalysisResult } from "@/lib/types";

function AnalysisResultsWithFrames({ jobId, result }: { jobId: string; result: AnalysisResult }) {
  const [frameData, setFrameData] = useState<{url:string;w:number;h:number}[]>([]);
  useEffect(() => {
    fetch(`http://localhost:8001/api/videos/${jobId}/frames`)
      .then((r) => r.json())
      .then((d) => {
        const items = (d.frames || []).map((f: any) => ({
          url: `http://localhost:8001${f.url}`,
          w: f.width || 1280,
          h: f.height || 720,
        }));
        setFrameData(items);
      })
      .catch(() => {});
  }, [jobId]);

  const urls = frameData.map(f => f.url);
  const isPortrait = frameData.length > 0 && frameData[0].h > frameData[0].w;

  return (
    <>
      {frameData.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {frameData.map((f, i) => (
            <img key={i} src={f.url} alt={`Frame ${i+1}`}
              className="shrink-0 h-44 object-contain rounded-lg border hover:scale-105 transition-transform cursor-pointer bg-black/30"
              style={{width:"auto"}}
              loading="lazy" onClick={() => window.open(f.url, "_blank")} />
          ))}
        </div>
      )}
      <AnalysisResults result={result} frames={urls} isPortrait={isPortrait} />
    </>
  );
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [result, setResult] = useState<JobResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let interval: ReturnType<typeof setInterval>;

    async function fetchData() {
      try {
        const data = await getResults(id);
        setResult(data);

        if (data.status === "completed" || data.status === "failed" || data.status === "partial") {
          clearInterval(interval);
          setLoading(false);
          if (data.status === "completed") {
            const viewed = JSON.parse(localStorage.getItem("va_viewed") || "[]");
            if (!viewed.includes(id)) { viewed.push(id); localStorage.setItem("va_viewed", JSON.stringify(viewed)); }
          }
        }
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
        clearInterval(interval);
      }
    }

    fetchData();
    interval = setInterval(fetchData, 3000);

    return () => clearInterval(interval);
  }, [id]);

  if (loading && !result) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !result) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">加载失败</p>
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => router.push("/")}>
          返回首页
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{result?.filename || "分析结果"}</h1>
            <div className="flex items-center gap-2 mt-1">
              {result && (
                <StatusBadge
                  status={result.status}
                  currentStep={result.status === "completed" ? "completed" : undefined}
                />
              )}
              {result?.processing_time_seconds && (
                <span className="text-xs text-muted-foreground">
                  耗时 {result.processing_time_seconds}s
                </span>
              )}
              {result?.video_duration_seconds && (
                <span className="text-xs text-muted-foreground">
                  视频 {result.video_duration_seconds}s
                </span>
              )}
            </div>
          </div>
        </div>

        {result?.analysis && (
          <ExportMenu result={result.analysis} jobId={id} />
        )}
      </div>

      {/* Loading State */}
      {result?.status !== "completed" && result?.status !== "failed" && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-lg font-medium">分析进行中...</p>
            <Progress value={result?.progress_pct || 0} className="max-w-xs mx-auto" />
            <p className="text-sm text-muted-foreground">{result?.current_step || "等待中"}</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {result?.status === "failed" && (
        <Card className="border-destructive">
          <CardContent className="py-12 text-center space-y-4">
            <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
            <p className="text-lg font-medium">分析失败</p>
            <p className="text-sm text-muted-foreground">{result.error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result?.analysis && (
        <>
          <AnalyticsSummary result={result.analysis} />
          <AnalysisResultsWithFrames jobId={id} result={result.analysis} />
        </>
      )}
    </div>
  );
}

function AnalyticsSummary({ result }: { result: NonNullable<JobResult["analysis"]> }) {
  const scores = [
    { label: "说服力", score: result.content_and_tags.marketing_copy.persuasiveness_score },
    { label: "开头钩子", score: result.content_and_tags.content_structure.opening_hook.effectiveness_score },
    { label: "结尾转化", score: result.content_and_tags.content_structure.closing.effectiveness_score },
    { label: "价值塑造", score: result.value_shaping.value_shaping_score },
    { label: "CTA 清晰度", score: result.cta_analysis.cta_clarity_score },
  ];

  const avg = Math.round(scores.reduce((s, c) => s + c.score, 0) / scores.length * 10) / 10;

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
      <CardHeader>
        <CardTitle className="text-lg">综合评分</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6 mb-4">
          <div className="text-center">
            <span className="text-4xl font-bold text-primary">{avg}</span>
            <p className="text-xs text-muted-foreground">总评分 / 5</p>
          </div>
          <div className="flex-1 grid grid-cols-5 gap-2">
            {scores.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-lg font-bold">{s.score}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
