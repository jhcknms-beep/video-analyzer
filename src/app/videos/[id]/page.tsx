"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Tag,
  Smiley,
  Star,
  MonitorPlay,
  SpeakerHigh,
  Eye,
  TextAlignLeft,
  FilmSlate,
  Clock,
  HardDrive,
  Microphone,
  Waveform,
  CaretRight,
} from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface AnalysisItem {
  id: string;
  type: string;
  summary: string | null;
  tags: string | null;
  sentiment: string | null;
  rawResult: string | null;
}

interface VideoDetail {
  id: string;
  url: string;
  platform: string;
  title: string | null;
  status: string;
  error: string | null;
  filePath: string | null;
  fileSize: number | null;
  duration: number | null;
  createdAt: string;
  analyses: AnalysisItem[];
}

const platformLabels: Record<string, string> = {
  tiktok: "TikTok",
  douyin: "抖音",
  youtube: "YouTube",
  bilibili: "B站",
  kuaishou: "快手",
  xiaohongshu: "小红书",
};

export default function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideo();
    const interval = setInterval(fetchVideo, 3000);
    return () => clearInterval(interval);
  }, [id]);

  async function fetchVideo() {
    try {
      const res = await fetch(`/api/videos/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setVideo(data);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48 bg-zinc-800" />
        <Skeleton className="h-96 w-full bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-zinc-500">视频不存在</p>
        <Link href="/videos" className="mt-4 text-sm text-emerald-400 hover:text-emerald-300">
          返回列表
        </Link>
      </div>
    );
  }

  const contentAnalysis = video.analyses.find((a) => a.type === "content");
  const techAnalysis = video.analyses.find((a) => a.type === "technical");
  const contentData = contentAnalysis?.rawResult ? JSON.parse(contentAnalysis.rawResult) : null;
  const techData = techAnalysis?.tags ? JSON.parse(techAnalysis.tags) : null;
  const tags = contentAnalysis?.tags ? JSON.parse(contentAnalysis.tags) : [];

  return (
    <div className="space-y-8">
      {/* Back nav */}
      <Link
        href="/videos"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        返回列表
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          {video.title || "未命名视频"}
        </h1>
        <div className="flex items-center gap-3 mt-2">
          {video.platform !== "unknown" && (
            <Badge className="bg-white/[0.04] text-zinc-400 text-[11px]">
              {platformLabels[video.platform] || video.platform}
            </Badge>
          )}
          {video.status === "completed" && (
            <Badge className="bg-emerald-500/10 text-emerald-400 text-[11px]">分析完成</Badge>
          )}
          {video.status === "analyzing" && (
            <Badge className="bg-amber-500/10 text-amber-400 text-[11px]">分析中...</Badge>
          )}
          {video.status === "error" && (
            <Badge className="bg-red-500/10 text-red-400 text-[11px]">失败</Badge>
          )}
        </div>
      </div>

      {/* Error */}
      {video.error && (
        <div className="rounded-xl bg-red-500/5 border border-red-500/10 px-5 py-4">
          <p className="text-sm text-red-400">{video.error}</p>
        </div>
      )}

      {/* Content Analysis */}
      {contentData && (
        <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-6 backdrop-blur-sm">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-300 uppercase mb-5 flex items-center gap-2">
            <Eye weight="fill" className="h-4 w-4 text-emerald-400" />
            内容分析
          </h2>

          {/* Summary */}
          <div className="mb-6">
            <p className="text-base text-zinc-200 leading-relaxed">{contentData.summary || contentData.sceneDescription}</p>
          </div>

          {/* Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {contentData.sceneDescription && (
              <InfoBlock icon={TextAlignLeft} label="场景描述" value={contentData.sceneDescription} />
            )}
            {contentData.visualStyle && (
              <InfoBlock icon={MonitorPlay} label="视觉风格" value={contentData.visualStyle} />
            )}
            {contentData.audioDescription && (
              <InfoBlock icon={SpeakerHigh} label="音频描述" value={contentData.audioDescription} />
            )}
            {contentData.onscreenText && (
              <InfoBlock icon={TextAlignLeft} label="屏幕文字" value={contentData.onscreenText} />
            )}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center gap-2 mb-2">
                <Tag weight="fill" className="h-4 w-4 text-zinc-500" />
                <span className="text-xs font-medium text-zinc-500">标签</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag: string, i: number) => (
                  <Badge key={i} className="bg-white/[0.04] text-zinc-400 text-[11px] px-2.5 py-0.5">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Sentiment + Category + Quality */}
          <div className="grid grid-cols-3 gap-4 mt-5">
            {contentData.sentiment && (
              <div className="rounded-xl bg-zinc-950/50 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Smiley weight="fill" className="h-4 w-4 text-zinc-500" />
                  <span className="text-[11px] text-zinc-600">情绪倾向</span>
                </div>
                <p className="text-sm font-medium text-zinc-300">{contentData.sentiment}</p>
              </div>
            )}
            {contentData.category && (
              <div className="rounded-xl bg-zinc-950/50 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FilmSlate weight="fill" className="h-4 w-4 text-zinc-500" />
                  <span className="text-[11px] text-zinc-600">内容分类</span>
                </div>
                <p className="text-sm font-medium text-zinc-300">{contentData.category}</p>
              </div>
            )}
            {contentData.qualityScore !== undefined && (
              <div className="rounded-xl bg-zinc-950/50 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Star weight="fill" className="h-4 w-4 text-zinc-500" />
                  <span className="text-[11px] text-zinc-600">质量评分</span>
                </div>
                <p className="text-sm font-medium text-zinc-300">{contentData.qualityScore}/10</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Technical Metadata */}
      {techData && (
        <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-6 backdrop-blur-sm">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-300 uppercase mb-5 flex items-center gap-2">
            <MonitorPlay weight="fill" className="h-4 w-4 text-cyan-400" />
            技术参数
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {techData.resolution && (
              <TechItem icon={MonitorPlay} label="分辨率" value={techData.resolution} />
            )}
            {techData.codec && (
              <TechItem icon={FilmSlate} label="视频编码" value={techData.codec} />
            )}
            {techData.fps !== undefined && (
              <TechItem icon={CaretRight} label="帧率" value={`${techData.fps} FPS`} />
            )}
            {techData.duration !== undefined && (
              <TechItem icon={Clock} label="时长" value={`${Math.round(techData.duration)}秒`} />
            )}
            {techData.fileSize !== undefined && (
              <TechItem
                icon={HardDrive}
                label="文件大小"
                value={techData.fileSize > 0 ? `${(techData.fileSize / 1024 / 1024).toFixed(1)} MB` : "—"}
              />
            )}
            {techData.format && (
              <TechItem icon={FilmSlate} label="容器格式" value={techData.format} />
            )}
            {techData.bitrate && (
              <TechItem icon={Waveform} label="视频码率" value={techData.bitrate} />
            )}
            {techData.audioCodec && (
              <TechItem icon={Microphone} label="音频编码" value={techData.audioCodec} />
            )}
            {techData.audioBitrate && (
              <TechItem icon={SpeakerHigh} label="音频码率" value={techData.audioBitrate} />
            )}
          </div>
        </div>
      )}

      {/* Loading State for in-progress */}
      {!contentData && !techData && video.status !== "error" && (
        <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-10 backdrop-blur-sm text-center">
          <div className="flex justify-center mb-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
            </span>
          </div>
          <p className="text-sm text-zinc-400">
            {video.status === "pending"
              ? "排队等待处理..."
              : video.status === "downloading"
              ? "正在下载视频..."
              : video.status === "analyzing"
              ? "正在使用 MiMo 进行视频分析..."
              : "处理中..."}
          </p>
          <p className="text-xs text-zinc-600 mt-1">页面每 3 秒自动刷新</p>
        </div>
      )}

      {/* Raw URL */}
      <div className="rounded-xl border border-white/[0.04] bg-zinc-900/30 p-4">
        <p className="text-[11px] text-zinc-600 mb-1">原始链接</p>
        <p className="text-xs text-zinc-500 break-all">{video.url}</p>
      </div>
    </div>
  );
}

function InfoBlock({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-950/50 p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon weight="fill" className="h-4 w-4 text-zinc-600" />
        <span className="text-[11px] text-zinc-600">{label}</span>
      </div>
      <p className="text-sm text-zinc-300 leading-relaxed">{value}</p>
    </div>
  );
}

function TechItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-zinc-950/50 px-4 py-3">
      <Icon weight="fill" className="h-4 w-4 text-zinc-600 shrink-0" />
      <div>
        <p className="text-[11px] text-zinc-600">{label}</p>
        <p className="text-sm font-medium text-zinc-300 font-mono">{value}</p>
      </div>
    </div>
  );
}
