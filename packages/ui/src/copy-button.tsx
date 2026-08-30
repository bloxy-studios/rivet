"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./button";

export interface CopyButtonProps {
  value: string;
  label?: string;
  size?: "sm" | "md";
}

/** Clipboard copy with visible confirmation (credentials, DSNs, ids). */
export function CopyButton({ value, label = "Copy", size = "sm" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied ✓" : label}
    </Button>
  );
}
