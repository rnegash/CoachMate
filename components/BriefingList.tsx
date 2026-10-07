"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { PlayerBriefingRow } from "@/components/PlayerBriefingRow";
import { SearchField } from "@/components/SearchField";
import { filterByName, type BriefingPlayer } from "@/lib/briefing";

export function BriefingList({ players }: { players: BriefingPlayer[] }) {
  const [query, setQuery] = useState("");
  const visible = filterByName(players, query);

  if (players.length === 0) {
    return (
      <EmptyState
        headline="No players yet"
        support="Sync the roster from Google Sheets to see the team here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-space-4">
      <SearchField
        label="Search players"
        placeholder="Search by name"
        value={query}
        onChange={setQuery}
      />
      {visible.length === 0 ? (
        <EmptyState
          headline="No players match"
          support={`Nobody on the roster matches “${query.trim()}”.`}
          action={<Button onClick={() => setQuery("")}>Clear search</Button>}
        />
      ) : (
        <ul className="flex flex-col gap-space-2">
          {visible.map((p) => (
            <li key={p.id}>
              <PlayerBriefingRow
                href={`/players/${encodeURIComponent(p.id)}`}
                name={p.name}
                jerseyNumber={p.jersey_number}
                signals={p.signals}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
