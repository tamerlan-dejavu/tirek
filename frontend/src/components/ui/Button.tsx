import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent/90",
  secondary: "border border-line bg-surface text-ink hover:bg-canvas",
  danger: "border border-risk-r1 text-risk-r1 hover:bg-risk-r1/5",
  ghost: "text-ink-muted hover:text-ink",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "md" | "lg" }) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-sm font-medium disabled:cursor-not-allowed disabled:opacity-50",
        size === "lg" ? "min-h-12 px-5 text-base" : "min-h-9 px-3 text-sm", // lg: field use on phones
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
