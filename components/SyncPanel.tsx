"use client";

import { useActionState } from "react";
import { syncSheetsAction } from "@/app/actions/sync";
import { Button } from "@/components/Button";
import { Refresh } from "@/components/icons";

/** lastSynced: when both roster and attendance were last pulled (the older of the two). */
export function SyncPanel({ lastSynced }: { lastSynced: string | null }) {
  const [state, action, pending] = useActionState(syncSheetsAction, null);

  return (
    <div className="flex flex-col gap-space-2">
      <div className="flex items-center justify-between gap-space-3">
        <p className="text-caption text-ink-muted">
          {lastSynced ? `Last synced ${lastSynced}` : "Not synced yet"}
        </p>
        <form action={action}>
          <Button type="submit" disabled={pending}>
            <Refresh size={20} />
            {pending ? "Syncing…" : "Sync now"}
          </Button>
        </form>
      </div>
      {state && (
        <p role="status" className={`text-caption ${state.ok ? "text-ink-muted" : "text-danger"}`}>
          {state.message}
        </p>
      )}
    </div>
  );
}
