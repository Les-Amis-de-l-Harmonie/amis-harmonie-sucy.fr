"use client";

import { useState, useRef, useEffect } from "react";

interface ExpandableDescriptionProps {
  text: string;
}

export function ExpandableDescription({ text }: ExpandableDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    // Check if text is actually clamped (overflowing)
    if (textRef.current) {
      const element = textRef.current;
      setIsClamped(element.scrollHeight > element.clientHeight);
    }
  }, [text]);

  return (
    <div className="text-gray-600 dark:text-gray-400 text-sm mb-3 flex-1">
      <p ref={textRef} className={isExpanded ? "" : "line-clamp-4"}>
        {text}
      </p>
      {isClamped && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-primary text-sm hover:underline mt-1"
          type="button"
        >
          {isExpanded ? "Réduire" : "Lire la suite"}
        </button>
      )}
    </div>
  );
}
