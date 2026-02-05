"use client";

import LiteYouTubeEmbed from "react-lite-youtube-embed";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";
import type { Video } from "@/db/types";
import { formatDateLong } from "@/lib/dates";

function VideoCard({ video }: { video: Video }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-video">
        <LiteYouTubeEmbed
          id={video.youtube_id}
          title={video.title}
          poster="maxresdefault"
          noCookie={true}
        />
      </div>
      <div className="p-4">
        <h3 className="font-['Merriweather_Sans'] font-bold text-[#101828] dark:text-gray-100 line-clamp-2">
          {video.title}
        </h3>
        {video.publication_date && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {formatDateLong(video.publication_date)}
          </p>
        )}
      </div>
    </div>
  );
}

export function VideosClient({ videos }: { videos: Video[] }) {
  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg">Aucune vidéo disponible pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}
