"""Parse and validate JSON output from LLM responses."""

from __future__ import annotations

import json
import re
from typing import Optional

from models.schemas import (
    AnalysisResult,
    ContentAndTags,
    TargetAudience,
    UserNeeds,
    ValueShaping,
    CTAAnalysis,
)
from services.prompt_builder import PROMPT_GROUPS


def extract_json(text: str) -> str:
    """
    Extract JSON from LLM response.
    Handles markdown code fences, trailing text, etc.
    """
    # Try to find JSON inside ```json ... ``` blocks
    fence_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if fence_match:
        return fence_match.group(1).strip()

    # Try to find the first { ... } block
    brace_start = text.find("{")
    if brace_start == -1:
        raise ValueError("No JSON object found in response")

    # Find matching closing brace
    depth = 0
    for i in range(brace_start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return text[brace_start : i + 1]

    raise ValueError("Unmatched braces in response")


def parse_group1_result(json_str: str) -> ContentAndTags:
    """Parse Group 1 response into ContentAndTags model."""
    data = json.loads(json_str)
    return ContentAndTags(**data)


def parse_group2_result(json_str: str) -> tuple[TargetAudience, UserNeeds]:
    """Parse Group 2 response into TargetAudience + UserNeeds models."""
    data = json.loads(json_str)
    audience = TargetAudience(**data.get("target_audience", {}))
    needs = UserNeeds(**data.get("user_needs", {}))
    return audience, needs


def parse_group3_result(json_str: str) -> tuple[ValueShaping, CTAAnalysis]:
    """Parse Group 3 response into ValueShaping + CTAAnalysis models."""
    data = json.loads(json_str)
    value = ValueShaping(**data.get("value_shaping", {}))
    cta = CTAAnalysis(**data.get("cta_analysis", {}))
    return value, cta


def merge_results(
    group1: ContentAndTags,
    group2_audience: TargetAudience,
    group2_needs: UserNeeds,
    group3_value: ValueShaping,
    group3_cta: CTAAnalysis,
) -> AnalysisResult:
    """Merge all parsed results into the unified AnalysisResult."""
    return AnalysisResult(
        content_and_tags=group1,
        target_audience=group2_audience,
        user_needs=group2_needs,
        value_shaping=group3_value,
        cta_analysis=group3_cta,
    )
