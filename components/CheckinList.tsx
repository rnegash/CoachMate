import { checkinCountLine, splitLatest } from "@/lib/checkin-display";
import { formatDate } from "@/lib/format";

type Checkin = { id: string; text: string; created_at: string };

/**
 * A goal's shared WhatsApp check-ins, newest first. The text is the
 * player's own words, not AI output, so it carries no AIBadge.
 * Renders nothing when there are no check-ins.
 */
export function CheckinList({ checkins }: { checkins: Checkin[] }) {
  const summary = checkinCountLine(checkins);
  if (!summary) return null;
  const { shown, earlier } = splitLatest(checkins);

  return (
    <div className="flex flex-col gap-space-2 border-t border-border pt-space-3">
      <p className="text-label text-ink-muted">{summary}</p>
      <ul className="flex flex-col gap-space-3">
        {shown.map((c) => (
          <CheckinItem key={c.id} checkin={c} />
        ))}
      </ul>
      {earlier.length > 0 && (
        <details>
          <summary className="min-h-control-sm cursor-pointer py-space-2 text-label text-ink-muted">
            Show {earlier.length} earlier check-in{earlier.length === 1 ? "" : "s"}
          </summary>
          <ul className="flex flex-col gap-space-3">
            {earlier.map((c) => (
              <CheckinItem key={c.id} checkin={c} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function CheckinItem({ checkin }: { checkin: Checkin }) {
  return (
    <li>
      <figure className="flex flex-col gap-space-1 border-l-2 border-border-strong pl-space-3">
        <blockquote className="whitespace-pre-line text-body">{checkin.text}</blockquote>
        <figcaption className="text-caption text-ink-muted">
          Player via WhatsApp · {formatDate(checkin.created_at)}
        </figcaption>
      </figure>
    </li>
  );
}
