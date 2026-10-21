import type { InputHTMLAttributes, ReactNode } from "react";

export function Field({
  label,
  hint,
  error,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
  error?: string;
}) {
  const id = input.id ?? input.name;
  return (
    <label htmlFor={id} className="block">
      <span className="label-tech">{label}</span>
      <input
        id={id}
        className="mt-1.5 block h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-[15px] transition-colors placeholder:text-faint focus:border-teal focus:ring-3 focus:ring-teal/15 focus:outline-none aria-[invalid=true]:border-critical"
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...input}
      />
      {hint && !error && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
      {error && (
        <span id={`${id}-error`} className="mt-1.5 block text-xs text-critical-ink">
          {error}
        </span>
      )}
    </label>
  );
}
