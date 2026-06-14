import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface TechnicalMetadata {
  resolution: string;      // e.g. "1920x1080"
  width: number;
  height: number;
  codec: string;           // e.g. "h264"
  bitrate: string;         // e.g. "2500 kb/s"
  fps: number;
  duration: number;        // seconds
  fileSize: number;        // bytes
  format: string;          // container format
  audioCodec: string;
  audioBitrate: string;
}

export async function extractMetadata(filePath: string): Promise<TechnicalMetadata> {
  const cmd = [
    "ffprobe",
    "-v", "quiet",
    "-print_format", "json",
    "-show_format",
    "-show_streams",
    `"${filePath}"`,
  ].join(" ");

  try {
    const { stdout } = await execAsync(cmd, { timeout: 30000 });
    const data = JSON.parse(stdout);

    const videoStream = data.streams?.find((s: any) => s.codec_type === "video");
    const audioStream = data.streams?.find((s: any) => s.codec_type === "audio");
    const format = data.format || {};

    return {
      resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : "unknown",
      width: videoStream?.width || 0,
      height: videoStream?.height || 0,
      codec: videoStream?.codec_name || "unknown",
      bitrate: format.bit_rate ? `${Math.round(parseInt(format.bit_rate) / 1000)} kb/s` : "unknown",
      fps: videoStream?.r_frame_rate
        ? (() => {
            const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
            return den ? Math.round(num / den) : 0;
          })()
        : 0,
      duration: parseFloat(format.duration || "0"),
      fileSize: parseInt(format.size || "0", 10),
      format: format.format_name || "unknown",
      audioCodec: audioStream?.codec_name || "unknown",
      audioBitrate: audioStream?.bit_rate
        ? `${Math.round(parseInt(audioStream.bit_rate) / 1000)} kb/s`
        : "unknown",
    };
  } catch (error: any) {
    throw new Error(`Metadata extraction failed: ${error.message}`);
  }
}
