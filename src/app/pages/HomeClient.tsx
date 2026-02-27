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

export function LogoutSuccessMessage() {
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("logout") === "success") {
      setShowMessage(true);
      // Remove the query param from URL without reloading
      window.history.replaceState({}, "", window.location.pathname);
      // Hide message after 3 seconds
      const timer = setTimeout(() => {
        setShowMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!showMessage) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg animate-fade-in">
      <span className="font-medium">Déconnexion réussie</span>
    </div>
  );
}
