import { Search } from "@/components/icons";

type Props = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

export function SearchField({ label, placeholder, value, onChange }: Props) {
  return (
    <label className="flex h-control-md items-center gap-space-2 rounded-md border-[1.5px] border-border-strong bg-surface-raised px-space-3 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-focus-ring">
      <span className="sr-only">{label}</span>
      <Search size={20} className="shrink-0 text-ink-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-ink-muted"
      />
    </label>
  );
}
