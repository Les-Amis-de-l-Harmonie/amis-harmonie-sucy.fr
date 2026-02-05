import type { Area } from "react-easy-crop";
import { IMAGE_CONFIG } from "./constants";

const {
  EVENT_TARGET_WIDTH: TARGET_WIDTH,
  EVENT_TARGET_HEIGHT: TARGET_HEIGHT,
  WEBP_QUALITY,
} = IMAGE_CONFIG;

export function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });
}

export async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  const aspectRatio = pixelCrop.width / pixelCrop.height;
  let outputWidth = TARGET_WIDTH;
  let outputHeight = TARGET_WIDTH / aspectRatio;

  if (outputHeight > TARGET_HEIGHT) {
    outputHeight = TARGET_HEIGHT;
    outputWidth = TARGET_HEIGHT * aspectRatio;
  }

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas is empty"));
        }
      },
      "image/webp",
      WEBP_QUALITY
    );
  });
}

export async function recompressImage(imageUrl: string): Promise<Blob> {
  const image = await createImage(imageUrl);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  const aspectRatio = image.width / image.height;
  let outputWidth = image.width;
  let outputHeight = image.height;

  if (outputWidth > TARGET_WIDTH) {
    outputWidth = TARGET_WIDTH;
    outputHeight = TARGET_WIDTH / aspectRatio;
  }
  if (outputHeight > TARGET_HEIGHT) {
    outputHeight = TARGET_HEIGHT;
    outputWidth = TARGET_HEIGHT * aspectRatio;
  }

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  ctx.drawImage(image, 0, 0, outputWidth, outputHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas is empty"));
        }
      },
      "image/webp",
      WEBP_QUALITY
    );
  });
}
