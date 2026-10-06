type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({ variant = "secondary", className = "", ...props }: Props) {
  const look =
    variant === "primary"
      ? "bg-accent text-on-accent hover:bg-accent-hover"
      : "border-[1.5px] border-border-strong bg-surface-raised text-ink hover:bg-surface-sunken";
  return (
    <button
      {...props}
      className={`inline-flex min-h-control-md items-center justify-center gap-space-2 rounded-md px-space-4 text-title disabled:opacity-50 ${look} ${className}`}
    />
  );
}
