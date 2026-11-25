"use client";

/** A row of radio buttons that looks like a switch (format pickers). */
export function Segmented({ options, value, onChange, name }: { options: { value: string; label: string }[]; value: string; onChange?: (v: string) => void; name?: string }) {
  return (
    <div role="radiogroup" className="inline-flex flex-wrap gap-0.5 rounded-lg bg-sunk p-0.5">
      {options.map((o) => (
        <label key={o.value} className={`relative inline-flex h-10 cursor-pointer items-center rounded-md px-3 text-[13px] font-semibold transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${o.value === value ? "bg-raised text-fg shadow-sm" : "text-fg-muted hover:text-fg"}`}>
          <input type="radio" name={name ?? "segmented"} value={o.value} checked={o.value === value} onChange={() => onChange?.(o.value)} className="sr-only" />
          {o.label}
        </label>
      ))}
    </div>
  );
}
