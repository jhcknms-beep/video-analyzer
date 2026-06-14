"use client";

import type { AnalysisResult } from "@/lib/types";
import { DimensionCard, ScoreBadge, TagList, KVList, BulletList } from "./DimensionCard";

interface Props {
  result: AnalysisResult;
  frames?: string[];
  isPortrait?: boolean;
}

export function AnalysisResults({ result, frames = [], isPortrait = false }: Props) {
  const { content_and_tags, target_audience, user_needs, value_shaping, cta_analysis } = result;
  const f = (i: number) => frames[i % frames.length] || null;

  return (
    <div className="space-y-3">
      {/* 1. Content Description & Tags */}
      <DimensionCard title="Content & Tags" icon="📝" color="border-l-4 border-l-blue-500">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground leading-relaxed">{content_and_tags.content_description || "N/A"}</p>
            </div>
            {f(0) && <img src={f(0)!} className="rounded-lg border object-contain bg-black/30 w-full" style={{maxHeight:240}} />}
          </div>
          <div><h4 className="text-sm font-medium mb-1">Tags</h4><TagList tags={content_and_tags.auto_tags} /></div>
        </div>
      </DimensionCard>

      {/* 2. Marketing Copy */}
      <DimensionCard title="Marketing Copy" icon="📢" color="border-l-4 border-l-orange-500">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2"><span className="text-sm font-medium">Persuasiveness</span><ScoreBadge score={content_and_tags.marketing_copy.persuasiveness_score} /></div>
            <div><h4 className="text-sm font-medium mb-1">On-screen Text</h4><BulletList items={content_and_tags.marketing_copy.on_screen_text} /></div>
            <div><h4 className="text-sm font-medium mb-1">Sales Claims</h4><BulletList items={content_and_tags.marketing_copy.sales_claims} /></div>
            {content_and_tags.marketing_copy.pricing_mentions && <KVList items={[{ label: "Pricing", value: content_and_tags.marketing_copy.pricing_mentions }]} />}
          </div>
          {f(1) && <img src={f(1)!} className="rounded-lg border object-contain bg-black/30 w-full" style={{maxHeight:240}} />}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><h4 className="text-sm font-medium mb-1 text-green-600">Strengths</h4><BulletList items={content_and_tags.marketing_copy.copy_strengths} /></div>
          <div><h4 className="text-sm font-medium mb-1 text-orange-600">Weaknesses</h4><BulletList items={content_and_tags.marketing_copy.copy_weaknesses} /></div>
        </div>
      </DimensionCard>

      {/* 3. Content Structure */}
      <DimensionCard title="Content Structure" icon="🏗️" color="border-l-4 border-l-purple-500">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
          <div className="md:col-span-2 space-y-3">
            <div className="border-l-2 border-primary/50 pl-3">
              <div className="flex items-center gap-2"><span className="text-sm font-medium">Hook</span><ScoreBadge score={content_and_tags.content_structure.opening_hook.effectiveness_score} /></div>
              <p className="text-xs text-muted-foreground">{content_and_tags.content_structure.opening_hook.technique}</p>
              <p className="text-sm mt-1">{content_and_tags.content_structure.opening_hook.description}</p>
            </div>
            <div className="border-l-2 border-primary/50 pl-3">
              <span className="text-sm font-medium">Body</span>
              <p className="text-xs text-muted-foreground">{content_and_tags.content_structure.body.narrative_style}</p>
              <BulletList items={content_and_tags.content_structure.body.key_points} />
              <p className="text-xs text-muted-foreground mt-1">{content_and_tags.content_structure.body.pacing_assessment}</p>
            </div>
            <div className="border-l-2 border-primary/50 pl-3">
              <div className="flex items-center gap-2"><span className="text-sm font-medium">Closing</span><ScoreBadge score={content_and_tags.content_structure.closing.effectiveness_score} /></div>
              <p className="text-xs text-muted-foreground">{content_and_tags.content_structure.closing.type}</p>
              <p className="text-sm mt-1">{content_and_tags.content_structure.closing.description}</p>
            </div>
          </div>
          {f(2) && <img src={f(2)!} className="rounded-lg border object-contain bg-black/30 w-full" style={{maxHeight:240}} />}
        </div>
      </DimensionCard>

      {/* 4. Target Audience */}
      <DimensionCard title="Target Audience" icon="👥" color="border-l-4 border-l-green-500">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3">
            <KVList items={[{ label: "Primary", value: target_audience.primary_audience }, { label: "Age", value: target_audience.age_range }]} />
            <div><h4 className="text-sm font-medium mb-1">Secondary</h4><BulletList items={target_audience.secondary_audiences} /></div>
            <div><h4 className="text-sm font-medium mb-1">Interests</h4><TagList tags={target_audience.interests} /></div>
            <div><h4 className="text-sm font-medium mb-1">Pain Points</h4><BulletList items={target_audience.pain_points_addressed} /></div>
            <div><h4 className="text-sm font-medium mb-1">Signals</h4><BulletList items={target_audience.audience_signals} /></div>
          </div>
          {f(3) && <img src={f(3)!} className="rounded-lg border object-contain bg-black/30 w-full" style={{maxHeight:240}} />}
        </div>
      </DimensionCard>

      {/* 5. User Needs */}
      <DimensionCard title="User Needs" icon="🎯" color="border-l-4 border-l-cyan-500">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3">
            <KVList items={[{ label: "Hierarchy", value: user_needs.need_hierarchy }, { label: "Urgency", value: user_needs.urgency_level }, { label: "Stage", value: user_needs.problem_awareness_stage }]} />
            <div className="grid grid-cols-2 gap-4">
              <div><h4 className="text-sm font-medium mb-1">Explicit Needs</h4><BulletList items={user_needs.explicit_needs} /></div>
              <div><h4 className="text-sm font-medium mb-1">Implicit Needs</h4><BulletList items={user_needs.implicit_needs} /></div>
            </div>
          </div>
          {f(4) && <img src={f(4)!} className="rounded-lg border object-contain bg-black/30 w-full" style={{maxHeight:240}} />}
        </div>
      </DimensionCard>

      {/* 6. Value Shaping */}
      <DimensionCard title="Value Shaping" icon="💎" color="border-l-4 border-l-pink-500">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2"><span className="text-sm font-medium">Score</span><ScoreBadge score={value_shaping.value_shaping_score} /></div>
            <KVList items={[{ label: "Proposition", value: value_shaping.value_proposition }, { label: "Method", value: value_shaping.value_demonstration_method }]} />
            <div><h4 className="text-sm font-medium mb-1">USPs</h4><BulletList items={value_shaping.unique_selling_points} /></div>
            <div><h4 className="text-sm font-medium mb-1">Credibility</h4><BulletList items={value_shaping.credibility_signals} /></div>
          </div>
          {f(5) && <img src={f(5)!} className="rounded-lg border object-contain bg-black/30 w-full" style={{maxHeight:240}} />}
        </div>
        {value_shaping.need_resolution_mapping.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-1">Need-Resolution Mapping</h4>
            <div className="space-y-2">
              {value_shaping.need_resolution_mapping.map((m, i) => (
                <div key={i} className="border rounded p-2 text-sm">
                  <p><strong>Need:</strong> {m.need}</p>
                  <p><strong>Solution:</strong> {m.how_addressed}</p>
                  <p className="text-muted-foreground text-xs">{m.evidence_presented}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </DimensionCard>

      {/* 7. CTA Analysis */}
      <DimensionCard title="CTA Analysis" icon="🚀" color="border-l-4 border-l-red-500">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2"><span className="text-sm font-medium">Clarity Score</span><ScoreBadge score={cta_analysis.cta_clarity_score} /></div>
            <KVList items={[{ label: "CTA", value: cta_analysis.primary_cta }, { label: "Placement", value: cta_analysis.cta_placement }, { label: "Type", value: cta_analysis.cta_type }]} />
            <div><h4 className="text-sm font-medium mb-1">Urgency Triggers</h4><BulletList items={cta_analysis.urgency_triggers} /></div>
            <div><h4 className="text-sm font-medium mb-1 text-orange-600">Friction Points</h4><BulletList items={cta_analysis.conversion_friction_points} /></div>
            <div><h4 className="text-sm font-medium mb-1 text-green-600">Suggestions</h4><BulletList items={cta_analysis.cta_improvement_suggestions} /></div>
          </div>
          {f(6) && <img src={f(6)!} className="rounded-lg border object-contain bg-black/30 w-full" style={{maxHeight:240}} />}
        </div>
      </DimensionCard>
    </div>
  );
}
