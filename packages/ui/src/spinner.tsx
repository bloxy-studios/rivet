import { cn } from "./cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <output
      aria-label="Loading"
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-border border-t-accent",
        className,
      )}
    ></output>
  );
}
