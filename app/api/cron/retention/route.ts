// Daily retention job (vercel.json cron). First syncs the roster, so
// roster-removal deletion (in syncRoster) happens within a day of the
// Sheet change, then deletes check-ins 7 days after STOP and expired
// check-in drafts. A failed roster sync doesn't block the purge.
import { isCronAuthorized } from "@/lib/retention";
import { purgeRetention } from "@/lib/retention-purge";
import { syncRoster } from "@/lib/roster-sync";

export async function GET(request: Request) {
  // Vercel Cron sends "Authorization: Bearer $CRON_SECRET".
  if (!isCronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  let rosterSynced = true;
  try {
    await syncRoster();
  } catch (e) {
    rosterSynced = false;
    // Error type only: sync errors can name Sheet contents.
    console.error("Daily roster sync failed:", e instanceof Error ? e.name : typeof e);
  }
  return Response.json({ rosterSynced, ...(await purgeRetention()) });
}
