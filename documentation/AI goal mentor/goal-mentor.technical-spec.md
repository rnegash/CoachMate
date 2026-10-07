# Goal Mentor: Technical Spec

For developers. This file is not part of the system prompt text. The prompt itself is in `goal-mentor.prompt.md`.

## 1. Where the prompt goes

Send the full contents of `goal-mentor.prompt.md` as one string in the top-level `system` parameter of the Messages API request. The draft and its context go in a single message with the "user" role (section 3).

## 2. Placeholder

Same rule as the Assistant Coach (`assistant-coach.technical-spec.md`, section 3): replace `{{SPORT}}` from the app's sport setting; if none is set, replace `adult recreational {{SPORT}} teams` with `adult recreational sports teams`.

## 2a. Sport reference

- The last line of the prompt is `{{SPORT_REFERENCE}}`. Replace it with the contents of the sport's reference file, from the line `SPORT REFERENCE: …` to the end (drop the HTML comment at the top).
- Reference files live in `documentation/AI sport knowledge/`, one per sport (`ultimate.md`). The same file is used by the Assistant Coach and the Goal Mentor.
- If no file exists for the sport setting, replace the placeholder with: `SPORT REFERENCE: none available. Use general knowledge of the sport and say when a sport-specific point is uncertain.`
- The reference is fixed text, so place it in the system prompt and let prompt caching cover it (the system prompt is the same on every request).

## 3. User message assembly

One user message per request, built on the server:

```
<today>2026-10-07</today>
<goal_draft>…coach's text…</goal_draft>
<context>
other_active_goals:
- …goal text…
</context>
```

- `<today>`: the date in the team's time zone (`localIsoDate` in `lib/format.ts`).
- `<goal_draft>`: the coach's text as typed. Replace `<` and `>` with `‹` and `›` before inserting it, so the text can't close or open a tag.
- `other_active_goals`: the text of the player's other active goals, same escaping. Omit the whole `<context>` block when there are none.
- **No attendance.** Decided 2026-10-07: attendance says nothing about why a player missed sessions or how much they practise elsewhere, the player is usually present to answer that directly, and a count read out in front of the player can feel like judgement. The prompt asks about available time instead.
- Later, once check-ins exist: recent check-in signals may be added here. Raw check-in free text is not added without a separate decision, since it can name third parties (see `CLAUDE.md`, BotMatcher section).
- **No player ID.** `CLAUDE.md` allows the Goal Mentor to see the pseudonymous player ID, but the prompt does not need it: the app already knows which player the request belongs to. Leaving it out is the stricter reading of data minimization and costs nothing.
- Never add the player's name, jersey number or contact details. The draft itself may still contain a name typed by the coach; the static caption under the input (`CLAUDE.md`, Data-Flow section) asks the coach not to, and the prompt tells the model not to repeat one.

## 4. Model

- Model: Claude Haiku 4.5, pinned snapshot `claude-haiku-4-5-20251001`, same as the Assistant Coach.
- Do not enable extended thinking (omit `thinking`). The task is short and latency matters: the coach usually asks for feedback in the middle of a conversation with the player and waits for the result on the Add Goal screen.
- Re-check model availability and pricing before release.

## 5. Output format (structured outputs)

Use structured outputs so the response is always valid JSON in the shape the UI expects. Haiku 4.5 supports this.

- Parameter: `output_config: { format: { type: "json_schema", schema } }`. In TypeScript, prefer `client.messages.parse()` with `zodOutputFormat(...)` from `@anthropic-ai/sdk/helpers/zod`, which also validates the result.
- The API does not enforce array lengths or string lengths. The TypeScript SDK strips those constraints from the schema it sends and checks them on the response; keep the limits in the Zod schema anyway (at most 3 feedback points, at most 2 questions).
- Every object needs `additionalProperties: false`.

Schema:

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["feedback", "suggested_goal", "questions_for_player"],
  "properties": {
    "feedback": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["aspect", "text"],
        "properties": {
          "aspect": { "enum": ["clear_and_checkable", "realistic", "matters_to_player"] },
          "text": { "type": "string" }
        }
      }
    },
    "suggested_goal": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
    "questions_for_player": { "type": "array", "items": { "type": "string" } }
  }
}
```

There is deliberately no score, rating or "quality" field, and none should be added: `CLAUDE.md` rules out scores for players, and a goal score would read the same way to the coach.

## 6. Request parameters

- `max_tokens`: 1024. A safety limit, not a target.
- Do not set sampling parameters until the current API reference for Haiku 4.5 has been checked.

## 7. Errors and stop reasons

Check `stop_reason` before using the result:
- `end_turn`: use the parsed output.
- `max_tokens` or `refusal`: the output may not match the schema. Show "No feedback available, try again" and keep the coach's draft unchanged.
- API errors (rate limit, network): same message. The coach can always save the draft without feedback ("Save now").

## 8. State

- Stateless. Each "Get feedback" press is one independent request; no history is sent.
- A new request after the coach edits the draft replaces the previous result on screen.

## 9. Security

- Call the API from a server action, never from the browser. The API key stays in a server-side environment variable.
- Keep the system prompt on the server. The client sends only the draft text and the player's ID (to look up context server-side); the server builds the user message.

## 10. Interface and EU AI Act (Art. 50)

- Label the whole result area (feedback, suggested goal, questions) visibly as "AI-generated" with the AIBadge, not only by placement or icon.
- Accept / Edit / Dismiss apply to `suggested_goal`. Accept saves it as the goal; Edit puts it into an editable field first; Dismiss hides the result and leaves the draft as it was. Nothing is applied automatically.
- When `suggested_goal` is null, show the feedback and questions without Accept or Edit; the coach edits the draft and can ask again.
- Feedback and questions are for reading only. They are never saved to the player's record.
- The player may be looking at the screen during the conversation. Keep the result area free of anything the player shouldn't see: no player ID, no other players' data, and no internal labels.
- `aspect` drives a short visible tag per feedback point ("Clear and checkable", "Realistic", "Matters to the player"), translated by the UI, not by the model.

## 11. Persistence

- Only the final goal text the coach saves is stored, as for a goal saved without feedback.
- Open decision, not covered by `CLAUDE.md` yet: whether to store that a saved goal came from an accepted AI suggestion (for example a boolean on the goal). Decide before building it; per `CLAUDE.md` a new field is flagged first, not assumed.

## 12. Request shape (example)

```json
{
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 1024,
  "system": "<assembled prompt>",
  "messages": [
    {
      "role": "user",
      "content": "<today>2026-10-07</today>\n<goal_draft>better forehands</goal_draft>"
    }
  ],
  "output_config": { "format": { "type": "json_schema", "schema": { "…": "see section 5" } } }
}
```

Possible response:

```json
{
  "feedback": [
    { "aspect": "clear_and_checkable", "text": "\"Better\" leaves open what should change and how anyone would notice. Naming one situation, such as forehands past a mark, and a simple count makes it checkable." },
    { "aspect": "realistic", "text": "Break throws need a partner to mark. Adding practice between sessions keeps the goal moving on weeks without training." }
  ],
  "suggested_goal": "By 4 November, complete 7 of 10 forehand break throws past a static mark at 10 metres, practising with a partner twice a week for 10 minutes.",
  "questions_for_player": [
    "Which throw would make the biggest difference for you in games right now?",
    "How much time do you realistically have to practise between sessions?"
  ]
}
```
