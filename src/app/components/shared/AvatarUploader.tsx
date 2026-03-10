"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, Loader2 } from "lucide-react";
import { CircularCropper } from "@/app/components/CircularCropper";

export interface AvatarUploaderProps {
  avatar?: string | null;
  onUpload: (url: string) => void;
  uploadEndpoint: string;
  size?: number;
  showInstructions?: boolean;
  instructionText?: string;
  allowedTypes?: string[];
  maxSizeMB?: number;
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
  className?: string;
}

export function AvatarUploader({
  avatar,
  onUpload,
  uploadEndpoint,
  size = 80,
  showInstructions = true,
  instructionText = "Cliquez pour changer",
  allowedTypes = ["image/jpeg", "image/png", "image/webp"],
  maxSizeMB = 5,
  onError,
  onSuccess,
  className = "",
}: AvatarUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAvatarChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        const errorMsg = `Format non supporté. Formats acceptés : ${allowedTypes
          .map((t) => t.split("/")[1].toUpperCase())
          .join(", ")}`;
        onError?.(errorMsg);
        return;
      }

      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        const errorMsg = `Fichier trop volumineux. Taille maximale : ${maxSizeMB} Mo`;
        onError?.(errorMsg);
        return;
      }

      setSelectedImage(file);
      setCropperOpen(true);
    },
    [allowedTypes, maxSizeMB, onError]
  );

  const handleCroppedImage = useCallback(
    async (croppedBlob: Blob) => {
      setCropperOpen(false);
      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", croppedBlob, "avatar.jpg");

        const response = await fetch(uploadEndpoint, {
          method: "POST",
          body: formData,
        });

        const data = (await response.json()) as { url?: string; error?: string };

        if (response.ok && data.url) {
          onUpload(data.url);
          onSuccess?.("Photo de profil mise à jour");
        } else {
          const errorMsg = data.error || "Erreur lors du téléchargement";
          onError?.(errorMsg);
        }
      } catch (err) {
        console.error("Error uploading avatar:", err);
        onError?.("Erreur lors du téléchargement");
      } finally {
        setUploading(false);
      }
    },
    [uploadEndpoint, onUpload, onError, onSuccess]
  );

  return (
    <div className={`flex items-center gap-6 ${className}`}>
      <div className="relative">
        <button
          type="button"
          onClick={handleAvatarClick}
          disabled={uploading}
          className="relative rounded-full overflow-hidden bg-muted hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
          style={{ width: size, height: size }}
        >
          {avatar ? (
            <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera
                className="text-muted-foreground"
                style={{ width: size * 0.3, height: size * 0.3 }}
              />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            </div>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedTypes.join(",")}
          onChange={handleAvatarChange}
          className="hidden"
        />
      </div>
      {showInstructions && (
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Photo de profil</p>
          <p>{instructionText}</p>
        </div>
      )}

      <CircularCropper
        imageFile={selectedImage}
        isOpen={cropperOpen}
        onClose={() => setCropperOpen(false)}
        onConfirm={handleCroppedImage}
      />
    </div>
  );
}
