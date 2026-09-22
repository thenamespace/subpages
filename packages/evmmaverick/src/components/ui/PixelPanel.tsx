import { cn } from "@/lib/cn";

/**
 * The cabinet panel. Solid 1px-equivalent borders rather than alpha-white:
 * on a dark surface an rgba white border glows, a solid dark-grey one sits
 * quietly where it belongs.
 */
export function PixelPanel({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "scanlines relative border-2 border-edge bg-panel",
        "shadow-[6px_6px_0_var(--color-ink-950)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
