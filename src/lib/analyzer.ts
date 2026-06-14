import OpenAI from "openai";
import { db } from "./db";

async function getClient() {
  let apiKey = process.env.MIMO_API_KEY || "";
  let baseURL = process.env.MIMO_BASE_URL || "https://api.xiaomimimo.com/v1";

  try {
    const settings = await db.settings.findMany();
    for (const s of settings) {
      if (s.key === "api_key" && s.value) apiKey = s.value;
      if (s.key === "base_url" && s.value) baseURL = s.value;
    }
  } catch {}

  return new OpenAI({
    apiKey,
    baseURL,
    defaultHeaders: { "api-key": apiKey },
  });
}

async function getModel(): Promise<string> {
  try {
    const s = await db.settings.findUnique({ where: { key: "model" } });
    if (s?.value) return s.value;
  } catch {}
  return process.env.MIMO_MODEL || "mimo-v2.5";
}

const SYSTEM_PROMPT = `你是MiMo(中文名称也是MiMo),是小米公司研发的AI智能助手。今天的日期:${new Date().toLocaleDateString("zh-CN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })},你的知识截止日期是2024年12月。`;

const ANALYSIS_PROMPT = `请对这个视频进行全面分析，按以下格式返回JSON结果（仅返回JSON，不要其他文字）：

{
  "sceneDescription": "视频画面的详细描述（中文，200字以内）",
  "mainSubjects": ["主体1", "主体2"],
  "visualStyle": "视觉风格描述",
  "audioDescription": "音频描述（背景音乐、人声、音效等）",
  "onscreenText": "视频中出现的文字/字幕内容",
  "tags": ["标签1", "标签2", "标签3", "标签4", "标签5"],
  "category": "内容分类（如：娱乐、教育、美食、旅游、科技、体育、音乐、生活等）",
  "sentiment": "正面/中性/负面",
  "qualityScore": 8,
  "summary": "一句话总结（30字以内）"
}`;

export interface ContentAnalysis {
  sceneDescription: string;
  mainSubjects: string[];
  visualStyle: string;
  audioDescription: string;
  onscreenText: string;
  tags: string[];
  category: string;
  sentiment: string;
  qualityScore: number;
  summary: string;
}

export async function analyzeVideo(videoUrl: string): Promise<ContentAnalysis> {
  const client = await getClient();
  const model = await getModel();

  const messages = [
    {
      role: "system" as const,
      content: SYSTEM_PROMPT,
    },
    {
      role: "user" as const,
      content: [
        {
          type: "video_url" as any,
          video_url: { url: videoUrl },
          fps: 1,
          media_resolution: "low",
        },
        {
          type: "text" as const,
          text: ANALYSIS_PROMPT,
        },
      ],
    },
  ];

  const completion = await client.chat.completions.create({
    model,
    messages: messages as any,
    max_completion_tokens: 2048,
  });

  const rawContent = completion.choices[0]?.message?.content || "{}";

  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : rawContent;

  try {
    const result: ContentAnalysis = JSON.parse(jsonStr);
    return result;
  } catch {
    return {
      sceneDescription: rawContent,
      mainSubjects: [],
      visualStyle: "",
      audioDescription: "",
      onscreenText: "",
      tags: [],
      category: "未分类",
      sentiment: "中性",
      qualityScore: 0,
      summary: rawContent.slice(0, 30),
    };
  }
}
