// ── Job Types ──────────────────────────────

export type JobStatus =
  | "pending"
  | "queued"
  | "extracting_frames"
  | "analyzing"
  | "completed"
  | "partial"
  | "failed"
  | "paused";

export interface JobMeta {
  job_id: string;
  filename: string;
  original_filename: string;
  file_size_bytes: number;
  video_duration_seconds: number | null;
  status: JobStatus;
  progress_pct: number;
  current_step: string;
  dimension: string | null;
  error: string | null;
  created_at: string;
}

// ── Analysis Result Types ─────────────────

export interface MarketingCopy {
  on_screen_text: string[];
  sales_claims: string[];
  pricing_mentions: string | null;
  persuasiveness_score: number;
  copy_strengths: string[];
  copy_weaknesses: string[];
}

export interface OpeningHook {
  technique: string;
  description: string;
  effectiveness_score: number;
}

export interface BodySegment {
  narrative_style: string;
  key_points: string[];
  pacing_assessment: string;
}

export interface ClosingSegment {
  type: string;
  description: string;
  effectiveness_score: number;
}

export interface ContentStructure {
  opening_hook: OpeningHook;
  body: BodySegment;
  closing: ClosingSegment;
}

export interface ContentAndTags {
  content_description: string;
  auto_tags: string[];
  marketing_copy: MarketingCopy;
  content_structure: ContentStructure;
}

export interface TargetAudience {
  primary_audience: string;
  secondary_audiences: string[];
  age_range: string;
  interests: string[];
  pain_points_addressed: string[];
  audience_signals: string[];
}

export interface UserNeeds {
  explicit_needs: string[];
  implicit_needs: string[];
  need_hierarchy: string;
  urgency_level: string;
  problem_awareness_stage: string;
}

export interface NeedResolutionMapping {
  need: string;
  how_addressed: string;
  evidence_presented: string;
}

export interface ValueShaping {
  value_proposition: string;
  unique_selling_points: string[];
  value_demonstration_method: string;
  need_resolution_mapping: NeedResolutionMapping[];
  credibility_signals: string[];
  value_shaping_score: number;
}

export interface CTAAnalysis {
  primary_cta: string;
  cta_placement: string;
  cta_type: string;
  urgency_triggers: string[];
  conversion_friction_points: string[];
  cta_clarity_score: number;
  cta_improvement_suggestions: string[];
}

export interface AnalysisResult {
  content_and_tags: ContentAndTags;
  target_audience: TargetAudience;
  user_needs: UserNeeds;
  value_shaping: ValueShaping;
  cta_analysis: CTAAnalysis;
}

export interface JobResult {
  job_id: string;
  filename: string;
  status: JobStatus;
  progress_pct: number;
  current_step: string;
  video_duration_seconds: number | null;
  analysis: AnalysisResult | null;
  error: string | null;
  processing_time_seconds: number | null;
}

// ── WebSocket ──────────────────────────────

export interface WSProgressMessage {
  type: "progress";
  job_id: string;
  filename: string;
  status: JobStatus;
  progress_pct: number;
  current_step: string;
  dimension: string | null;
  error: string | null;
}

export interface WSSyncMessage {
  type: "sync";
  jobs: WSProgressMessage[];
}

export type WSMessage = WSProgressMessage | WSSyncMessage;
