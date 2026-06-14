"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { UploadFile } from "@/hooks/useFileUpload";

interface Props {
  files: UploadFile[];
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveFile: (id: string) => void;
  onClearFiles: () => void;
  onUpload: () => void;
  isUploading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function BatchUploadZone({
  files,
  onAddFiles,
  onRemoveFile,
  onClearFiles,
  onUpload,
  isUploading,
  inputRef,
}: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files?.length) {
        onAddFiles(e.dataTransfer.files);
      }
    },
    [onAddFiles]
  );

  const validFiles = files.filter((f) => !f.error);

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        ref={dropRef}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
          transition-all duration-200
          ${isDragging
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
          }
        `}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) onAddFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          {isDragging ? "松开以上传视频" : "拖拽视频文件到这里"}
        </h3>
        <p className="text-sm text-muted-foreground">
          或点击此处选择文件 · 支持 MP4, MOV, AVI, WebM · 单文件最大 500MB
        </p>
      </div>

      {/* File Preview List */}
      {files.length > 0 && <FilePreviewList files={files} onRemove={onRemoveFile} />}

      {/* Actions */}
      {files.length > 0 && (
        <div className="flex items-center gap-3">
          <Button
            onClick={onUpload}
            disabled={isUploading || validFiles.length === 0}
            className="gap-2"
          >
            <Film className="h-4 w-4" />
            {isUploading ? "上传中..." : `开始分析 (${validFiles.length} 个视频)`}
          </Button>
          <Button variant="ghost" onClick={onClearFiles} disabled={isUploading}>
            清空列表
          </Button>
        </div>
      )}
    </div>
  );
}

function FilePreviewList({
  files,
  onRemove,
}: {
  files: UploadFile[];
  onRemove: (id: string) => void;
}) {
  const [playing, setPlaying] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<Record<string, {w:number;h:number}>>({});

  const getDimensions = (id: string, el: HTMLVideoElement | null) => {
    if (!el || dimensions[id]) return;
    el.onloadedmetadata = () => {
      setDimensions(prev => ({ ...prev, [id]: { w: el.videoWidth, h: el.videoHeight } }));
    };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {files.map((f) => {
        const dim = dimensions[f.id];
        const isPortrait = dim ? dim.h > dim.w : false;
        return (
          <Card key={f.id} className={`overflow-hidden group ${f.error ? "border-destructive/50" : ""}`}>
            <div className="relative">
              {f.id === playing ? (
                <video
                  src={f.previewUrl}
                  ref={(el) => getDimensions(f.id, el)}
                  className="w-full"
                  style={{ maxHeight: 360, objectFit: "contain", background: "#000" }}
                  controls
                  autoPlay
                  onEnded={() => setPlaying(null)}
                />
              ) : (
                <div
                  className="relative w-full cursor-pointer bg-black flex items-center justify-center"
                  style={{ maxHeight: 240 }}
                  onClick={() => setPlaying(f.id)}
                >
                  <video
                    src={f.previewUrl}
                    ref={(el) => getDimensions(f.id, el)}
                    className="w-full h-full object-contain opacity-80"
                    muted
                    preload="metadata"
                    style={{ maxHeight: 240 }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-4xl opacity-80">▶</span>
                  </div>
                </div>
              )}
              <button
                className="absolute top-2 right-2 bg-background/80 hover:bg-background rounded-full p-1 transition-opacity z-10"
                onClick={(e) => { e.stopPropagation(); onRemove(f.id); }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3">
              <p className="text-sm truncate font-medium" title={f.file.name}>{f.file.name}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>{(f.file.size / (1024 / 1024)).toFixed(1)} MB</span>
                {dim && <span>· {dim.w}×{dim.h}</span>}
                {dim && <Badge variant="secondary" className="text-[10px] px-1 py-0">{isPortrait ? "Portrait" : "Landscape"}</Badge>}
                {f.error && <span className="text-destructive">{f.error}</span>}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
