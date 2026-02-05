"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  X,
  RefreshCw,
  Eye,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type { GalleryImage, GalleryCategory } from "@/db/types";
import { GALLERY_CATEGORY_CONFIG } from "@/db/types";
import { IMAGE_CONFIG } from "@/lib/constants";

const { WEBP_QUALITY } = IMAGE_CONFIG;

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });
}

async function compressImage(
  imageUrl: string,
  targetWidth: number,
  targetHeight: number,
  preserveAspect: boolean
): Promise<Blob> {
  const image = await createImage(imageUrl);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  let outputWidth: number;
  let outputHeight: number;

  if (preserveAspect) {
    const aspectRatio = image.width / image.height;
    if (image.width > targetWidth) {
      outputWidth = targetWidth;
      outputHeight = targetWidth / aspectRatio;
    } else if (image.height > targetHeight) {
      outputHeight = targetHeight;
      outputWidth = targetHeight * aspectRatio;
    } else {
      outputWidth = image.width;
      outputHeight = image.height;
    }
  } else {
    outputWidth = Math.min(image.width, targetWidth);
    outputHeight = Math.min(image.height, targetHeight);
  }

  canvas.width = outputWidth;
  canvas.height = outputHeight;
  ctx.drawImage(image, 0, 0, outputWidth, outputHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas is empty"));
      },
      "image/webp",
      WEBP_QUALITY
    );
  });
}

async function compressImageFile(
  file: File,
  targetWidth: number,
  targetHeight: number,
  preserveAspect: boolean
): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    return await compressImage(url, targetWidth, targetHeight, preserveAspect);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const emptyImage: Partial<GalleryImage> = {
  category: "harmonie_gallery",
  image_url: "",
  alt_text: "",
  link_url: "",
  link_name: "",
  sort_order: 0,
};

