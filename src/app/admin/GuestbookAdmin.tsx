"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
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
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  BookOpen,
} from "lucide-react";
import type { GuestbookEntry } from "@/db/types";
import { Pagination } from "@/app/components/ui/pagination";
import { EmptyState } from "@/app/components/ui/empty-state";
type SortField = "name" | "date";

export function GuestbookAdminClient() {
  const [items, setItems] = useState<GuestbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<GuestbookEntry> | null>(null);
  const [deleting, setDeleting] = useState<GuestbookEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/admin/guestbook");
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "date" ? "desc" : "asc");
    }
  };

  const displayed = useMemo(() => {
    let result = [...items];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          `${item.first_name} ${item.last_name}`.toLowerCase().includes(q) ||
          item.message.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      const va =
        sortField === "name" ? `${a.first_name} ${a.last_name}`.toLowerCase() : (a.date ?? "");
      const vb =
        sortField === "name" ? `${b.first_name} ${b.last_name}`.toLowerCase() : (b.date ?? "");
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return result;
  }, [items, search, sortField, sortDir]);

  const paginatedItems = useMemo(
    () => displayed.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [displayed, currentPage, pageSize]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

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
        isNew ? "/api/admin/guestbook" : `/api/admin/guestbook?id=${editing.id}`,
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
      const response = await fetch(`/api/admin/guestbook?id=${deleting.id}`, { method: "DELETE" });
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
        <h1 className="text-3xl font-bold text-foreground">Livre d'Or</h1>
        <Button
          onClick={() => {
            setEditing({
              first_name: "",
              last_name: "",
              message: "",
              date: new Date().toISOString().split("T")[0],
            });
            setDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle entrée
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou message…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {search && (
          <span className="text-sm text-muted-foreground">
            {displayed.length} résultat{displayed.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {displayed.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<BookOpen className="w-12 h-12" />}
              title={
                items.length === 0 ? "Aucun message dans le livre d'or" : "Aucun message trouvé"
              }
              description={
                items.length === 0
                  ? "Créez-en un pour commencer !"
                  : "Essayez de modifier vos critères de recherche"
              }
              action={
                items.length === 0 ? (
                  <Button
                    onClick={() => {
                      setEditing({
                        first_name: "",
                        last_name: "",
                        message: "",
                        date: new Date().toISOString().split("T")[0],
                      });
                      setDialogOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvelle entrée
                  </Button>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Nom <SortIcon field="name" />
                    </div>
                  </TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSort("date")}
                  >
                    <div className="flex items-center gap-1">
                      Date <SortIcon field="date" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.first_name} {item.last_name}
                    </TableCell>
                    <TableCell className="max-w-md truncate">{item.message}</TableCell>
                    <TableCell>{item.date}</TableCell>
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
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Pagination
        totalItems={displayed.length}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Modifier" : "Nouvelle"} entrée</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Prénom *</Label>
                  <Input
                    value={editing.first_name || ""}
                    onChange={(e) => setEditing({ ...editing, first_name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Nom *</Label>
                  <Input
                    value={editing.last_name || ""}
                    onChange={(e) => setEditing({ ...editing, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={editing.date || ""}
                  onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Message *</Label>
                <Textarea
                  value={editing.message || ""}
                  onChange={(e) => setEditing({ ...editing, message: e.target.value })}
                  rows={4}
                />
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
            <AlertDialogTitle>Supprimer l'entrée ?</AlertDialogTitle>
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
