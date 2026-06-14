import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { detectPlatform } from "@/lib/platforms";
import { videoQueue } from "@/lib/queue";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const platform = detectPlatform(url);

    const video = await db.video.create({
      data: {
        url,
        platform,
        status: "pending",
      },
    });

    // Add to processing queue (async, non-blocking)
    videoQueue.add(video.id);

    return NextResponse.json(video, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const videos = await db.video.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        analyses: true,
      },
    });
    return NextResponse.json(videos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
