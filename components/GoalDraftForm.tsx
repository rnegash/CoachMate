"use client";

import { useState, useTransition } from "react";
import { goalFeedbackAction, saveGoalAction } from "@/app/actions/goals";
import { AIBadge } from "@/components/AIBadge";
import { Button } from "@/components/Button";
import { ASPECT_LABELS, GOAL_TEXT_MAX, type MentorResult } from "@/lib/goal-mentor-input";

export function GoalDraftForm({ playerId }: { playerId: string }) {
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<MentorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"feedback" | "save" | null>(null);

  const empty = draft.trim() === "";

  function run(kind: "feedback" | "save", fn: () => Promise<void>) {
    setBusy(kind);
    setError(null);
    startTransition(async () => {
      await fn();
      setBusy(null);
    });
  }

  const save = (text: string) =>
    run("save", async () => {
      // Redirects to Player Detail on success; only errors come back.
      setError(await saveGoalAction(playerId, text));
    });

  const getFeedback = () =>
    run("feedback", async () => {
      const res = await goalFeedbackAction(playerId, draft);
      if (res.ok) setResult(res.result);
      else setError(res.message);
    });

  return (
    <div className="flex flex-col gap-space-4">
      <div className="flex flex-col gap-space-1">
        <label htmlFor="goal" className="text-label">
          Goal
        </label>
        <textarea
          id="goal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={GOAL_TEXT_MAX}
          rows={3}
          placeholder="e.g. better passing under pressure"
          aria-describedby="goal-caption"
          className="rounded-md border-[1.5px] border-border-strong bg-surface-raised px-space-3 py-space-2 text-body"
        />
        {/* Static caption required by CLAUDE.md wherever free text can reach the AI. */}
        <p id="goal-caption" className="text-caption text-ink-muted">
          For feedback, the AI receives this text and the player’s other active goals — no name or other player
          details. Leave out names and contact details.
        </p>
      </div>

      <div className="flex gap-space-2">
        <Button type="button" onClick={getFeedback} disabled={pending || empty} className="flex-1">
          {busy === "feedback" ? "Getting feedback…" : result ? "Get new feedback" : "Get feedback"}
        </Button>
        <Button type="button" variant="primary" onClick={() => save(draft)} disabled={pending || empty} className="flex-1">
          {busy === "save" ? "Saving…" : "Save goal"}
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      )}

      {result && (
        <section
          aria-label="AI feedback on the goal"
          className="flex flex-col gap-space-4 rounded-lg border border-border bg-surface-raised p-space-4"
        >
          <AIBadge />

          {result.feedback.length > 0 ? (
            <ul className="flex flex-col gap-space-3">
              {result.feedback.map((f, i) => (
                <li key={i} className="flex flex-col gap-space-1">
                  <span className="text-caption font-semibold text-ink-muted">{ASPECT_LABELS[f.aspect]}</span>
                  <p className="text-body">{f.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body text-ink-muted">No changes suggested.</p>
          )}

          {result.suggested_goal && (
            <div className="flex flex-col gap-space-2 rounded-md bg-ai-tint p-space-3">
              <span className="text-caption font-semibold text-ai">Suggested goal</span>
              <p className="text-body font-semibold">{result.suggested_goal}</p>
            </div>
          )}

          {result.questions_for_player.length > 0 && (
            <div className="flex flex-col gap-space-1">
              <span className="text-caption font-semibold text-ink-muted">Questions for the player</span>
              <ul className="flex list-disc flex-col gap-space-1 pl-space-6">
                {result.questions_for_player.map((q, i) => (
                  <li key={i} className="text-body">
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-space-2">
            {result.suggested_goal && (
              <>
                <Button type="button" variant="primary" disabled={pending} onClick={() => save(result.suggested_goal!)}>
                  Accept
                </Button>
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setDraft(result.suggested_goal!);
                    setResult(null);
                  }}
                >
                  Edit
                </Button>
              </>
            )}
            <Button type="button" disabled={pending} onClick={() => setResult(null)}>
              Dismiss
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
