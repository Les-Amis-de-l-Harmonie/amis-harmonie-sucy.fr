"use client";

import { useState, useEffect } from "react";
import type { GalleryImage } from "@/db/types";

interface HomeSlideshowProps {
  images: GalleryImage[];
}

export function HomeSlideshow({ images }: HomeSlideshowProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (images.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {images.map((image, index) => (
        <img
          key={image.id}
          src={image.image_url}
          alt={image.alt_text || ""}
          className="absolute inset-0 w-full h-full object-contain transition-transform duration-1000 ease-in-out rounded-xl"
          style={{
            transform: `translateX(${(index - currentSlide) * 100}%)`,
          }}
        />
      ))}
    </div>
  );
}
