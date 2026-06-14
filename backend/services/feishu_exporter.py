"""Export analysis results to Feishu cloud docs via Feishu Open API."""

import asyncio
import os
from pathlib import Path

import httpx

from config import settings

FEISHU_BASE = "https://open.feishu.cn/open-apis"


def _get_creds(req_app_id="", req_app_secret="", req_folder=""):
    app_id = req_app_id or os.environ.get("VA_FEISHU_APP_ID", "") or getattr(settings, 'feishu_app_id', '')
    app_secret = req_app_secret or os.environ.get("VA_FEISHU_APP_SECRET", "") or getattr(settings, 'feishu_app_secret', '')
    folder = req_folder or os.environ.get("VA_FEISHU_FOLDER_TOKEN", "") or getattr(settings, 'feishu_folder_token', '')
    return app_id, app_secret, folder


def _build_markdown(results: dict) -> str:
    """Build rich markdown from analysis results."""
    a = results.get("analysis", {})
    ct = a.get("content_and_tags", {})
    au = a.get("target_audience", {})
    un = a.get("user_needs", {})
    vs = a.get("value_shaping", {})
    ca = a.get("cta_analysis", {})
    mc = ct.get("marketing_copy", {})
    cs = ct.get("content_structure", {})
    oh = cs.get("opening_hook", {})
    body = cs.get("body", {})
    closing = cs.get("closing", {})

    title = results.get("filename", "Untitled")
    duration = results.get("video_duration_seconds", 0)
    proc = results.get("processing_time_seconds", 0)

    return f"""# {title}

**Duration:** {duration:.0f}s | **Processed in:** {proc:.0f}s

---

## 1. Content Description & Tags

{ct.get('content_description', 'N/A')}

**Tags:** {' '.join(f'`{t}`' for t in ct.get('auto_tags', []))}

---

## 2. Marketing Copy Analysis

**Persuasiveness Score:** {mc.get('persuasiveness_score', '-')}/5

**On-screen Text:**
{chr(10).join(f'- {t}' for t in mc.get('on_screen_text', [])) or '- None'}

**Sales Claims:** {'; '.join(mc.get('sales_claims', [])) or 'N/A'}
**Strengths:** {'; '.join(mc.get('copy_strengths', []))}
**Weaknesses:** {'; '.join(mc.get('copy_weaknesses', []))}
{f"**Pricing:** {mc.get('pricing_mentions')}" if mc.get('pricing_mentions') else ""}

---

## 3. Content Structure

**Opening Hook** ({oh.get('technique', '-')}) - Score: {oh.get('effectiveness_score', '-')}/5
{oh.get('description', '')}

**Body** ({body.get('narrative_style', '-')}):
{chr(10).join(f'- {kp}' for kp in body.get('key_points', []))}
Pacing: {body.get('pacing_assessment', '')}

**Closing** ({closing.get('type', '-')}) - Score: {closing.get('effectiveness_score', '-')}/5
{closing.get('description', '')}

---

## 4. Target Audience

| Dimension | Detail |
|---|---|
| Primary | {au.get('primary_audience', '-')} |
| Age Range | {au.get('age_range', '-')} |
| Interests | {', '.join(au.get('interests', []))} |
| Pain Points | {', '.join(au.get('pain_points_addressed', []))} |
| Signals | {', '.join(au.get('audience_signals', []))} |

**Secondary Audiences:** {', '.join(au.get('secondary_audiences', [])) or 'N/A'}

---

## 5. User Needs

| Dimension | Detail |
|---|---|
| Hierarchy | {un.get('need_hierarchy', '-')} |
| Urgency | {un.get('urgency_level', '-')} |
| Awareness Stage | {un.get('problem_awareness_stage', '-')} |

**Explicit Needs:** {', '.join(un.get('explicit_needs', [])) or 'N/A'}
**Implicit Needs:** {', '.join(un.get('implicit_needs', [])) or 'N/A'}

---

## 6. Value Shaping

**Proposition:** {vs.get('value_proposition', '-')}
**Method:** {vs.get('value_demonstration_method', '-')}
**Score:** {vs.get('value_shaping_score', '-')}/5

**USPs:**
{chr(10).join(f'- {u}' for u in vs.get('unique_selling_points', [])) or '- None'}

**Credibility:** {'; '.join(vs.get('credibility_signals', [])) or 'N/A'}

---

## 7. CTA & Conversion

| Dimension | Detail |
|---|---|
| CTA | {ca.get('primary_cta', '-')} |
| Type | {ca.get('cta_type', '-')} |
| Placement | {ca.get('cta_placement', '-')} |
| Clarity Score | {ca.get('cta_clarity_score', '-')}/5 |

**Urgency Triggers:** {'; '.join(ca.get('urgency_triggers', [])) or 'N/A'}
**Friction Points:** {'; '.join(ca.get('conversion_friction_points', [])) or 'N/A'}

**Suggestions:**
{chr(10).join(f'- {s}' for s in ca.get('cta_improvement_suggestions', [])) or '- None'}
"""


