"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { Video } from "@/db/types";

interface VideoModalProps {
  video: Video;
  onClose: () => void;
}

/**
 * Extrait tel quel de l'ancien `MusicianHome.tsx` (composant imbriqué dans
 * `MusicianHomeClient`) : aucun changement de comportement, seulement un
 * fichier à part.
 */
export function VideoModal({ video, onClose }: VideoModalProps) {
  const isShort = video.is_short === 1;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${isShort ? "max-w-md" : "max-w-6xl"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute -top-10 right-0 text-white transition-colors hover:text-white/70"
        >
          <X className="h-8 w-8" aria-hidden="true" />
        </button>

        <div className={isShort ? "aspect-[9/16]" : "aspect-video"}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.youtube_id}`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-full w-full rounded-lg border-0"
          />
        </div>
      </div>
    </div>
  );
}
