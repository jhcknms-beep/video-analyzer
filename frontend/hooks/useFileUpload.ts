"use client";

import { useState, useCallback, useRef } from "react";

const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"];
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/bmp", "image/gif", "image/svg+xml"];
const MAX_SIZE_MB = 500;

export interface UploadFile {
  file: File;
  id: string;
  previewUrl: string;
  error?: string;
}

export function useFileUpload(acceptImages: boolean = false) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const accepted = acceptImages ? IMAGE_TYPES : VIDEO_TYPES;

  const validateFile = (file: File): string | null => {
    if (!accepted.includes(file.type)) {
      return `Unsupported format: ${file.type || "unknown"}`;
    }
    if (file.size / (1024 * 1024) > MAX_SIZE_MB) {
      return `文件过大: ${(file.size / (1024 * 1024)).toFixed(0)}MB > ${MAX_SIZE_MB}MB`;
    }
    return null;
  };

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const entries: UploadFile[] = Array.from(newFiles).map((file) => ({
      file,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      previewUrl: URL.createObjectURL(file),
      error: validateFile(file) || undefined,
    }));
    setFiles((prev) => [...prev, ...entries]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const entry = prev.find((f) => f.id === id);
      if (entry) URL.revokeObjectURL(entry.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const clearFiles = useCallback(() => {
    files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setFiles([]);
  }, [files]);

  const validFiles = files.filter((f) => !f.error);

  return {
    files,
    validFiles,
    isUploading,
    setIsUploading,
    addFiles,
    removeFile,
    clearFiles,
    inputRef,
  };
}
