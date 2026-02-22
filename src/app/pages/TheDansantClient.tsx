"use client";

import LiteYouTubeEmbed from "react-lite-youtube-embed";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";

export function TheDansantClient() {
  const videos = [
    { id: "iZwfSjflbKA", title: "Thé Dansant 2025" },
    { id: "ze4b6Br0qCI", title: "Thé Dansant 2024" },
  ];

  return (
    <section className="mb-12">
      <h3 className="font-['Merriweather_Sans'] text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        Vidéos
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {videos.map((video) => (
          <div
            key={video.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden"
          >
            <div className="aspect-video">
              <LiteYouTubeEmbed
                id={video.id}
                title={video.title}
                poster="maxresdefault"
                noCookie={true}
              />
            </div>
            <div className="p-4">
              <h4 className="font-['Merriweather_Sans'] font-bold text-gray-900 dark:text-gray-100">
                {video.title}
              </h4>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
