"""Prompt templates for image analysis - Content & Prompt Reverse-Engineering."""

# ── Content Analysis (e-commerce product focus) ──

SYSTEM_PROMPT_IMAGE_CONTENT = """You are an expert e-commerce product image analyst. Analyze the provided image and output structured JSON. Be specific, actionable, and evidence-based. Output in Chinese."""


def build_image_content_prompt() -> str:
    return """Analyze this product image. You MUST output ONLY a valid JSON object starting with { and ending with }. No markdown, no code fences, no explanation text. Just the pure JSON object.

## Analysis Dimensions

### 1. Basic Parameters (basic_params)
- format: Image format (JPEG/PNG/WebP/etc)
- resolution: "WIDTHxHEIGHT" (e.g., "1200x1600")
- aspect_ratio: "1:1", "4:3", "3:4", "16:9", "9:16", etc.
- color_profile: Dominant color scheme (e.g., "warm neutral", "cool blue", "vibrant red")
- quality_assessment: Overall image quality rating 1-5

### 2. Content Description (content_desc)
- main_subject: What is the primary product shown?
- scene_type: "white background", "lifestyle", "studio", "outdoor", "flat lay", "close-up"
- props_elements: List any props, models, or decorative elements
- text_overlays: Any text visible on the image (price, promo, brand name)
- visual_style: "minimalist", "luxury", "casual", "professional", "vibrant"

### 3. E-Commerce Assessment (ecommerce)
- product_category: Inferred category (apparel, electronics, beauty, home, food, etc.)
- target_platform: Which platform this style best fits (Amazon, Shopee, Taobao, TikTok Shop, JD, VIP)
- listing_type: "main image", "detail image", "lifestyle shot", "size chart", "comparison"
- conversion_potential_score: 1-5 rating of how effective this image is for sales
- improvement_suggestions: List 2-3 specific improvements

### 4. Marketing Analysis (marketing)
- brand_positioning: Inferred brand tier (budget, mid-range, premium, luxury)
- emotional_appeal: What emotion does this image evoke? (desire, trust, urgency, aspiration)
- target_audience: Demographics this image targets
- competitive_advantage: What makes this product stand out visually?

Output JSON format:
{
  "basic_params": { "format": "", "resolution": "", "aspect_ratio": "", "color_profile": "", "quality_assessment": 0 },
  "content_desc": { "main_subject": "", "scene_type": "", "props_elements": [], "text_overlays": [], "visual_style": "" },
  "ecommerce": { "product_category": "", "target_platform": "", "listing_type": "", "conversion_potential_score": 0, "improvement_suggestions": [] },
  "marketing": { "brand_positioning": "", "emotional_appeal": "", "target_audience": "", "competitive_advantage": "" }
}"""


# ── Prompt Reverse-Engineering ──

SYSTEM_PROMPT_IMAGE_REVERSE = """You are an expert AI prompt engineer. Your task is to analyze the provided image and generate detailed prompts that would recreate similar images using various AI image generation models. Be specific about visual details, lighting, composition, and style. Output structured JSON only."""


def build_image_reverse_prompt() -> str:
    return """Analyze this image and generate prompts for these AI image models. You MUST output ONLY a valid JSON object starting with { and ending with }. No markdown, no code fences, no explanation text.

## Models to generate prompts for:

### nano banana pro
Focus: realistic product photography, accurate details, clean commercial look
Include: subject description, lighting setup, camera angle, background, product details

### GPT Image 2
Focus: creative detail, artistic quality, composition
Include: scene description, mood, color palette, style references

### Seedream
Focus: photorealistic quality, texture detail, natural lighting
Include: camera specs, lighting conditions, composition rules, post-processing

### Flux
Focus: high-quality general purpose, balanced aesthetics
Include: subject, environment, lighting, mood, technical parameters

### Qwen-Image
Focus: multilingual understanding, cultural context, Asian market optimization
Include: scene, cultural elements, market-specific details, composition

### ZImage
Focus: creative freedom, artistic expression, unique visual approaches
Include: artistic direction, creative elements, experimental techniques, visual story

Output JSON format:
{
  "nano_banana_pro": { "prompt": "", "negative_prompt": "" },
  "gpt_image_2": { "prompt": "", "negative_prompt": "" },
  "seedream": { "prompt": "", "negative_prompt": "" },
  "flux": { "prompt": "", "negative_prompt": "" },
  "qwen_image": { "prompt": "", "negative_prompt": "" },
  "zimage": { "prompt": "", "negative_prompt": "" }
}"""


# ── Video Prompt Reverse-Engineering ──

SYSTEM_PROMPT_VIDEO_REVERSE = """You are an expert AI video prompt engineer. Analyze these video frames and generate detailed prompts to recreate similar videos. Output structured JSON only."""


def build_video_reverse_prompt() -> str:
    return """Analyze these video keyframes and generate prompts for these AI video models. Output ONLY valid JSON.

## Models:

### Seedance 2.0
Focus: cinematic quality, smooth motion, natural physics
Include: scene description, camera movement, subject action, lighting, duration

### Veo 3
Focus: professional video production, storytelling, visual consistency
Include: shot description, camera angles, transitions, color grading, audio style

### Sora 2
Focus: creative video generation, complex scenes, physics simulation
Include: detailed scene, action sequence, environment, lighting, camera work

Output JSON format:
{
  "seedance_2": { "prompt": "", "style_note": "" },
  "veo_3": { "prompt": "", "style_note": "" },
  "sora_2": { "prompt": "", "style_note": "" }
}"""
