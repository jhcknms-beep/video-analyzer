# Video Analyzer UI Polish - Design Spec

**Date:** 2025-06-14  
**Approach:** Progressive refinement (retain structure, upgrade visuals)  
**Style:** Linear-inspired, slate base, high contrast, bento card system

## Section 1: Global Visual System

### Colors (replace current teal-on-navy)

| Token | Current | New |
|--------|---------|-----|
| Background | navy `oklch(0.13 0.008 260)` | slate `oklch(0.145 0 0)` |
| Surface (cards) | `oklch(0.16 0.008 260)` | `oklch(0.17 0 0)` |
| Primary accent | teal `oklch(0.70 0.13 185)` | teal `oklch(0.70 0.11 185)` |
| Muted text | `oklch(0.65 0.005 260)` | `oklch(0.55 0 0)` |
| Border | `oklch(0.25 0.008 260)` | `oklch(0.22 0 0)` |

### Radii (lock to one scale)

| Element | Radius |
|---------|--------|
| Cards | 6px (`--radius-lg`) |
| Buttons | 4px (`--radius-md`) |
| Inputs | 4px (`--radius-md`) |
| Badges | 3px (`--radius-sm`) |

### Spacing

- Page content: `px-10 py-12` (was `px-8 py-10`)
- Section gap: `space-y-12` (was `space-y-8`)
- Card internal: `p-5` (was `p-4`)

---

## Section 2: Main Page - Card List Redesign

### Upload zone
- Compact horizontal strip, bordered dash area reduced height
- File preview thumbnails inline horizontal scroll

### Pending list: Table → Card Strip
Each pending item becomes a narrow horizontal card:
```
[checkbox] ┃ Filename (editable double-click)    [Status] [Delete]
```
- 4px accent left border (teal)
- Hover: surface lift + 1px teal border
- 48px height, `rounded-md`

### Active list: Progress Cards
Each active item:
```
Filename                          [progress bar 60%] [Pause]
```
- Background: surface with subtle inner highlight
- Progress bar: thinner (2px), teal, no background track
- Pause button: ghost icon, hover circle

### Section headers
```
○ 3 Pending                    [Analyze Selected (3)]
```
- Counter dot in teal, section title weight 500, no uppercase
- Button: teal filled, 4px radius, 36px height

---

## Section 3: History Page - Bento Card Grid

### Layout
Replace `<table>` with responsive card grid:
```
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4
```

Each card:
```
┌─────────────────────────────┐
│ ● (unviewed dot)  Filename  │
│ 7.9s · 11m 9s    [View]    │
│ [checkbox]      [Delete]    │
└─────────────────────────────┘
```
- Card background: surface
- Hover: subtle border glow + `translateY(-1px)`
- Unviewed: left accent 2px teal border + tinted bg

### Toolbar
- "Export N to Feishu" button, right aligned
- Counter showing "14 completed"

---

## Section 4: Job Detail Page - Screenshot-Driven Layout

### Keyframe Bento Grid (top area)
```
┌──────────┬─────┬─────┐
│          │  2  │  3  │
│    1     ├─────┼─────┤
│  (large) │  4  │  5  │
│          ├─────┼─────┤
│          │  6  │  7  │
└──────────┴─────┴─────┘
```
- Frame 1: spans 2 rows × half width (hero frame)
- Frames 2-7: 1×1 tiles, 3 columns × 2 rows
- All frames: `object-contain`, rounded, subtle border, hover zoom

### 7 Dimension Cards
Each card:
```
┃ Content & Tags                  [Score badge]
┃ Description text here...
┃ Tags: [pill] [pill] [pill]
```
- Left: 3px colored accent border
  - Blue: Content
  - Orange: Marketing
  - Purple: Structure
  - Green: Audience
  - Cyan: Needs
  - Pink: Value
  - Red: CTA
- Cards default OPEN (no collapse)
- Interleaved: every 2 cards, show a related screenshot floated to the right

### Score Summary
Top bar with 5 metrics as mini donut/ring charts instead of linear progress bars.

---

## Section 5: Nav Polish

- Nav background: `bg-background/90 backdrop-blur-xl`
- Nav items: active state underlined with 2px teal indicator
- Model selector: compact pill, right side
- Connection indicator: emerald dot with subtle pulse animation

---

## Implementation Order

1. Global CSS tokens (colors, radii, spacing) — `globals.css`
2. Nav polish — `Nav.tsx`
3. Main page card list — `page.tsx`
4. History bento grid — `history/page.tsx`
5. Job detail bento + cards — `jobs/[id]/page.tsx`, `AnalysisResults.tsx`
6. Final spacing/transition pass
