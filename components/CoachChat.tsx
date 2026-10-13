"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { askCoachAction } from "@/app/actions/coach";
import { AIBadge } from "@/components/AIBadge";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/Button";
import { COACH_MESSAGE_MAX, MAX_COACH_MESSAGES, SESSION_FULL, type ChatTurn } from "@/lib/assistant-coach-input";

/**
 * Single session held only in this component's state (CLAUDE.md: no stored or
 * browsable history). Leaving the tab or "New chat" ends it.
 */
export function CoachChat() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  const full = turns.filter((t) => t.role === "user").length >= MAX_COACH_MESSAGES;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [turns, pending]);

  function send() {
    const text = draft.trim();
    if (!text || pending || full) return;
    const history: ChatTurn[] = [...turns, { role: "user", text }];
    setTurns(history);
    setDraft("");
    setError(null);
    startTransition(async () => {
      const res = await askCoachAction(history);
      if (res.ok) {
        setTurns([...history, { role: "assistant", text: res.reply }]);
      } else {
        // Put the message back so the coach can retry without retyping.
        setTurns(turns);
        setDraft(text);
        setError(res.message);
      }
    });
  }

  function newChat() {
    setTurns([]);
    setDraft("");
    setError(null);
  }

  return (
    <>
      <AppHeader
        title="Assistant Coach"
        action={
          turns.length > 0 && (
            <Button type="button" onClick={newChat} disabled={pending}>
              New chat
            </Button>
          )
        }
      />

      {/* Art. 50(1) disclosure: static and always visible, never behind a setting. */}
      <p className="rounded-md bg-ai-tint px-space-3 py-space-2 text-caption text-ai">
        Every reply here is written by AI. It has no access to your players or earlier chats, and CoachMate doesn’t
        save this chat — it ends when you leave this tab.
      </p>

      <section aria-label="Conversation" aria-live="polite" className="flex flex-1 flex-col gap-space-4">
        {turns.length === 0 && (
          <p className="text-body text-ink-muted">
            Ask about training plans, drills, feedback or coaching cues.
          </p>
        )}
        {turns.map((t, i) =>
          t.role === "user" ? (
            <p
              key={i}
              className="max-w-[85%] self-end rounded-lg bg-accent-tint px-space-3 py-space-2 text-body whitespace-pre-wrap"
            >
              {t.text}
            </p>
          ) : (
            <div
              key={i}
              className="flex flex-col gap-space-2 rounded-lg border border-border bg-surface-raised p-space-4"
            >
              <AIBadge />
              <p className="text-body whitespace-pre-wrap">{t.text}</p>
            </div>
          ),
        )}
        {pending && <p className="text-caption text-ink-muted">Writing a reply…</p>}
        <div ref={endRef} />
      </section>

      {error && (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      )}

      {full ? (
        <p className="text-body text-ink-muted">{SESSION_FULL}</p>
      ) : (
        <form
          className="flex flex-col gap-space-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <label htmlFor="coach-message" className="text-label">
            Message
          </label>
          <textarea
            id="coach-message"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
            maxLength={COACH_MESSAGE_MAX}
            rows={3}
            placeholder="e.g. How do I run a 60-minute session for 20 players?"
            aria-describedby="coach-caption"
            className="rounded-md border-[1.5px] border-border-strong bg-surface-raised px-space-3 py-space-2 text-body"
          />
          {/* Static caption required by CLAUDE.md wherever free text can reach the AI. */}
          <p id="coach-caption" className="text-caption text-ink-muted">
            The AI receives only what you type here. Leave out names and contact details — describe the situation
            instead, e.g. “a newer player who struggles with one technique”.
          </p>
          <Button type="submit" variant="primary" disabled={pending || draft.trim() === ""}>
            {pending ? "Sending…" : "Send"}
          </Button>
        </form>
      )}
    </>
  );
}
