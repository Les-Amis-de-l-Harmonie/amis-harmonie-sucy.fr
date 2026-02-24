"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { ZoomIn, ZoomOut, Move, Check, X } from "lucide-react";

interface CircularCropperProps {
  imageFile: File | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (croppedBlob: Blob) => void;
}

const CONTAINER_SIZE = 256;
const CIRCLE_CENTER = { x: CONTAINER_SIZE / 2, y: CONTAINER_SIZE / 2 };

// At scale=1 the shorter side fills the container (cover behavior)
function getBaseSize(imgWidth: number, imgHeight: number) {
  const imgAspect = imgWidth / imgHeight;
  if (imgAspect > 1) {
    return { width: CONTAINER_SIZE * imgAspect, height: CONTAINER_SIZE };
  }
  return { width: CONTAINER_SIZE, height: CONTAINER_SIZE / imgAspect };
}

export function CircularCropper({ imageFile, isOpen, onClose, onConfirm }: CircularCropperProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Clamp offset so the image always fully covers the crop circle
  const clampOffset = useCallback(
    (off: { x: number; y: number }, s: number) => {
      if (imageSize.width === 0) return off;
      const { width: baseW, height: baseH } = getBaseSize(imageSize.width, imageSize.height);
      const maxX = Math.max(0, (baseW * s - CONTAINER_SIZE) / 2);
      const maxY = Math.max(0, (baseH * s - CONTAINER_SIZE) / 2);
      return {
        x: Math.max(-maxX, Math.min(maxX, off.x)),
        y: Math.max(-maxY, Math.min(maxY, off.y)),
      };
    },
    [imageSize]
  );

  useEffect(() => {
    if (imageFile && isOpen) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);

      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
        setScale(1);
        setOffset({ x: 0, y: 0 });
      };
      img.src = url;

      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile, isOpen]);

  // Re-clamp offset whenever scale changes (e.g. zoom out after panning)
  useEffect(() => {
    setOffset((prev) => clampOffset(prev, scale));
  }, [scale, clampOffset]);

  const handleZoomIn = useCallback(() => setScale((s) => Math.min(s + 0.1, 3)), []);
  const handleZoomOut = useCallback(() => setScale((s) => Math.max(s - 0.1, 1)), []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    },
    [handleZoomIn, handleZoomOut]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX, y: clientY });
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - dragStart.x;
      const deltaY = clientY - dragStart.y;

      setOffset((prev) => clampOffset({ x: prev.x + deltaX, y: prev.y + deltaY }, scale));
      setDragStart({ x: clientX, y: clientY });
    },
    [isDragging, dragStart, scale, clampOffset]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const generateCroppedImage = useCallback(() => {
    if (!imageRef.current || imageSize.width === 0) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const outputSize = 400;
    canvas.width = outputSize;
    canvas.height = outputSize;

    const img = imageRef.current;
    const { width: baseWidth, height: baseHeight } = getBaseSize(imageSize.width, imageSize.height);

    const scaledWidth = baseWidth * scale;
    const scaledHeight = baseHeight * scale;

    // Image top-left corner in container coordinates
    const imgLeft = CIRCLE_CENTER.x + offset.x - scaledWidth / 2;
    const imgTop = CIRCLE_CENTER.y + offset.y - scaledHeight / 2;

    // Ratio: original image pixels per display pixel
    const pixelRatioX = imageSize.width / scaledWidth;
    const pixelRatioY = imageSize.height / scaledHeight;

    // Source rectangle in the original image (circle bounding box is 0,0 → CONTAINER_SIZE)
    const sourceX = -imgLeft * pixelRatioX;
    const sourceY = -imgTop * pixelRatioY;
    const sourceWidth = CONTAINER_SIZE * pixelRatioX;
    const sourceHeight = CONTAINER_SIZE * pixelRatioY;

    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.clip();

    // Offset is always clamped → source coords are always within image bounds
    ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, outputSize, outputSize);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onConfirm(blob);
        }
      },
      "image/jpeg",
      0.9
    );
  }, [scale, offset, imageSize, onConfirm]);

  if (!imageUrl || imageSize.width === 0) return null;

  const { width: baseWidth, height: baseHeight } = getBaseSize(imageSize.width, imageSize.height);
  const displayWidth = baseWidth * scale;
  const displayHeight = baseHeight * scale;

  const imgLeft = CIRCLE_CENTER.x + offset.x - displayWidth / 2;
  const imgTop = CIRCLE_CENTER.y + offset.y - displayHeight / 2;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recadrer la photo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            ref={containerRef}
            className="relative w-64 h-64 mx-auto bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            onWheel={handleWheel}
          >
            <div className="absolute inset-0 pointer-events-none z-10">
              <svg className="w-full h-full">
                <defs>
                  <mask id="circleMask">
                    <rect width="100%" height="100%" fill="white" />
                    <circle cx="50%" cy="50%" r="50%" fill="black" />
                  </mask>
                </defs>
                <rect width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#circleMask)" />
                <circle cx="50%" cy="50%" r="50%" fill="none" stroke="white" strokeWidth="2" />
              </svg>
            </div>

            <img
              ref={imageRef}
              src={imageUrl}
              alt="À recadrer"
              className="absolute max-w-none select-none"
              style={{
                width: `${displayWidth}px`,
                height: `${displayHeight}px`,
                left: `${imgLeft}px`,
                top: `${imgTop}px`,
                touchAction: "none",
              }}
              draggable={false}
            />

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 text-xs text-white bg-black/50 px-2 py-1 rounded z-20 pointer-events-none">
              <Move className="w-3 h-3" />
              <span>Déplacer</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="icon" onClick={handleZoomOut} disabled={scale <= 1}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground w-16 text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button variant="outline" size="icon" onClick={handleZoomIn} disabled={scale >= 3}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Annuler
            </Button>
            <Button className="flex-1" onClick={generateCroppedImage}>
              <Check className="w-4 h-4 mr-2" />
              Confirmer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
