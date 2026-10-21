import clsx from "clsx";
import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "inverse" | "inverse-outline";
type Size = "sm" | "md" | "lg";

const PRIMARY = "bg-accent-strong text-white hover:bg-accent-hover";
const SECONDARY = "border border-line bg-transparent text-ink hover:border-line-strong hover:bg-mist";

const VARIANTS: Record<Variant, string> = {
  primary: PRIMARY,
  secondary: SECONDARY,
  ghost: "text-muted hover:bg-mist hover:text-ink",
  danger: "border border-critical/40 bg-transparent text-critical-ink hover:bg-critical-soft",
  // Public site variants share the same system on the graphite background
  inverse: PRIMARY,
  "inverse-outline": SECONDARY,
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-[15px] gap-2", // field use on phones: ≥ 44px target
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return clsx(
    "inline-flex items-center justify-center rounded-[var(--radius-button)] font-medium whitespace-nowrap select-none",
    "transition-colors duration-[var(--duration-base)] ease-[var(--ease-precise)]",
    "disabled:pointer-events-none disabled:opacity-45",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  icon,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; icon?: ReactNode }) {
  return (
    <button className={buttonClass(variant, size, className)} {...props}>
      {icon}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  icon,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; variant?: Variant; size?: Size; icon?: ReactNode }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...props}>
      {children}
      {icon}
    </Link>
  );
}
