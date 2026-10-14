---
name: diagram-sync
description: Keeps CoachMate's technical diagrams (architecture, WhatsApp check-in process, data flow, retention) in step with docs and code. Use PROACTIVELY before every git commit, and when asked to check, update or list the project's diagrams.
---

# Diagram sync

Checks the pending changes against every technical diagram and fixes
diagrams that no longer match, so they go into the same commit.

The list of diagrams, their sources of truth and their watch paths is in
[registry.md](registry.md). Read it first, every run.

## Steps

1. **Collect the change set.** Everything that will be committed, relative to
   HEAD:
   ```bash
   git status --porcelain=v1 -uall
   git diff HEAD --stat
   ```
   Read the actual diffs (`git diff HEAD -- <path>`, and untracked files in
   full) for any file that matches a watch path.

2. **Find new or removed diagrams.** Compare the registry with what exists:
   ```bash
   grep -rln '```mermaid' --include='*.md' . --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.claude
   ```
   Also look in the change set for new `.mmd`, `.drawio`, `.puml`,
   `.excalidraw` or diagram images. Add a registry entry for any diagram that
   isn't listed (file, section, what it shows, sources of truth, watch paths);
   remove entries whose diagram is gone. Ignore `documentation/archive/`
   unless a diagram there is linked from a current doc.

3. **Pick affected diagrams.** A diagram is affected if a changed file matches
   one of its watch paths or sources of truth, or if the diagram's own file
   changed. If nothing is affected, say so in one line and go to step 6.

4. **Check each affected diagram against its sources.** Read the diagram and
   the relevant parts of its sources (the changed parts at minimum; the full
   source when the diagram claims something specific about it). Look for:
   - components, tables, routes, branches or edges that were added, removed
     or renamed in code or decided in docs
   - edge labels that claim data crosses a boundary when it no longer does
     (or the reverse) — these matter most here, because the diagrams are the
     privacy record (`CLAUDE.md`, Data-Flow & Privacy Boundaries)
   - numbers and durations (character limit, 24 h, 7 days, cron time)
   - scope changes: a feature built, deferred or dropped
   - companion text in the same file (header, Scope, decision log, prose under
     a chart) that now disagrees with the diagram

   Code wins over the diagram for "what is built"; `CLAUDE.md` wins for "what
   is decided". If code and `CLAUDE.md` disagree with each other, don't pick
   one — stop and report it to the user, since that's a compliance question,
   not a diagram fix.

5. **Update.** Edit the Mermaid in place, keeping its existing style (node
   naming, `<br/>` line breaks, subgraph layout, classDefs). Then:
   - D1 (architecture): add a dated "Updated" note to the header line, and a
     numbered, dated decision-log entry if a design decision changed.
   - Deferred or dropped features: leave them out of the diagram and record
     the deferral in the decision log; historical docs get inline dated notes,
     not deletions.
   - Keep the companion text and the registry in step.
   - Use absolute dates (today's date), not "today" or "this week".
   - Check the Mermaid still parses: balanced brackets/quotes, no bare `"`
     inside labels, every referenced node defined, subgraph `end`s match.
   - Stage your edits (`git add <files>`) so they go into the same commit.

6. **Report** in a few lines: which diagrams were checked, what changed (or
   "no diagram affected"), and any code/doc conflict left for the user.

## Rules

- Don't change code or `CLAUDE.md` to match a diagram. This skill only
  updates diagrams, their companion text and the registry.
- Don't commit while a conflict from step 4 is unresolved; tell the user
  and let them decide.
- Keep examples and labels in English (the team doesn't speak German).
- No priority/urgency/score wording in labels, even as a node name
  (`CLAUDE.md`, No priority/urgency scoring).
