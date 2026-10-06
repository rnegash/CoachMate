type Props = {
  headline: string;
  support: string;
  /** One recovery action, at most. */
  action?: React.ReactNode;
};

export function EmptyState({ headline, support, action }: Props) {
  return (
    <div className="flex flex-col items-center gap-space-2 rounded-lg border border-dashed border-border-strong bg-surface-raised px-space-4 py-space-8 text-center">
      <p className="text-title">{headline}</p>
      <p className="text-body text-ink-muted">{support}</p>
      {action && <div className="mt-space-2">{action}</div>}
    </div>
  );
}
