"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, AlertTriangle, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AnalysisResults } from "@/components/results/AnalysisResults";
import { ExportMenu } from "@/components/results/ExportMenu";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { getResults } from "@/lib/api";
import type { JobResult, AnalysisResult } from "@/lib/types";

function PromptCard({ name, data }: { name: string; data: any }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card>
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-base">{name}</CardTitle>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => { navigator.clipboard.writeText(data.prompt || ""); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
          {copied ? <><Check className="h-3 w-3"/>Copied</> : <><Copy className="h-3 w-3"/>Copy</>}
        </Button>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.prompt || "N/A"}</p>
        {(data.negative_prompt || data.style_note) && <p className="text-xs text-destructive">{data.negative_prompt ? `Negative: ${data.negative_prompt}` : `Style: ${data.style_note}`}</p>}
      </CardContent>
    </Card>
  );
}

function ImageAnalysisResult({ analysis, filename, jobId }: { analysis: any; filename: string; jobId: string }) {
  const bp = analysis.basic_params || {};
  // Find the actual uploaded filename from the parent result
  const imgUrl = `http://localhost:8001/api/images/file/${filename}`;
  const cd = analysis.content_desc || {};
  const ec = analysis.ecommerce || {};
  const mk = analysis.marketing || {};
  // Detect reverse mode and model type
  const isImageReverse = typeof analysis.nano_banana_pro === "object";
  const isVideoReverse = typeof analysis.seedance_2 === "object";
  const isReverse = isImageReverse || isVideoReverse;

  if (isReverse) {
    const models = isVideoReverse
      ? [["Seedance 2.0", "seedance_2"], ["Veo 3", "veo_3"], ["Sora 2", "sora_2"]]
      : [["Nano Banana Pro", "nano_banana_pro"], ["GPT Image 2", "gpt_image_2"], ["Seedream", "seedream"], ["Flux", "flux"], ["Qwen-Image", "qwen_image"], ["ZImage", "zimage"]];
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Prompt Reverse Engineering</h2>
        {models.map(([name, key]) => (
          <PromptCard key={key} name={name} data={analysis[key] || {}} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4 flex justify-center">
          <img src={imgUrl} alt="Analyzed" className="max-h-80 object-contain rounded-lg" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="py-3 px-4"><CardTitle className="text-base">{filename}</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Resolution:</span> {bp.resolution||"?"}</div>
            <div><span className="text-muted-foreground">Format:</span> {bp.format||"?"}</div>
            <div><span className="text-muted-foreground">Ratio:</span> {bp.aspect_ratio||"?"}</div>
            <div><span className="text-muted-foreground">Quality:</span> {bp.quality_assessment||"?"}/5</div>
            <div><span className="text-muted-foreground">Color:</span> {bp.color_profile||"?"}</div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="py-3 px-4"><CardTitle className="text-base">Content</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0 text-sm space-y-1">
          <p><strong>Subject:</strong> {cd.main_subject||"?"}</p>
          <p><strong>Scene:</strong> {cd.scene_type||"?"}</p>
          <p><strong>Style:</strong> {cd.visual_style||"?"}</p>
          {cd.text_overlays?.length > 0 && <p><strong>Text:</strong> {cd.text_overlays.join(", ")}</p>}
          {cd.props_elements?.length > 0 && <p><strong>Props:</strong> {cd.props_elements.join(", ")}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="py-3 px-4"><CardTitle className="text-base">E-Commerce Assessment</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Category:</span> {ec.product_category||"?"}</div>
            <div><span className="text-muted-foreground">Platform:</span> {ec.target_platform||"?"}</div>
            <div><span className="text-muted-foreground">Type:</span> {ec.listing_type||"?"}</div>
            <div><span className="text-muted-foreground">Score:</span> <Badge variant="default" className="text-xs">{ec.conversion_potential_score||"?"}/5</Badge></div>
          </div>
          {ec.improvement_suggestions?.length > 0 && (
            <div><h4 className="text-sm font-medium mb-1">Suggestions</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                {ec.improvement_suggestions.map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="py-3 px-4"><CardTitle className="text-base">Marketing</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0 text-sm space-y-1">
          <p><strong>Brand:</strong> {mk.brand_positioning||"?"}</p>
          <p><strong>Emotion:</strong> {mk.emotional_appeal||"?"}</p>
          <p><strong>Audience:</strong> {mk.target_audience||"?"}</p>
          <p><strong>Advantage:</strong> {mk.competitive_advantage||"?"}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function AnalysisResultsWithFrames({ jobId, result }: { jobId: string; result: AnalysisResult }) {
  const [frameData, setFrameData] = useState<{url:string;w:number;h:number}[]>([]);
  useEffect(() => {
    fetch(`http://localhost:8001/api/videos/${jobId}/frames`, { headers: { Authorization: `Bearer ${localStorage.getItem("va_token") || ""}` } })
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

  return <AnalysisResults result={result} frames={urls} isPortrait={isPortrait} />;
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
          const token = localStorage.getItem("va_token");
          fetch(`http://localhost:8001/api/auth/viewed/${id}`, { method: "POST", headers: { Authorization: `Bearer ${token || ""}` } }).catch(() => {});
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
            <h1 className="text-xl font-bold">{result?.original_filename || result?.filename || "分析结果"}</h1>
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
          {result.analysis.content_and_tags ? (
            <>
              <AnalyticsSummary result={result.analysis} />
              <AnalysisResultsWithFrames jobId={id} result={result.analysis} />
            </>
          ) : (
            <ImageAnalysisResult analysis={result.analysis} filename={result.filename || ""} jobId={id} />
          )}
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
