"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function LegendItem({
  shapeClass,
  Icon,
  label,
}: {
  shapeClass: string;
  Icon: LucideIcon;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center", shapeClass)}>
        <Icon className="h-3 w-3" aria-hidden="true" />
      </span>
      {label}
    </span>
  );
}
