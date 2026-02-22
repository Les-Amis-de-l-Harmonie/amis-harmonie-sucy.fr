"use client";

import { useState, useEffect, useRef } from "react";
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
import { Plus, Pencil, Trash2, Upload, X } from "lucide-react";
import type { Publication } from "@/db/types";
import { formatDateShort } from "@/lib/dates";

export function PublicationsAdminClient() {
  const [items, setItems] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Publication> | null>(null);
  const [deleting, setDeleting] = useState<Publication | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/admin/publications");
      if (response.ok) setItems(await response.json());
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "publications");
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as { success?: boolean; url?: string; error?: string };
      if (data.success && data.url) {
        setEditing({ ...editing, thumbnail: data.url });
      } else {
        alert(data.error || "Erreur lors de l'upload");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Erreur lors de l'upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const isNew = !editing.id;
      const response = await fetch(
        isNew ? "/api/admin/publications" : `/api/admin/publications?id=${editing.id}`,
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
      const response = await fetch(`/api/admin/publications?id=${deleting.id}`, {
        method: "DELETE",
      });
      if (response.ok) fetchData();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setDeleteDialogOpen(false);
      setDeleting(null);
    }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Publications Instagram</h1>
        <Button
          onClick={() => {
            setEditing({ instagram_post_id: "", publication_date: null });
            setDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle publication
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aperçu</TableHead>
                <TableHead>Date de publication</TableHead>
                <TableHead>Lien</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt="" className="w-20 h-20 object-cover rounded" />
                    ) : (
                      <div className="w-20 h-20 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                        Sans image
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.publication_date ? formatDateShort(item.publication_date) : "—"}
                  </TableCell>
                  <TableCell>
                    <a
                      href={`https://www.instagram.com/p/${item.instagram_post_id}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Voir sur Instagram
                    </a>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(item);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setDeleting(item);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Aucune publication
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
            <DialogTitle>{editing?.id ? "Modifier" : "Nouvelle"} publication</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>ID Instagram *</Label>
                <Input
                  value={editing.instagram_post_id || ""}
                  onChange={(e) => setEditing({ ...editing, instagram_post_id: e.target.value })}
                  placeholder="DSSKC1CCBKx"
                />
                <p className="text-xs text-muted-foreground">
                  L'ID se trouve dans l'URL: instagram.com/p/
                  <strong className="text-foreground">ID_ICI</strong>/
                </p>
              </div>
              <div className="grid gap-2">
                <Label>Image de preview</Label>
                <div className="flex gap-2 items-center">
                  {editing.thumbnail ? (
                    <div className="relative inline-block">
                      <img
                        src={editing.thumbnail}
                        alt=""
                        className="w-32 h-32 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => setEditing({ ...editing, thumbnail: null })}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? "Upload..." : "Ajouter une image"}
                    </Button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Date de publication</Label>
                <Input
                  type="date"
                  value={editing.publication_date || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, publication_date: e.target.value || null })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Date de publication sur Instagram (pour le tri)
                </p>
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
            <AlertDialogTitle>Supprimer la publication ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
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
