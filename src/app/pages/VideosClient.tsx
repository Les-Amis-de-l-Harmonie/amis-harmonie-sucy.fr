"use client";

import LiteYouTubeEmbed from "react-lite-youtube-embed";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";
import type { Video } from "@/db/types";

function VideoCard({ video }: { video: Video }) {
  const isShort = video.is_short === 1;
  
  return (
    <div className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow ${isShort ? 'max-w-[300px] mx-auto' : ''}`}>
      <div className={isShort ? 'aspect-[9/16]' : 'aspect-video'}>
        <LiteYouTubeEmbed
          id={video.youtube_id}
          title={video.title}
          poster="maxresdefault"
          noCookie={true}
        />
      </div>
      <div className="p-4">
        <h3 className="font-['Merriweather_Sans'] font-bold text-[#101828] line-clamp-2">
          {video.title}
        </h3>
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
