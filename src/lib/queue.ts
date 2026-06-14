import { db } from "./db";
import { detectPlatform, getPlatformName } from "./platforms";
import { downloadVideo } from "./downloader";
import { extractMetadata } from "./metadata";
import { analyzeVideo } from "./analyzer";

type JobHandler = () => Promise<void>;

class VideoQueue {
  private queue: Array<{ id: string; handler: JobHandler }> = [];
  private running = 0;
  private maxConcurrency = 3;
  private processing = false;

  async add(videoId: string): Promise<void> {
    this.queue.push({
      id: videoId,
      handler: () => this.processVideo(videoId),
    });
    this.tick();
  }

  async addBatch(videoIds: string[]): Promise<void> {
    for (const id of videoIds) {
      this.queue.push({
        id,
        handler: () => this.processVideo(id),
      });
    }
    this.tick();
  }

  getStatus(): { queueLength: number; running: number } {
    return {
      queueLength: this.queue.length,
      running: this.running,
    };
  }

  private async tick() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0 && this.running < this.maxConcurrency) {
      const job = this.queue.shift();
      if (!job) break;

      this.running++;
      job.handler()
        .catch((err) => {
          console.error(`Job ${job.id} failed:`, err);
        })
        .finally(() => {
          this.running--;
          this.tick();
        });
    }

    this.processing = false;
  }

  private async processVideo(videoId: string) {
    const video = await db.video.findUnique({ where: { id: videoId } });
    if (!video) return;

    try {
      // Step 1: Download
      await db.video.update({ where: { id: videoId }, data: { status: "downloading" } });
      const downloadResult = await downloadVideo(video.url, videoId);

      await db.video.update({
        where: { id: videoId },
        data: {
          title: downloadResult.title,
          filePath: downloadResult.filePath,
          fileSize: downloadResult.fileSize,
          duration: downloadResult.duration,
          status: "downloaded",
        },
      });

      // Step 2: Technical metadata
      const metadata = await extractMetadata(downloadResult.filePath);

      await db.analysis.create({
        data: {
          videoId,
          type: "technical",
          summary: `分辨率: ${metadata.resolution} | 编码: ${metadata.codec} | FPS: ${metadata.fps} | 时长: ${Math.round(metadata.duration)}s | 大小: ${(metadata.fileSize / 1024 / 1024).toFixed(1)}MB`,
          tags: JSON.stringify({
            resolution: metadata.resolution,
            codec: metadata.codec,
            bitrate: metadata.bitrate,
            fps: metadata.fps,
            duration: metadata.duration,
            fileSize: metadata.fileSize,
            format: metadata.format,
            audioCodec: metadata.audioCodec,
            audioBitrate: metadata.audioBitrate,
          }),
          rawResult: JSON.stringify(metadata),
        },
      });

      // Step 3: Content analysis via MiMo
      await db.video.update({ where: { id: videoId }, data: { status: "analyzing" } });

      // Determine public URL for MiMo
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const videoUrl = `${baseUrl}/api/media/${videoId}`;

      const analysis = await analyzeVideo(videoUrl);

      await db.analysis.create({
        data: {
          videoId,
          type: "content",
          summary: analysis.summary,
          tags: JSON.stringify(analysis.tags),
          sentiment: analysis.sentiment,
          rawResult: JSON.stringify(analysis),
        },
      });

      await db.video.update({ where: { id: videoId }, data: { status: "completed" } });
    } catch (error: any) {
      await db.video.update({
        where: { id: videoId },
        data: { status: "error", error: error.message },
      });
    }
  }
}

export const videoQueue = new VideoQueue();
