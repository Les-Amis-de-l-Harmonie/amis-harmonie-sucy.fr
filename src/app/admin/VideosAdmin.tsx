"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent } from "@/app/components/ui/card";
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
  GripVertical,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import type { Video } from "@/db/types";

type SortField = "title" | "type";

function parseYouTubeUrl(url: string): { id: string; isShort: boolean } | null {
  const trimmed = url.trim();

  const shortsMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/
  );
  if (shortsMatch) return { id: shortsMatch[1], isShort: true };

  const shortUrlWithFeature = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]+).*?(?:\?|&)feature=shorts/);
  if (shortUrlWithFeature) return { id: shortUrlWithFeature[1], isShort: true };

  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watchMatch) return { id: watchMatch[1], isShort: false };

  const shortUrlMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortUrlMatch) return { id: shortUrlMatch[1], isShort: false };

  const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  if (embedMatch) return { id: embedMatch[1], isShort: false };

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return { id: trimmed, isShort: false };

  return null;
}

export function VideosAdminClient() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Video> | null>(null);
  const [deleting, setDeleting] = useState<Video | null>(null);
  const [saving, setSaving] = useState(false);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [youtubeUrlInput, setYoutubeUrlInput] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "video" | "short">("all");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/videos");
      if (response.ok) setVideos(await response.json());
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isFiltered = search.trim() !== "" || typeFilter !== "all" || sortField !== null;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const displayed = useMemo(() => {
    let result = [...videos];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((v) => v.title.toLowerCase().includes(q));
    }

    if (typeFilter !== "all") {
      result = result.filter((v) => (typeFilter === "short" ? v.is_short === 1 : v.is_short !== 1));
    }

    if (sortField) {
      result.sort((a, b) => {
        const va = sortField === "title" ? a.title.toLowerCase() : String(a.is_short);
        const vb = sortField === "title" ? b.title.toLowerCase() : String(b.is_short);
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }

    return result;
  }, [videos, search, typeFilter, sortField, sortDir]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const isNew = !editing.id;
      const response = await fetch(
        isNew ? "/api/admin/videos" : `/api/admin/videos?id=${editing.id}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editing),
        }
      );
      if (response.ok) {
        fetchData();
        setDialogOpen(false);
        setEditing(null);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      const response = await fetch(`/api/admin/videos?id=${deleting.id}`, { method: "DELETE" });
      if (response.ok) fetchData();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setDeleteDialogOpen(false);
      setDeleting(null);
    }
  };

  const handleDragStart = (id: number) => setDraggedId(id);
  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDrop = async (targetId: number) => {
    if (!draggedId || draggedId === targetId) return;
    const fromIndex = videos.findIndex((v) => v.id === draggedId);
    const toIndex = videos.findIndex((v) => v.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const reordered = [...videos];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setVideos(reordered);
    await fetch("/api/admin/videos?action=reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((v) => v.id) }),
    });
    setDraggedId(null);
    setDragOverId(null);
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Vidéos</h1>
        <Button
          onClick={() => {
            setEditing({ title: "", youtube_id: "", is_short: 0 });
            setYoutubeUrlInput("");
            setDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle vidéo
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par titre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "video", "short"] as const).map((f) => (
            <Button
              key={f}
              variant={typeFilter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(f)}
            >
              {f === "all" ? "Tout" : f === "video" ? "Vidéo" : "Short"}
            </Button>
          ))}
        </div>
        {isFiltered && (
          <span className="text-sm text-muted-foreground">
            {displayed.length} résultat{displayed.length !== 1 ? "s" : ""}
          </span>
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setTypeFilter("all");
              setSortField(null);
            }}
          >
            Réinitialiser
          </Button>
        )}
      </div>

      {isFiltered && (
        <p className="text-xs text-muted-foreground mb-3">
          Le glisser-déposer est désactivé pendant la recherche / le filtre.
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground"
                  onClick={() => handleSort("title")}
                >
                  <div className="flex items-center gap-1">
                    Titre <SortIcon field="title" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground"
                  onClick={() => handleSort("type")}
                >
                  <div className="flex items-center gap-1">
                    Type <SortIcon field="type" />
                  </div>
                </TableHead>
                <TableHead>Aperçu</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayed.map((video) => (
                <TableRow
                  key={video.id}
                  draggable={!isFiltered}
                  onDragStart={() => !isFiltered && handleDragStart(video.id)}
                  onDragEnd={handleDragEnd}
                  onDragEnter={() => !isFiltered && setDragOverId(video.id)}
                  onDragLeave={() => setDragOverId(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!isFiltered) handleDrop(video.id);
                  }}
                  className={`${draggedId === video.id ? "opacity-50" : "opacity-100"} ${dragOverId === video.id && draggedId !== video.id ? "border-primary bg-muted/30" : ""}`}
                >
                  <TableCell
                    className={`${isFiltered ? "text-muted-foreground/30" : "cursor-grab text-muted-foreground"}`}
                  >
                    <GripVertical className="h-4 w-4" />
                  </TableCell>
                  <TableCell className="font-medium">{video.title}</TableCell>
                  <TableCell className="text-sm">
                    {video.is_short === 1 ? (
                      <span className="text-orange-600 font-medium">Short</span>
                    ) : (
                      <span className="text-blue-600">Vidéo</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <img
                      src={`https://img.youtube.com/vi/${video.youtube_id}/default.jpg`}
                      alt=""
                      className="w-20 h-auto rounded"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(video);
                        setYoutubeUrlInput(video.youtube_id);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setDeleting(video);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {displayed.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {isFiltered ? "Aucun résultat" : "Aucune vidéo"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Modifier" : "Nouvelle"} vidéo</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Titre *</Label>
                <Input
                  value={editing.title || ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>URL ou ID YouTube *</Label>
                <Input
                  value={youtubeUrlInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setYoutubeUrlInput(value);
                    const parsed = parseYouTubeUrl(value);
                    if (parsed) {
                      setEditing({
                        ...editing,
                        youtube_id: parsed.id,
                        is_short: parsed.isShort ? 1 : 0,
                      });
                    } else {
                      setEditing({ ...editing, youtube_id: value });
                    }
                  }}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <p className="text-xs text-muted-foreground">
                  Collez l'URL complète ou l'ID. Le type (Short/Normal) est détecté automatiquement.
                </p>
                {youtubeUrlInput && parseYouTubeUrl(youtubeUrlInput) && (
                  <p className="text-xs text-green-600">
                    ID détecté: {parseYouTubeUrl(youtubeUrlInput)?.id}
                    {parseYouTubeUrl(youtubeUrlInput)?.isShort ? " (Short)" : " (Vidéo)"}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_short"
                  checked={editing.is_short === 1}
                  onChange={(e) => setEditing({ ...editing, is_short: e.target.checked ? 1 : 0 })}
                  className="w-4 h-4 rounded border-border"
                />
                <Label htmlFor="is_short" className="cursor-pointer">
                  YouTube Short (format vertical)
                </Label>
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
            <AlertDialogTitle>Supprimer la vidéo ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La vidéo "{deleting?.title}" sera définitivement
              supprimée.
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
    </div>
  );
}
