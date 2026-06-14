import { NextResponse } from "next/server";
import { videoQueue } from "@/lib/queue";

export async function GET() {
  const status = videoQueue.getStatus();
  return NextResponse.json(status);
}
