import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { assembleSystemPrompt } from "@/lib/goal-mentor-input";
import { parseSport, sportName } from "@/lib/instance-config";

const SPORT = parseSport(process.env.COACHMATE_SPORT);
const DOCS = path.join(process.cwd(), "documentation");

/** Reads a prompt file under documentation/ and fills in the sport and its reference. */
export async function loadSystemPrompt(...promptPath: string[]): Promise<string> {
  const prompt = await readFile(path.join(DOCS, ...promptPath), "utf8");
  const reference = SPORT
    ? await readFile(path.join(DOCS, "AI sport knowledge", `${SPORT}.md`), "utf8").catch(() => null)
    : null;
  return assembleSystemPrompt(prompt, SPORT && sportName(SPORT), reference);
}