export function GalleryAdminClient() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<GalleryCategory | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<Partial<GalleryImage> | null>(null);
  const [deletingImage, setDeletingImage] = useState<GalleryImage | null>(null);
  const [previewImage, setPreviewImage] = useState<GalleryImage | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  const [recompressing, setRecompressing] = useState(false);
  const [recompressProgress, setRecompressProgress] = useState({ current: 0, total: 0 });

  const fetchImages = async () => {
    try {
      const url =
        selectedCategory === "all"
          ? "/api/admin/gallery"
          : `/api/admin/gallery?category=${selectedCategory}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = (await response.json()) as GalleryImage[];
        setImages(data);
      }
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [selectedCategory]);

  const handleNew = () => {
    const category = selectedCategory === "all" ? "harmonie_gallery" : selectedCategory;
    setEditingImage({ ...emptyImage, category });
    setDialogOpen(true);
  };

  const handleEdit = (image: GalleryImage) => {
    setEditingImage(image);
    setDialogOpen(true);
  };

  const handleDelete = (image: GalleryImage) => {
    setDeletingImage(image);
    setDeleteDialogOpen(true);
  };

  const handlePreview = (image: GalleryImage) => {
    setPreviewImage(image);
    setPreviewDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingImage) return;

    try {
      const response = await fetch(`/api/admin/gallery?id=${deletingImage.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchImages();
      }
    } catch (error) {
      console.error("Error deleting image:", error);
    } finally {
      setDeleteDialogOpen(false);
      setDeletingImage(null);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingImage) return;

    setUploading(true);

    try {
      const config = GALLERY_CATEGORY_CONFIG[editingImage.category as GalleryCategory];
      const preserveAspect = config.aspectRatio === null;
      const compressedBlob = await compressImageFile(
        file,
        config.targetWidth,
        config.targetHeight,
        preserveAspect
      );

      const formData = new FormData();
      formData.append("file", compressedBlob, "image.webp");
      formData.append("folder", `gallery/${editingImage.category}`);

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as { success?: boolean; url?: string; error?: string };
      if (data.success && data.url) {
        setEditingImage({ ...editingImage, image_url: data.url });
      } else {
        alert(data.error || "Erreur lors de l'upload");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Erreur lors de l'upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleMultiFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const category = selectedCategory === "all" ? "harmonie_gallery" : selectedCategory;
    const config = GALLERY_CATEGORY_CONFIG[category];
    const preserveAspect = config.aspectRatio === null;

    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedBlob = await compressImageFile(
          file,
          config.targetWidth,
          config.targetHeight,
          preserveAspect
        );

        const formData = new FormData();
        formData.append("file", compressedBlob, "image.webp");
        formData.append("folder", `gallery/${category}`);

        const uploadResponse = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = (await uploadResponse.json()) as { success?: boolean; url?: string };
        if (uploadData.success && uploadData.url) {
          await fetch("/api/admin/gallery", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              category,
              image_url: uploadData.url,
              alt_text: file.name.replace(/\.[^/.]+$/, ""),
            }),
          });
        }
      }
      fetchImages();
    } catch (error) {
      console.error("Upload error:", error);
      alert("Erreur lors de l'upload");
    } finally {
      setUploading(false);
      if (multiFileInputRef.current) {
        multiFileInputRef.current.value = "";
      }
    }
  };

  const handleRecompressAll = async () => {
    const categoryImages =
      selectedCategory === "all"
        ? images.filter((img) => img.image_url.includes("/images/r2/"))
        : images.filter(
            (img) => img.category === selectedCategory && img.image_url.includes("/images/r2/")
          );

    if (categoryImages.length === 0) {
      alert("Aucune image R2 a recompresser");
      return;
    }

    if (!confirm(`Recompresser ${categoryImages.length} image(s) en WebP 70% ?`)) {
      return;
    }

    setRecompressing(true);
    setRecompressProgress({ current: 0, total: categoryImages.length });

    let successCount = 0;
    for (let i = 0; i < categoryImages.length; i++) {
      const image = categoryImages[i];
      setRecompressProgress({ current: i + 1, total: categoryImages.length });

      try {
        const config = GALLERY_CATEGORY_CONFIG[image.category];
        const preserveAspect = config.aspectRatio === null;
        const blob = await compressImage(
          image.image_url,
          config.targetWidth,
          config.targetHeight,
          preserveAspect
        );

        const formData = new FormData();
        formData.append("file", blob, "image.webp");
        formData.append("folder", `gallery/${image.category}`);

        const uploadResponse = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = (await uploadResponse.json()) as { success?: boolean; url?: string };
        if (uploadData.success && uploadData.url) {
          await fetch(`/api/admin/gallery?id=${image.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...image, image_url: uploadData.url }),
          });
          successCount++;
        }
      } catch (error) {
        console.error(`Error recompressing image ${image.id}:`, error);
      }
    }

    setRecompressing(false);
    setRecompressProgress({ current: 0, total: 0 });
    alert(`${successCount}/${categoryImages.length} image(s) recompressee(s)`);
    fetchImages();
  };

  const handleMoveUp = async (image: GalleryImage, index: number) => {
    const categoryImages = images.filter((img) => img.category === image.category);
    if (index === 0) return;

    const ids = categoryImages.map((img) => img.id);
    [ids[index], ids[index - 1]] = [ids[index - 1], ids[index]];

    await fetch("/api/admin/gallery?action=reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    fetchImages();
  };

  const handleMoveDown = async (image: GalleryImage, index: number) => {
    const categoryImages = images.filter((img) => img.category === image.category);
    if (index === categoryImages.length - 1) return;

    const ids = categoryImages.map((img) => img.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];

    await fetch("/api/admin/gallery?action=reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    fetchImages();
  };

  const handleSave = async () => {
    if (!editingImage || !editingImage.image_url) {
      alert("Veuillez ajouter une image");
      return;
    }

    setSaving(true);
    try {
      const isNew = !editingImage.id;
      const url = isNew ? "/api/admin/gallery" : `/api/admin/gallery?id=${editingImage.id}`;
      const method = isNew ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingImage),
      });

      if (response.ok) {
        fetchImages();
        setDialogOpen(false);
        setEditingImage(null);
      }
    } catch (error) {
      console.error("Error saving image:", error);
    } finally {
      setSaving(false);
    }
  };

  const groupedImages = images.reduce(
    (acc, img) => {
      if (!acc[img.category]) acc[img.category] = [];
      acc[img.category].push(img);
      return acc;
    },
    {} as Record<string, GalleryImage[]>
  );

  if (loading) {
    return <div className="text-center py-8 text-gray-600 dark:text-gray-400">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Galerie</h1>
        <div className="flex flex-wrap gap-2">
          <Select
            value={selectedCategory}
            onValueChange={(v: string) => setSelectedCategory(v as GalleryCategory | "all")}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Categorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les categories</SelectItem>
              {Object.entries(GALLERY_CATEGORY_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRecompressAll} disabled={recompressing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${recompressing ? "animate-spin" : ""}`} />
            {recompressing
              ? `${recompressProgress.current}/${recompressProgress.total}...`
              : "Recompresser"}
          </Button>
          <input
            ref={multiFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleMultiFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => multiFileInputRef.current?.click()}
            disabled={uploading || selectedCategory === "all"}
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? "Upload..." : "Upload multiple"}
          </Button>
          <Button onClick={handleNew}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle image
          </Button>
        </div>
      </div>

      {selectedCategory === "all" ? (
        Object.entries(groupedImages).map(([category, categoryImages]) => (
          <Card key={category} className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">
                {GALLERY_CATEGORY_CONFIG[category as GalleryCategory]?.label || category}
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({categoryImages.length} images)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {categoryImages.map((image, index) => (
                  <ImageCard
                    key={image.id}
                    image={image}
                    index={index}
                    totalInCategory={categoryImages.length}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onPreview={handlePreview}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {images.map((image, index) => (
                <ImageCard
                  key={image.id}
                  image={image}
                  index={index}
                  totalInCategory={images.length}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onPreview={handlePreview}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                />
              ))}
            </div>
            {images.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Aucune image dans cette categorie
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingImage?.id ? "Modifier l'image" : "Nouvelle image"}</DialogTitle>
          </DialogHeader>

          {editingImage && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Categorie</Label>
                <Select
                  value={editingImage.category}
                  onValueChange={(v: string) =>
                    setEditingImage({ ...editingImage, category: v as GalleryCategory })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(GALLERY_CATEGORY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Image</Label>
                <div className="space-y-2">
                  {editingImage.image_url && (
                    <div className="relative inline-block">
                      <img
                        src={editingImage.image_url}
                        alt="Apercu"
                        className="w-full max-w-[200px] h-auto object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => setEditingImage({ ...editingImage, image_url: "" })}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? "Traitement..." : "Choisir une image"}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {editingImage.category &&
                      GALLERY_CATEGORY_CONFIG[editingImage.category as GalleryCategory] && (
                        <>
                          Taille:{" "}
                          {
                            GALLERY_CATEGORY_CONFIG[editingImage.category as GalleryCategory]
                              .targetWidth
                          }
                          x
                          {
                            GALLERY_CATEGORY_CONFIG[editingImage.category as GalleryCategory]
                              .targetHeight
                          }
                          px, WebP 70%
                        </>
                      )}
                  </p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="alt_text">Texte alternatif</Label>
                <Input
                  id="alt_text"
                  value={editingImage.alt_text || ""}
                  onChange={(e) => setEditingImage({ ...editingImage, alt_text: e.target.value })}
                  placeholder="Description de l'image"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="link_name">Nom du lien (optionnel)</Label>
                <Input
                  id="link_name"
                  value={editingImage.link_name || ""}
                  onChange={(e) => setEditingImage({ ...editingImage, link_name: e.target.value })}
                  placeholder="Ex: Grain de Vent"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="link_url">URL du lien (optionnel)</Label>
                <Input
                  id="link_url"
                  value={editingImage.link_url || ""}
                  onChange={(e) => setEditingImage({ ...editingImage, link_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving || !editingImage?.image_url}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'image ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irreversible. L'image sera definitivement supprimee.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewImage?.alt_text || "Apercu"}</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="flex justify-center">
              <img
                src={previewImage.image_url}
                alt={previewImage.alt_text || ""}
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ImageCardProps {
  image: GalleryImage;
  index: number;
  totalInCategory: number;
  // eslint-disable-next-line no-unused-vars
  onEdit: (image: GalleryImage) => void;
  // eslint-disable-next-line no-unused-vars
  onDelete: (image: GalleryImage) => void;
  // eslint-disable-next-line no-unused-vars
  onPreview: (image: GalleryImage) => void;
  // eslint-disable-next-line no-unused-vars
  onMoveUp: (image: GalleryImage, index: number) => void;
  // eslint-disable-next-line no-unused-vars
  onMoveDown: (image: GalleryImage, index: number) => void;
}

function ImageCard({
  image,
  index,
  totalInCategory,
  onEdit,
  onDelete,
  onPreview,
  onMoveUp,
  onMoveDown,
}: ImageCardProps) {
  return (
    <div className="group relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden aspect-square">
      <img
        src={image.image_url}
        alt={image.alt_text || ""}
        className="w-full h-full object-cover cursor-pointer"
        onClick={() => onPreview(image)}
      />
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-white hover:bg-white/20"
          onClick={() => onPreview(image)}
        >
          <Eye className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-white hover:bg-white/20"
          onClick={() => onEdit(image)}
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-white hover:bg-white/20"
          onClick={() => onDelete(image)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      <div className="absolute top-1 right-1 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="secondary"
          className="h-6 w-6"
          onClick={() => onMoveUp(image, index)}
          disabled={index === 0}
        >
          <ChevronUp className="w-3 h-3" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="h-6 w-6"
          onClick={() => onMoveDown(image, index)}
          disabled={index === totalInCategory - 1}
        >
          <ChevronDown className="w-3 h-3" />
        </Button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
        {image.alt_text || `#${image.sort_order + 1}`}
      </div>
    </div>
  );
}
