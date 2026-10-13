# Assistant Coach: Technical Spec

For developers. This file is not part of the system prompt text. The prompt itself is in `assistant-coach.prompt.md`.

## 1. Where the prompt goes

Send the full contents of `assistant-coach.prompt.md` as one string in the top-level `system` parameter of the Messages API request. Do not send it as a message with the "user" role.

## 2. Assembly

- The prompt file contains six sections, each starting with an uppercase heading (ROLE AND CONTEXT, SOURCES AND EVIDENCE, COACHING THE COACH, TOPIC HANDLING, TONE AND RESPONSE STYLE, BOUNDARIES AND DATA RULES), separated by a blank line, followed by the `{{SPORT_REFERENCE}}` placeholder (section 3a).
- Keep the prompt in its own file so other teams can edit it without touching code.

## 3. Placeholder

- Replace `{{SPORT}}` before sending, using the app's sport setting.
- If no sport is set, replace the whole phrase `adult recreational {{SPORT}} teams` with `adult recreational sports teams`.
- Reject or escape values that contain line breaks or instructions, since the setting becomes part of the prompt.

## 3a. Sport reference

- The last line of the prompt is `{{SPORT_REFERENCE}}`. Replace it with the contents of the sport's reference file, from the line `SPORT REFERENCE: …` to the end (drop the HTML comment at the top).
- Reference files live in `documentation/AI sport knowledge/`, one per sport (`ultimate.md`). The same file is used by the Assistant Coach and the Goal Mentor.
- If no file exists for the sport setting, replace the placeholder with: `SPORT REFERENCE: none available. Use general knowledge of the sport and say when a sport-specific point is uncertain.`
- The reference is fixed text, so place it in the system prompt and let prompt caching cover it (the system prompt is the same on every request).

## 4. Model

- Model: Claude Haiku 5.5 (`claude-haiku-5-5`), the current Haiku. Changed from Haiku 4.5 on 2026-10-13 when the chat was built: Haiku 5.5 replaces it in the same tier at a lower price.
- Limits: 1M-token context window, 128K-token max output.
- Price: $0.10 per million input tokens, $0.50 per million output tokens (prompts up to 100K tokens).
- Turn thinking off with `thinking: {"type": "disabled"}` (Haiku 5.5 thinks by default) and set `output_config: {"effort": "low"}`. This keeps cost and latency low for short coaching answers.
- Refusals: Haiku 5.5 has no server-side refusal fallback. Treat `stop_reason: "refusal"` as "no reply available".
- Source: Anthropic model documentation, checked October 13, 2026. Re-check before release.

## 5. Request parameters

- `max_tokens`: 1024. Answers are short by default, so this is a safety limit and not a target.
- Do not set other sampling parameters until you have checked the current API reference for Haiku 4.5.

## 6. Conversation state

- The API keeps no memory. For each request, send the full message history of the current session in `messages`, alternating user and assistant.
- Start a new session with an empty history. This matches the stateless design and the "no earlier conversations" line in the prompt.
- Input cost grows with each turn, because the whole history is resent. The app caps a session at 20 coach messages of up to 2,000 characters each (`lib/assistant-coach-input.ts`). The server checks the history the browser sends (alternating roles, starts and ends with the coach) because it keeps no session of its own.

## 7. Security

- Call the API from a server route (for example a Next.js API route), never from the browser. The API key stays in a server-side environment variable.
- Keep the system prompt on the server. The client sends only the coach's message and the session history.

## 8. Request shape (example)

```json
{
  "model": "claude-haiku-5-5",
  "max_tokens": 1024,
  "system": "<assembled prompt>",
  "thinking": { "type": "disabled" },
  "output_config": { "effort": "low" },
  "messages": [
    { "role": "user", "content": "..." }
  ]
}
```

## 9. Disclosure in the interface (EU AI Act, Art. 50)

- Show the static "AI-generated" notice on the chat screen and label each reply as AI-generated. The line in the prompt's BOUNDARIES AND DATA RULES section does not replace this.
- Art. 50(2) (machine-readable marking of AI-generated text) is a separate duty that falls on the provider of the system, not on the prompt. It is not covered in the current compliance report and should be checked, particularly for teams who deploy their own copy of the open-source app.
