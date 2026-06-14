"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  icon: string;
  color: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function DimensionCard({ title, icon, color, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className={cn("cursor-pointer py-3 px-4 hover:bg-muted/50 transition-colors", color)}
        onClick={() => setOpen(!open)}
      >
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="flex-1">{title}</span>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </CardTitle>
      </CardHeader>
      {open && <CardContent className="p-4 pt-0">{children}</CardContent>}
    </Card>
  );
}

// ── Sub-components for common display patterns ──

export function ScoreBadge({ score, max = 5 }: { score: number; max?: number }) {
  const pct = score / max;
  const bg =
    pct >= 0.8 ? "bg-green-100 text-green-800" :
    pct >= 0.5 ? "bg-yellow-100 text-yellow-800" :
    "bg-red-100 text-red-800";
  return (
    <Badge variant="outline" className={cn("text-xs font-mono", bg)}>
      {score}/{max}
    </Badge>
  );
}

export function TagList({ tags }: { tags: string[] }) {
  if (!tags?.length) return <span className="text-muted-foreground text-sm">无</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t, i) => (
        <Badge key={i} variant="secondary" className="text-xs">
          {t}
        </Badge>
      ))}
    </div>
  );
}

export function KVList({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="space-y-1">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2 text-sm">
          <dt className="text-muted-foreground shrink-0">{it.label}:</dt>
          <dd>{it.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function BulletList({ items }: { items: string[] }) {
  if (!items?.length) return <span className="text-muted-foreground text-sm">无</span>;
  return (
    <ul className="list-disc list-inside space-y-0.5 text-sm">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
