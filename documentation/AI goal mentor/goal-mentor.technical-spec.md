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
- Never add the player's name, jersey number or contact details. The draft and saved goal texts may still contain a name typed by the coach. The selected player's own name is replaced before sending (section 6a); other names rely on the static caption under the input (`CLAUDE.md`, Data-Flow section) and the prompt's rule not to repeat one.

## 4. Model

- Model: Claude Sonnet 5.5 (`claude-sonnet-5-5`), $2 / $10 per million input / output tokens.
- Why not Haiku 4.5 (decided 2026-10-07, after running the same 7 drafts on both): Haiku gave sensible feedback but ignored the output rules. It offered no suggested goal in 7 of 7 runs and repeated a name from the draft in 2 of 3 runs. Sonnet 5.5 suggested a goal in 6 of 7 (none only for the out-of-scope weight goal), repeated no names, and stated its assumptions, at the same speed (3-6 s).
- Thinking off: `thinking: { type: "between_tools" }` (the lowest setting on this model; `disabled` returns a 400). In testing, thinking on gave no better results. Effort `low` (`output_config.effort`). Latency matters: the coach usually asks for feedback in the middle of a conversation with the player.
- `between_tools` is accepted only by Sonnet 5.5. If the model changes, remove it.
- Prompt caching: the system prompt (prompt + sport reference, about 5.5k tokens) is identical on every request, so it is sent as one text block with `cache_control: { type: "ephemeral" }`. That brings a request from about 1.4 to about 0.5 cents.
- Refusal fallback: `fallbacks: "default"` with beta `server-side-fallback-2026-07-01` (Claude API only). A refusal is unlikely for coaching goals; the fallback is cheap insurance. A request that still ends in `refusal` shows the "no feedback" message (section 7).
- Re-check model availability and pricing before release.

## 5. Output format (structured outputs)

Use structured outputs so the response is always valid JSON in the shape the UI expects. Haiku 4.5 supports this.

- Parameter: `output_config: { format: { type: "json_schema", schema } }`. In TypeScript: `client.beta.messages.parse()` (beta, because of the fallback) with `betaZodOutputFormat(...)` from `@anthropic-ai/sdk/helpers/beta/zod`, which also validates the result.
- The API does not enforce array lengths. Don't put the limits in the schema either: a third item would then fail the whole response. Trim on the server instead (at most 2 feedback points, at most 2 questions; `limitResult` in `lib/goal-mentor-input.ts`).
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

- `max_tokens`: 2048. A safety limit, not a target; responses were about 150-320 tokens in testing.
- No sampling parameters: Sonnet 5.5 rejects non-default values.

## 6a. Name removal (safety net)

- Before sending, the server replaces the selected player's name in the draft and in each other active goal text with "the player" (`nameRemover`, same matching rules as below). Saved goals are sent again on every later request, so a name typed once would otherwise keep reaching the API.
- The prompt tells the model never to repeat a name from the draft. As a second line of defence, the server replaces the selected player's name in every field of the response with "the player" (`removeName` in `lib/goal-mentor-input.ts`): the full name and each part of it, case-insensitive, whole words only, keeping possessives ("the player's").
- The name is read from the database on the server and never sent to the API.
- This catches only the selected player's own name, not teammates or other people named in the draft. Detecting any name in the coach's input stays deferred (`CLAUDE.md`, Future Ideas).

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
- Decided 2026-10-07: nothing records whether a goal came from an AI suggestion (no flag on the goal). Instead, the Goals section on Player Detail carries a static footnote: "Goals may have been written with the help of AI." It is always shown, whether or not a particular goal was AI-assisted.
- Known trade-off: if a later compliance review requires a label on each AI-derived goal, past goals can't be identified. Revisit this decision before adding any per-goal label.

## 12. Request shape (example)

```json
{
  "model": "claude-sonnet-5-5",
  "max_tokens": 2048,
  "system": [{ "type": "text", "text": "<assembled prompt>", "cache_control": { "type": "ephemeral" } }],
  "thinking": { "type": "between_tools" },
  "fallbacks": "default",
  "messages": [
    {
      "role": "user",
      "content": "<today>2026-10-07</today>\n<goal_draft>better forehands</goal_draft>"
    }
  ],
  "output_config": { "effort": "low", "format": { "type": "json_schema", "schema": { "…": "see section 5" } } }
}
```

Possible response:

```json
{
  "feedback": [
    { "aspect": "clear_and_checkable", "text": "\"Better\" leaves open what should change and how anyone would notice. Naming one situation, such as forehands past a mark, and a simple count makes it checkable." },
    { "aspect": "realistic", "text": "Break throws need a partner to mark. Adding practice between sessions keeps the goal moving on weeks without training." }
  ],
  "suggested_goal": "By 4 November, I complete 7 of 10 forehand break throws past a static mark at 10 metres, practising with a partner twice a week for 10 minutes.",
  "questions_for_player": [
    "Which throw would make the biggest difference for you in games right now?",
    "How much time do you realistically have to practise between sessions?"
  ]
}
```
