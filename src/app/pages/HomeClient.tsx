"use client";

import { useState, useEffect } from "react";

const images = [
  "/images/home1.jpg",
  "/images/home2.jpg",
  "/images/home3.jpg",
  "/images/home4.jpg",
];

export function HomeSlideshow() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {images.map((image, index) => (
        <img
          key={index}
          src={image}
          alt=""
          className="absolute inset-0 w-full h-full object-contain transition-transform duration-1000 ease-in-out rounded-xl"
          style={{
            transform: `translateX(${(index - currentSlide) * 100}%)`,
          }}
        />
      ))}
    </div>
  );
}
