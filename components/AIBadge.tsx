import { Sparkle } from "@/components/icons";

/** Sideline AIBadge: explicit Art. 50 label, placed before the AI content it marks. */
export function AIBadge({ label = "AI-generated" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-space-1 self-start rounded-full bg-ai-tint py-space-1 pr-space-3 pl-space-2 text-caption font-semibold text-ai">
      <Sparkle />
      {label}
    </span>
  );
}
