import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { detectPlatform } from "@/lib/platforms";
import { videoQueue } from "@/lib/queue";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { urls } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "URLs array is required" }, { status: 400 });
    }

    const videos = [];
    const videoIds: string[] = [];

    for (const url of urls) {
      if (typeof url !== "string" || !url.trim()) continue;

      const platform = detectPlatform(url.trim());
      const video = await db.video.create({
        data: {
          url: url.trim(),
          platform,
          status: "pending",
        },
      });
      videos.push(video);
      videoIds.push(video.id);
    }

    // Add all to queue
    videoQueue.addBatch(videoIds);

    return NextResponse.json({ videos, count: videos.length }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
