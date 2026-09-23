import { cn } from "@/lib/cn";

/**
 * Wrapper that switches on the theme bridge. Every use of a library component
 * must sit inside one of these, or it renders in the library's own light,
 * rounded default.
 */
export function EnsScope({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("ens-scope", className)}>{children}</div>;
}
