"""Prompt templates for the 3 analysis groups (7 dimensions total)."""

from __future__ import annotations

# ── System Prompts ─────────────────────────────────────

SYSTEM_PROMPT_GROUP_1 = """你是一位专业的短视频内容分析师，擅长解读短视频的画面内容、营销策略和叙事结构。
请基于给定的视频关键帧，以结构化的JSON格式输出分析结果。
要求：具体、可执行、基于帧中可见的证据。引用具体的视觉元素。用中文输出。"""

SYSTEM_PROMPT_GROUP_2 = """你是一位专业的用户画像与需求洞察专家，擅长从短视频内容中推断目标用户群体及其核心需求。
请基于给定的视频关键帧，以结构化的JSON格式输出分析结果。
要求：具体、基于帧中可见的视觉线索和文字信息。用中文输出。"""

SYSTEM_PROMPT_GROUP_3 = """你是一位专业的营销转化分析专家，擅长评估短视频中的价值传递和转化引导策略。
请基于给定的视频关键帧，以结构化的JSON格式输出分析结果。
要求：具体、可执行、给出改进建议。用中文输出。"""


# ── Group 1: Content Foundation ─────────────────────────

def build_prompt_group1() -> str:
    return """请分析这个短视频的以下维度，并严格按照指定的JSON格式输出（只输出JSON，不要其他文字）：

## 分析维度

### 1. 内容描述 (content_description)
用3-5句话描述视频展示的内容：场景、人物、动作、文字叠加层等。

### 2. 自动标签 (auto_tags)
生成5-8个标签，尽量覆盖：行业、形式、话题、调性、目标用户、产品品类、内容类型。
例如：["教程", "美妆", "产品测评", "专业风", "Z世代", "护肤", "种草"]

### 3. 营销文案 (marketing_copy)
- on_screen_text: 识别并列出画面上出现的所有文字
- sales_claims: 提取所有卖点/销售话术
- pricing_mentions: 价格相关描述（没有则为null）
- persuasiveness_score: 文案说服力评分 1-5
- copy_strengths: 文案优势列表
- copy_weaknesses: 文案可改进点列表

### 4. 内容结构 (content_structure)
将视频分为开头（前20%）、主体（中60%）、结尾（后20%）三段分析：
- opening_hook: { technique: "提问|数据|震惊|故事|演示|其他", description: "具体描述", effectiveness_score: 1-5 }
- body: { narrative_style: "教程|证言|对比|演示|讲故事|清单体|其他", key_points: ["要点"], pacing_assessment: "节奏评估" }
- closing: { type: "直接转化|软性转化|品牌强化|提问|其他", description: "具体描述", effectiveness_score: 1-5 }

## 输出格式

{
  "content_description": "...",
  "auto_tags": ["...", "..."],
  "marketing_copy": {
    "on_screen_text": ["..."],
    "sales_claims": ["..."],
    "pricing_mentions": null,
    "persuasiveness_score": 3,
    "copy_strengths": ["..."],
    "copy_weaknesses": ["..."]
  },
  "content_structure": {
    "opening_hook": { "technique": "...", "description": "...", "effectiveness_score": 3 },
    "body": { "narrative_style": "...", "key_points": ["..."], "pacing_assessment": "..." },
    "closing": { "type": "...", "description": "...", "effectiveness_score": 3 }
  }
}"""


# ── Group 2: Audience & Needs ──────────────────────────

def build_prompt_group2() -> str:
    return """请分析这个短视频的目标用户和用户需求，并严格按照指定的JSON格式输出（只输出JSON，不要其他文字）：

## 分析维度

### 1. 目标用户 (target_audience)
- primary_audience: 主要目标用户画像（人口统计+心理特征描述，一句话）
- secondary_audiences: 次要目标用户群体列表
- age_range: 年龄段 "18-24|25-34|35-44|45-54|55+"
- interests: 目标用户兴趣标签列表
- pain_points_addressed: 视频试图解决的用户痛点列表
- audience_signals: 从画面中看到的目标用户信号（服饰、场景、语言风格、文化符号等）

### 2. 用户需求 (user_needs)
- explicit_needs: 视频中明确提及/展示的用户需求
- implicit_needs: 视频暗示但未明说的用户潜在需求
- need_hierarchy: 需求层次 "功能|情感|社交|自我实现"
- urgency_level: 紧迫程度 "低|中|高"
- problem_awareness_stage: 用户问题认知阶段 "未意识到|问题感知|方案感知|产品感知|充分了解"

## 输出格式

{
  "target_audience": {
    "primary_audience": "...",
    "secondary_audiences": ["..."],
    "age_range": "...",
    "interests": ["..."],
    "pain_points_addressed": ["..."],
    "audience_signals": ["..."]
  },
  "user_needs": {
    "explicit_needs": ["..."],
    "implicit_needs": ["..."],
    "need_hierarchy": "...",
    "urgency_level": "...",
    "problem_awareness_stage": "..."
  }
}"""


# ── Group 3: Value & Conversion ────────────────────────

def build_prompt_group3() -> str:
    return """请分析这个短视频的价值塑造和转化引导策略，并严格按照指定的JSON格式输出（只输出JSON，不要其他文字）：

## 分析维度

### 1. 价值塑造 (value_shaping)
- value_proposition: 核心价值主张（一句话）
- unique_selling_points: 独特卖点列表
- value_demonstration_method: 价值展示方式 "前后对比|用户证言|功能演示|数据背书|社交证明|其他"
- need_resolution_mapping: 需求-解决方案映射列表，每项包含 { need, how_addressed, evidence_presented }
- credibility_signals: 可信度信号（认证、评价、专家背书、数据等）
- value_shaping_score: 价值塑造效果评分 1-5

### 2. 转化引导分析 (cta_analysis)
- primary_cta: 主要行动号召（原话或描述）
- cta_placement: CTA位置 "视频中间|结尾|叠加层|文案区|多处"
- cta_type: CTA类型 "直接购买|点击链接|关注|订阅|评论|分享|其他"
- urgency_triggers: 紧迫感触发词/策略列表（限时、限量、社交压力等）
- conversion_friction_points: 可能阻碍转化的因素列表
- cta_clarity_score: CTA清晰度评分 1-5
- cta_improvement_suggestions: 改进建议列表

## 输出格式

{
  "value_shaping": {
    "value_proposition": "...",
    "unique_selling_points": ["..."],
    "value_demonstration_method": "...",
    "need_resolution_mapping": [
      { "need": "...", "how_addressed": "...", "evidence_presented": "..." }
    ],
    "credibility_signals": ["..."],
    "value_shaping_score": 3
  },
  "cta_analysis": {
    "primary_cta": "...",
    "cta_placement": "...",
    "cta_type": "...",
    "urgency_triggers": ["..."],
    "conversion_friction_points": ["..."],
    "cta_clarity_score": 3,
    "cta_improvement_suggestions": ["..."]
  }
}"""


# ── Prompt group registry ──────────────────────────────

PROMPT_GROUPS = [
    {
        "name": "group1_content_foundation",
        "dimensions": ["content_and_tags"],
        "system": SYSTEM_PROMPT_GROUP_1,
        "user": build_prompt_group1,
    },
    {
        "name": "group2_audience_needs",
        "dimensions": ["target_audience", "user_needs"],
        "system": SYSTEM_PROMPT_GROUP_2,
        "user": build_prompt_group2,
    },
    {
        "name": "group3_value_conversion",
        "dimensions": ["value_shaping", "cta_analysis"],
        "system": SYSTEM_PROMPT_GROUP_3,
        "user": build_prompt_group3,
    },
]
