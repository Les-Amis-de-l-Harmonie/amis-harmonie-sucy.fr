"use client";

import { AlertTriangle, Check, X } from "lucide-react";
import type { PresenceStatus } from "@/db/types";

export function StatusPill({ status }: { status: PresenceStatus | null }) {
  if (status === "present") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success dark:bg-success/20 dark:text-success">
        <Check className="h-3.5 w-3.5" />
        Présent
      </span>
    );
  }
  if (status === "absent") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive dark:bg-destructive/20 dark:text-destructive">
        <X className="h-3.5 w-3.5" />
        Absent
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning dark:bg-warning/20 dark:text-warning">
      <AlertTriangle className="h-3.5 w-3.5" />À répondre
    </span>
  );
}
