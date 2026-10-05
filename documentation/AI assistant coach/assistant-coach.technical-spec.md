# Assistant Coach: Technical Spec

For developers. This file is not part of the system prompt text. The prompt itself is in `assistant-coach.prompt.md`.

## 1. Where the prompt goes

Send the full contents of `assistant-coach.prompt.md` as one string in the top-level `system` parameter of the Messages API request. Do not send it as a message with the "user" role.

## 2. Assembly

- The prompt file contains six sections, each starting with an uppercase heading (ROLE AND CONTEXT, SOURCES AND EVIDENCE, COACHING THE COACH, TOPIC HANDLING, TONE AND RESPONSE STYLE, BOUNDARIES AND DATA RULES), separated by a blank line.
- Keep the prompt in its own file so other teams can edit it without touching code.

## 3. Placeholder

- Replace `{{SPORT}}` before sending, using the app's sport setting.
- If no sport is set, replace the whole phrase `adult recreational {{SPORT}} teams` with `adult recreational sports teams`.
- Reject or escape values that contain line breaks or instructions, since the setting becomes part of the prompt.

## 4. Model

- Model: Claude Haiku 4.5. Use the pinned snapshot `claude-haiku-4-5-20251001` so behavior does not change without notice. The alias `claude-haiku-4-5` resolves to the same snapshot today.
- Limits: 200K-token context window, 64K-token max output.
- Price: $1 per million input tokens, $5 per million output tokens.
- Do not enable extended thinking. Omit the `thinking` parameter, which keeps cost and latency low for short coaching answers.
- Source: Anthropic model documentation (platform.claude.com), checked October 5, 2026. Re-check before release.

## 5. Request parameters

- `max_tokens`: 1024. Answers are short by default, so this is a safety limit and not a target.
- Do not set other sampling parameters until you have checked the current API reference for Haiku 4.5.

## 6. Conversation state

- The API keeps no memory. For each request, send the full message history of the current session in `messages`, alternating user and assistant.
- Start a new session with an empty history. This matches the stateless design and the "no earlier conversations" line in the prompt.
- Input cost grows with each turn, because the whole history is resent. Consider capping the session length.

## 7. Security

- Call the API from a server route (for example a Next.js API route), never from the browser. The API key stays in a server-side environment variable.
- Keep the system prompt on the server. The client sends only the coach's message and the session history.

## 8. Request shape (example)

```json
{
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 1024,
  "system": "<assembled prompt>",
  "messages": [
    { "role": "user", "content": "..." }
  ]
}
```

## 9. Disclosure in the interface (EU AI Act, Art. 50)

- Show the static "AI-generated" notice on the chat screen and label each reply as AI-generated. The line in the prompt's BOUNDARIES AND DATA RULES section does not replace this.
- Art. 50(2) (machine-readable marking of AI-generated text) is a separate duty that falls on the provider of the system, not on the prompt. It is not covered in the current compliance report and should be checked, particularly for teams who deploy their own copy of the open-source app.
