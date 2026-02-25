"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Direction = "up" | "left" | "right" | "scale";

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  /** Direction of the reveal animation */
  direction?: Direction;
  /** Index for staggered animations (adds 100ms per index to delay) */
  staggerIndex?: number;
}

const INITIAL_TRANSFORMS: Record<Direction, string> = {
  up: "translateY(24px)",
  left: "translateX(-24px)",
  right: "translateX(24px)",
  scale: "scale(0.95)",
};

const VISIBLE_TRANSFORMS: Record<Direction, string> = {
  up: "translateY(0)",
  left: "translateX(0)",
  right: "translateX(0)",
  scale: "scale(1)",
};

export function ScrollReveal({
  children,
  delay = 0,
  className,
  direction = "up",
  staggerIndex,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Calculate total delay including stagger
  const staggerDelay = staggerIndex !== undefined ? staggerIndex * 100 : 0;
  const totalDelay = delay + staggerDelay;

  useEffect(() => {
    // If user prefers reduced motion, show immediately
    if (prefersReducedMotion) {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -50px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  // If reduced motion is preferred, render without animation
  if (prefersReducedMotion) {
    return (
      <div ref={ref} className={cn(className)}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? VISIBLE_TRANSFORMS[direction] : INITIAL_TRANSFORMS[direction],
        transition: `opacity 0.65s cubic-bezier(0.4, 0, 0.2, 1) ${totalDelay}ms, transform 0.65s cubic-bezier(0.4, 0, 0.2, 1) ${totalDelay}ms`,
        willChange: "transform, opacity",
      }}
    >
      {children}
    </div>
  );
}
