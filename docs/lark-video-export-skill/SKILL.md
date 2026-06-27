---
name: lark-video-export
version: 1.0.0
description: "Export video analysis results to Lark/Feishu cloud documents with screenshots via lark-cli. Use when the user asks to output analysis to Lark docs, Feishu cloud documents, or share results via Feishu."
metadata:
  requires:
    bins: ["lark-cli"]
---

# Lark Video Analysis Export

> **Prerequisites:** Read [`../lark-shared/SKILL.md`](../lark-shared/SKILL.md) for auth setup.

## Overview

Export batch video analysis results (7 dimensions) to a Lark cloud document with embedded keyframe screenshots.

## Authentication

```bash
lark-cli auth login --domain feishu
```

Or set env vars:
```
LARK_APP_ID=cli_xxxxxxxx
LARK_APP_SECRET=xxxxxxxx
```

## Export Flow

### Step 1: Build Markdown

Generate Lark-flavored markdown from analysis JSON. See `backend/services/feishu_exporter.py` → `build_markdown()` for the full template covering all 7 analysis dimensions.

### Step 2: Create Document

```bash
lark-cli docs +create \
  --title "Video Analysis - {filename}" \
  --markdown @/path/to/content.md \
  --folder-token {folder_token} \
  --api-version v2
```

Returns the document URL. The `--folder-token` is optional; omit to create in root.

### Step 3: Insert Keyframes

For each keyframe image (up to 4):

```bash
lark-cli docs +media-insert \
  --doc {doc_url} \
  --file /path/to/frame.jpg \
  --type image \
  --width 600
```

## API Integration

The backend endpoint `POST /api/videos/{job_id}/export-feishu` automates the full flow:

1. Build markdown from stored analysis JSON
2. Call `lark-cli docs +create` with the markdown
3. Call `lark-cli docs +media-insert` for each keyframe
4. Return the document URL

The frontend Export menu has a "Lark Doc" option that calls this endpoint and opens the result.

## Configuration

Set in `backend/.env`:

```
VA_FEISHU_APP_ID=cli_xxxxxxxx
VA_FEISHU_APP_SECRET=xxxxxxxx
VA_FEISHU_FOLDER_TOKEN=xxxxxxxx
```

Or use `lark-cli auth login --domain feishu` to authenticate globally.

## Permissions

| Operation | Scope |
|-----------|-------|
| Create document | `docx:document` |
| Insert media | `drive:drive` |
| Upload images | `drive:drive` |
