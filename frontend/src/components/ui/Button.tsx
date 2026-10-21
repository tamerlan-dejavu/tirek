import clsx from "clsx";
import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "inverse" | "inverse-outline";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-teal-strong text-white hover:bg-[#106969] active:bg-[#0d5a5a]",
  secondary: "border border-line-strong bg-surface text-ink hover:border-steel-2 hover:bg-canvas",
  ghost: "text-muted hover:bg-mist hover:text-ink",
  danger: "border border-critical/60 bg-surface text-critical-ink hover:bg-critical-soft",
  inverse: "bg-teal text-navy hover:bg-[#2bb8b8]",
  "inverse-outline": "border border-white/25 text-white hover:border-white/60 hover:bg-white/5",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-2.5 text-[13px] gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
  lg: "h-12 px-5 text-[15px] gap-2", // field use on phones: ≥ 44px target
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return clsx(
    "inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap select-none",
    "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-precise)]",
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