async def export_to_feishu(
    job_id: str,
    results: dict,
    frames_dir: Path,
    app_id: str = "",
    app_secret: str = "",
    folder_token: str = "",
) -> str:
    """Create Feishu doc + import markdown + insert images. Returns doc URL."""

    app_id, app_secret, folder_token = _get_creds(app_id, app_secret, folder_token)

    if not app_id or not app_secret:
        raise RuntimeError("Feishu credentials required. Set VA_FEISHU_APP_ID and VA_FEISHU_APP_SECRET in backend/.env")

    async with httpx.AsyncClient(timeout=30) as client:

        # Step 1: Get tenant access token
        tr = await client.post(
            f"{FEISHU_BASE}/auth/v3/tenant_access_token/internal",
            json={"app_id": app_id, "app_secret": app_secret},
        )
        tr.raise_for_status()
        token = tr.json()["tenant_access_token"]

        # Step 2: Upload keyframe screenshots (use files API - no drive:drive needed)
        image_urls = []
        for fp in sorted(frames_dir.rglob("*.jpg"))[:6]:
            try:
                with open(fp, "rb") as f:
                    img_data = f.read()
                ur = await client.post(
                    f"{FEISHU_BASE}/drive/v1/files/upload_all",
                    headers={"Authorization": f"Bearer {token}"},
                    data={
                        "file_name": fp.name,
                        "parent_type": "explorer",
                        "parent_node": "",
                        "size": str(len(img_data)),
                    },
                    files={"file": (fp.name, img_data, "image/jpeg")},
                )
                if ur.status_code == 200:
                    data = ur.json().get("data", {})
                    url = data.get("url", "")
                    if url:
                        image_urls.append({"name": fp.stem, "url": url})
            except Exception:
                pass

        # Step 3: Create empty document
        title = results.get("filename", "Video Analysis")[:100]
        body = {"title": title}
        if folder_token:
            body["folder_token"] = folder_token

        cr = await client.post(
            f"{FEISHU_BASE}/docx/v1/documents",
            headers={"Authorization": f"Bearer {token}"},
            json=body,
        )
        cr.raise_for_status()
        doc_id = cr.json()["data"]["document"]["document_id"]

        # Step 4: Write markdown, then insert screenshot links after each divider
        md = _build_markdown(results)
        blocks = _md_to_blocks(md)
        img_idx = 0
        result_blocks = []
        for b in blocks:
            result_blocks.append(b)
            # After each section divider (---), insert the next screenshot link
            if b.get("block_type") == 22 and img_idx < len(image_urls):
                img = image_urls[img_idx]
                result_blocks.append({
                    "block_type": 2,
                    "text": {
                        "elements": [
                            {"text_run": {"content": f"Screenshot: {img['name']}", "text_element_style": {"link": {"url": img['url']}}}},
                        ],
                        "style": {},
                    },
                })
                img_idx += 1
        blocks = result_blocks

        # Write blocks in batches via POST
        for i in range(0, len(blocks), 50):
            batch = blocks[i:i + 50]
            wr = await client.post(
                f"{FEISHU_BASE}/docx/v1/documents/{doc_id}/blocks/{doc_id}/children",
                headers={"Authorization": f"Bearer {token}"},
                json={"children": batch, "index": -1},
            )
            if wr.status_code >= 400:
                raise RuntimeError(f"Write error ({wr.status_code}): {wr.text[:300]}")

        doc_url = f"https://bytedance.feishu.cn/docx/{doc_id}"
        return doc_url


def _md_to_blocks(md: str) -> list[dict]:
    """Convert markdown lines to Feishu docx blocks."""
    blocks = []
    lines = md.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]

        if not line.strip():
            i += 1
            continue

        if line.startswith("# "):
            blocks.append({"block_type": 3, "heading1": {"elements": [{"text_run": {"content": line[2:]}}], "style": {}}})
        elif line.startswith("## "):
            blocks.append({"block_type": 4, "heading2": {"elements": [{"text_run": {"content": line[3:]}}], "style": {}}})
        elif line == "---":
            blocks.append({"block_type": 22, "divider": {}})
        elif line.startswith("| ") and "|" in line[2:]:
            # Collect table rows
            table_lines = []
            while i < len(lines) and lines[i].startswith("| "):
                table_lines.append(lines[i])
                i += 1
            # Simple table handling: render each row as text for now
            if table_lines:
                text = "\n".join(table_lines)
                blocks.append({"block_type": 2, "text": {"elements": [{"text_run": {"content": text}}], "style": {}}})
            continue
        elif line.startswith("- "):
            blocks.append({"block_type": 12, "bullet": {"elements": [{"text_run": {"content": line[2:]}}], "style": {}}})
        else:
            # Collect consecutive text lines into one block
            text_lines = [line]
            while i + 1 < len(lines) and lines[i + 1].strip() and not lines[i + 1].startswith(("#", "-", "|", "---")):
                i += 1
                text_lines.append(lines[i])
            text = "\n".join(text_lines)
            blocks.append({"block_type": 2, "text": {"elements": [{"text_run": {"content": text}}], "style": {}}})

        i += 1
    return blocks
