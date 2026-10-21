import type { InputHTMLAttributes, ReactNode } from "react";

export function Field({ label, hint, error, ...input }: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
  error?: string;
}) {
  const id = input.id ?? input.name;
  return (
    <label htmlFor={id} className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        id={id}
        className="mt-1 block min-h-10 w-full rounded-sm border border-line bg-surface px-3 text-sm aria-[invalid=true]:border-risk-r1"
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...input}
      />
      {hint && !error && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
      {error && (
        <span id={`${id}-error`} className="mt-1 block text-xs text-risk-r1">
          {error}
        </span>
      )}
    </label>
  );
}
