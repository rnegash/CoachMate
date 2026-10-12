import type { NextConfig } from "next";

const AI_PROMPT_FILES = ["./documentation/AI goal mentor/*.md", "./documentation/AI sport knowledge/*.md"];

const nextConfig: NextConfig = {
  // AI prompts and sport references are read from disk at runtime
  // (lib/goal-mentor.ts, lib/bot-matcher.ts), so they must be part of the server bundle.
  outputFileTracingIncludes: {
    "/*": AI_PROMPT_FILES,
    "/players/**/*": AI_PROMPT_FILES,
    "/api/whatsapp": ["./documentation/AI checkin matcher/*.md"],
  },
};

export default nextConfig;
