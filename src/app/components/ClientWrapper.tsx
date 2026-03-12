"use client";

import { type ReactNode } from "react";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";

interface ClientWrapperProps {
  children: ReactNode;
}

export function ClientWrapper({ children }: ClientWrapperProps) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
