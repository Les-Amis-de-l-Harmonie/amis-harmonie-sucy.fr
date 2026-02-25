"use client";

import { useState, useEffect } from "react";
import type { Video } from "@/db/types";
import { ScrollReveal } from "@/app/components/ScrollReveal";

function VideoCard({ video, onPlay }: { video: Video; onPlay: () => void }) {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden cursor-pointer group hover-lift"
      onClick={onPlay}
    >
      <div className="aspect-video relative overflow-hidden">
        <img
          src={`https://i.ytimg.com/vi/${video.youtube_id}/maxresdefault.jpg`}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              `https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg`;
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
          <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-['Merriweather_Sans'] font-bold text-[#101828] dark:text-gray-100 line-clamp-2">
          {video.title}
        </h3>
      </div>
    </div>
  );
}

function VideoModal({ video, onClose }: { video: Video; onClose: () => void }) {
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
        className={`relative w-full ${isShort ? "max-w-sm" : "max-w-4xl"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className={isShort ? "aspect-[9/16]" : "aspect-video"}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.youtube_id}`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="w-full h-full rounded-lg border-0"
          />
        </div>
      </div>
    </div>
  );
}

export function VideosClient({ videos }: { videos: Video[] }) {
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg">Aucune vidéo disponible pour le moment.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video, index) => (
          <ScrollReveal key={video.id} staggerIndex={index}>
            <VideoCard video={video} onPlay={() => setActiveVideo(video)} />
          </ScrollReveal>
        ))}
      </div>

      {activeVideo && <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />}
    </>
  );
}
