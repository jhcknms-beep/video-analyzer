"""Pydantic schemas for API requests/responses and analysis results."""

from __future__ import annotations

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


# ── Enums ──────────────────────────────────────────────

class JobStatus(str, Enum):
    PENDING = "pending"
    QUEUED = "queued"
    EXTRACTING_FRAMES = "extracting_frames"
    ANALYZING = "analyzing"
    COMPLETED = "completed"
    PARTIAL = "partial"
    FAILED = "failed"
    PAUSED = "paused"


class Dimension(str, Enum):
    CONTENT_AND_TAGS = "content_and_tags"
    MARKETING = "marketing"
    STRUCTURE = "structure"
    AUDIENCE = "audience"
    NEEDS = "needs"
    VALUE_SHAPING = "value_shaping"
    CTA = "cta"


# ── Analysis Result Sub-Models ─────────────────────────

class MarketingCopy(BaseModel):
    on_screen_text: list[str] = Field(default_factory=list)
    sales_claims: list[str] = Field(default_factory=list)
    pricing_mentions: Optional[str] = None
    persuasiveness_score: int = Field(ge=1, le=5, default=3)
    copy_strengths: list[str] = Field(default_factory=list)
    copy_weaknesses: list[str] = Field(default_factory=list)


class OpeningHook(BaseModel):
    technique: str = ""
    description: str = ""
    effectiveness_score: int = Field(ge=1, le=5, default=3)


class BodySegment(BaseModel):
    narrative_style: str = ""
    key_points: list[str] = Field(default_factory=list)
    pacing_assessment: str = ""


class ClosingSegment(BaseModel):
    type: str = ""
    description: str = ""
    effectiveness_score: int = Field(ge=1, le=5, default=3)


class ContentStructure(BaseModel):
    opening_hook: OpeningHook = Field(default_factory=OpeningHook)
    body: BodySegment = Field(default_factory=BodySegment)
    closing: ClosingSegment = Field(default_factory=ClosingSegment)


class ContentAndTags(BaseModel):
    content_description: str = ""
    auto_tags: list[str] = Field(default_factory=list)
    marketing_copy: MarketingCopy = Field(default_factory=MarketingCopy)
    content_structure: ContentStructure = Field(default_factory=ContentStructure)


class TargetAudience(BaseModel):
    primary_audience: str = ""
    secondary_audiences: list[str] = Field(default_factory=list)
    age_range: str = ""
    interests: list[str] = Field(default_factory=list)
    pain_points_addressed: list[str] = Field(default_factory=list)
    audience_signals: list[str] = Field(default_factory=list)


class UserNeeds(BaseModel):
    explicit_needs: list[str] = Field(default_factory=list)
    implicit_needs: list[str] = Field(default_factory=list)
    need_hierarchy: str = ""
    urgency_level: str = ""
    problem_awareness_stage: str = ""


class NeedResolutionMapping(BaseModel):
    need: str = ""
    how_addressed: str = ""
    evidence_presented: str = ""


class ValueShaping(BaseModel):
    value_proposition: str = ""
    unique_selling_points: list[str] = Field(default_factory=list)
    value_demonstration_method: str = ""
    need_resolution_mapping: list[NeedResolutionMapping] = Field(default_factory=list)
    credibility_signals: list[str] = Field(default_factory=list)
    value_shaping_score: int = Field(ge=1, le=5, default=3)


class CTAAnalysis(BaseModel):
    primary_cta: str = ""
    cta_placement: str = ""
    cta_type: str = ""
    urgency_triggers: list[str] = Field(default_factory=list)
    conversion_friction_points: list[str] = Field(default_factory=list)
    cta_clarity_score: int = Field(ge=1, le=5, default=3)
    cta_improvement_suggestions: list[str] = Field(default_factory=list)


# ── Unified Analysis Result ────────────────────────────

class AnalysisResult(BaseModel):
    content_and_tags: ContentAndTags = Field(default_factory=ContentAndTags)
    target_audience: TargetAudience = Field(default_factory=TargetAudience)
    user_needs: UserNeeds = Field(default_factory=UserNeeds)
    value_shaping: ValueShaping = Field(default_factory=ValueShaping)
    cta_analysis: CTAAnalysis = Field(default_factory=CTAAnalysis)


# ── Job Models ─────────────────────────────────────────

class JobMeta(BaseModel):
    job_id: str
    filename: str
    original_filename: str
    file_size_bytes: int
    video_duration_seconds: Optional[float] = None
    processing_time_seconds: Optional[float] = None
    completed_at: Optional[str] = None
    status: JobStatus = JobStatus.QUEUED
    progress_pct: float = 0.0
    current_step: str = ""
    dimension: Optional[str] = None
    error: Optional[str] = None
    created_at: str = ""


class JobResult(BaseModel):
    job_id: str
    filename: str
    status: JobStatus
    video_duration_seconds: Optional[float] = None
    analysis: Optional[AnalysisResult] = None
    error: Optional[str] = None
    processing_time_seconds: Optional[float] = None


class UploadResponse(BaseModel):
    jobs: list[JobMeta]


class StatusResponse(BaseModel):
    jobs: list[JobMeta]


class FrameInfo(BaseModel):
    index: int
    timestamp_seconds: float
    url: str


class FramesResponse(BaseModel):
    frames: list[FrameInfo]


class DeleteResponse(BaseModel):
    deleted: bool
    job_id: str
