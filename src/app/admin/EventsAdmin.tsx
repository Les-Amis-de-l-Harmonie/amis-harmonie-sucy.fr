"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent } from "@/app/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { isEventPast, formatDateShort } from "@/lib/dates";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
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
  Plus,
  Pencil,
  Trash2,
  Upload,
  X,
  Crop,
  Check,
  RefreshCw,
  Search,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Copy,
} from "lucide-react";
import type { Event } from "@/db/types";
import { getCroppedImg, recompressImage } from "@/lib/image-utils";

const emptyEvent = {
  title: "",
  image: "",
  location: "",
  description: "",
  date: "",
  time: "",
  price: "",
  details_link: "",
  reservation_link: "",
};

export function EventsAdminClient() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<Event> | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [recompressing, setRecompressing] = useState(false);
  const [recompressProgress, setRecompressProgress] = useState({ current: 0, total: 0 });

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "upcoming" | "past">("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [sortField, setSortField] = useState<"date" | "title" | "location" | "price">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/admin/events");
      if (response.ok) {
        const data = (await response.json()) as Event[];
        setEvents(data);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleNew = () => {
    setEditingEvent(emptyEvent);
    setDialogOpen(true);
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setDialogOpen(true);
  };

  const handleDuplicate = (event: Event) => {
    const { id: _id, ...eventWithoutId } = event;
    setEditingEvent({
      ...eventWithoutId,
      title: `${event.title} (copie)`,
    });
    setDialogOpen(true);
  };

  const handleDelete = (event: Event) => {
    setDeletingEvent(event);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingEvent) return;

    try {
      const response = await fetch(`/api/admin/events?id=${deletingEvent.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchEvents();
      }
    } catch (error) {
      console.error("Error deleting event:", error);
    } finally {
      setDeleteDialogOpen(false);
      setDeletingEvent(null);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropperOpen(true);
    });
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCropConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels || !editingEvent) return;

    setUploading(true);
    setCropperOpen(false);

    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const formData = new FormData();
      formData.append("file", croppedBlob, "event.webp");

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as { success?: boolean; url?: string; error?: string };
      if (data.success && data.url) {
        setEditingEvent({ ...editingEvent, image: data.url });
      } else {
        alert(data.error || "Erreur lors de l'upload");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Erreur lors de l'upload");
    } finally {
      setUploading(false);
      setImageSrc(null);
    }
  };

  const handleCropCancel = () => {
    setCropperOpen(false);
    setImageSrc(null);
  };

  const handleRecompressAll = async () => {
    const eventsWithR2Images = events.filter((e) => e.image && e.image.includes("/images/r2/"));

    if (eventsWithR2Images.length === 0) {
      alert("Aucune image R2 à recompresser");
      return;
    }

    if (!confirm(`Recompresser ${eventsWithR2Images.length} image(s) en WebP 600x600 ?`)) {
      return;
    }

    setRecompressing(true);
    setRecompressProgress({ current: 0, total: eventsWithR2Images.length });

    let successCount = 0;
    for (let i = 0; i < eventsWithR2Images.length; i++) {
      const event = eventsWithR2Images[i];
      setRecompressProgress({ current: i + 1, total: eventsWithR2Images.length });

      try {
        const blob = await recompressImage(event.image!);
        const formData = new FormData();
        formData.append("file", blob, "event.webp");

        const uploadResponse = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = (await uploadResponse.json()) as {
          success?: boolean;
          url?: string;
          error?: string;
        };
        if (uploadData.success && uploadData.url) {
          await fetch(`/api/admin/events?id=${event.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...event, image: uploadData.url }),
          });
          successCount++;
        }
      } catch (error) {
        console.error(`Error recompressing image for event ${event.id}:`, error);
      }
    }

    setRecompressing(false);
    setRecompressProgress({ current: 0, total: 0 });
    alert(`${successCount}/${eventsWithR2Images.length} image(s) recompressée(s)`);
    fetchEvents();
  };

  const handleSave = async () => {
    if (!editingEvent) return;

    setSaving(true);
    try {
      const isNew = !editingEvent.id;
      const url = isNew ? "/api/admin/events" : `/api/admin/events?id=${editingEvent.id}`;
      const method = isNew ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingEvent),
      });

      if (response.ok) {
        fetchEvents();
        setDialogOpen(false);
        setEditingEvent(null);
      }
    } catch (error) {
      console.error("Error saving event:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSort = (field: "date" | "title" | "location" | "price") => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: "date" | "title" | "location" | "price" }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 ml-1" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 ml-1" />
    );
  };

  const availableYears = useMemo(
    () => [...new Set(events.map((e) => e.date.slice(0, 4)))].sort((a, b) => b.localeCompare(a)),
    [events]
  );

  const filteredEvents = useMemo(() => {
    let result = [...events];

    if (filterStatus === "upcoming") result = result.filter((e) => !isEventPast(e.date));
    if (filterStatus === "past") result = result.filter((e) => isEventPast(e.date));
    if (filterYear !== "all") result = result.filter((e) => e.date.startsWith(filterYear));

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (e) =>
          e.title?.toLowerCase().includes(q) ||
          e.location?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      const aVal = (a[sortField] ?? "").toLowerCase();
      const bVal = (b[sortField] ?? "").toLowerCase();
      const cmp = aVal.localeCompare(bVal, "fr");
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [events, search, filterStatus, filterYear, sortField, sortDir]);

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
        <h1 className="text-3xl font-bold text-foreground">Événements</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleRecompressAll} disabled={recompressing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${recompressing ? "animate-spin" : ""}`} />
            {recompressing
              ? `Recompression ${recompressProgress.current}/${recompressProgress.total}...`
              : "Recompresser images"}
          </Button>
          <Button onClick={handleNew}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvel événement
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Rechercher (titre, lieu, description…)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filterStatus}
          onValueChange={(v) => setFilterStatus(v as "all" | "upcoming" | "past")}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="upcoming">À venir</SelectItem>
            <SelectItem value="past">Passés</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Années</SelectItem>
            {availableYears.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground"
                  onClick={() => handleSort("title")}
                >
                  <span className="inline-flex items-center">
                    Titre <SortIcon field="title" />
                  </span>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground"
                  onClick={() => handleSort("date")}
                >
                  <span className="inline-flex items-center">
                    Date <SortIcon field="date" />
                  </span>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground"
                  onClick={() => handleSort("location")}
                >
                  <span className="inline-flex items-center">
                    Lieu <SortIcon field="location" />
                  </span>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground"
                  onClick={() => handleSort("price")}
                >
                  <span className="inline-flex items-center">
                    Prix <SortIcon field="price" />
                  </span>
                </TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((event) => {
                const isPast = isEventPast(event.date);
                return (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell>{formatDateShort(event.date)}</TableCell>
                    <TableCell>{event.location}</TableCell>
                    <TableCell>{event.price || "-"}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          isPast
                            ? "bg-muted text-muted-foreground"
                            : "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400"
                        }`}
                      >
                        {isPast ? "Passé" : "À venir"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(event)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDuplicate(event)}
                        title="Dupliquer"
                      >
                        <Copy className="w-4 h-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(event)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredEvents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {events.length === 0 ? "Aucun événement" : "Aucun résultat pour ces critères"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEvent?.id ? "Modifier l'événement" : "Nouvel événement"}
            </DialogTitle>
          </DialogHeader>

          {editingEvent && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  value={editingEvent.title || ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={editingEvent.date || ""}
                    onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="time">Heure</Label>
                  <Input
                    id="time"
                    value={editingEvent.time || ""}
                    onChange={(e) => setEditingEvent({ ...editingEvent, time: e.target.value })}
                    placeholder="14H"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="location">Lieu</Label>
                  <Input
                    id="location"
                    value={editingEvent.location || ""}
                    onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">Prix</Label>
                  <Input
                    id="price"
                    value={editingEvent.price || ""}
                    onChange={(e) => setEditingEvent({ ...editingEvent, price: e.target.value })}
                    placeholder="Gratuit"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Image</Label>
                <div className="space-y-2">
                  {editingEvent.image && (
                    <div className="relative inline-block">
                      <img
                        src={editingEvent.image}
                        alt="Aperçu"
                        className="w-32 h-32 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => setEditingEvent({ ...editingEvent, image: "" })}
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
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editingEvent.description || ""}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, description: e.target.value })
                  }
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="details_link">Lien détails</Label>
                  <Input
                    id="details_link"
                    value={editingEvent.details_link || ""}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, details_link: e.target.value })
                    }
                    placeholder="/the-dansant"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reservation_link">Lien réservation</Label>
                  <Input
                    id="reservation_link"
                    value={editingEvent.reservation_link || ""}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, reservation_link: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'événement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'événement "{deletingEvent?.title}" sera
              définitivement supprimé.
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

      <Dialog open={cropperOpen} onOpenChange={(open) => !open && handleCropCancel()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crop className="w-5 h-5" />
              Recadrer l'image
            </DialogTitle>
          </DialogHeader>

          <div className="relative w-full h-[400px] bg-gray-900 rounded-lg overflow-hidden">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={15 / 8}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Zoom:</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1"
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Format 15:8 (panoramique). L'image sera automatiquement redimensionnée et compressée
            (WebP 70%).
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={handleCropCancel}>
              Annuler
            </Button>
            <Button onClick={handleCropConfirm} disabled={uploading}>
              <Check className="w-4 h-4 mr-2" />
              {uploading ? "Traitement..." : "Valider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
