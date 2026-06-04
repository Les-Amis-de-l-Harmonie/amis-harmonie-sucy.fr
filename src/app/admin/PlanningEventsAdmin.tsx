"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Plus, Pencil, Trash2, Calendar, Clock, MapPin } from "lucide-react";
import { formatDateShort } from "@/lib/dates";
import { EmptyState } from "@/app/components/ui/empty-state";
import { Pagination } from "@/app/components/ui/pagination";
import type { PlanningEvent, PlanningInput } from "@/db/types";

const emptyPlanningEvent: PlanningInput = {
  name: "",
  date: "",
  time: "",
  location: "",
  address: "",
};

export function PlanningEventsAdminClient() {
  const [events, setEvents] = useState<PlanningEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PlanningInput | PlanningEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<PlanningEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/admin/planning-events");
      if (response.ok) {
        const data = (await response.json()) as PlanningEvent[];
        setEvents(data);
      } else {
        setError("Erreur lors du chargement des prestations");
      }
    } catch (err) {
      console.error("Error fetching planning events:", err);
      setError("Erreur réseau lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleNew = () => {
    setEditingEvent({ ...emptyPlanningEvent });
    setDialogOpen(true);
  };

  const handleEdit = (event: PlanningEvent) => {
    setEditingEvent({ ...event });
    setDialogOpen(true);
  };

  const handleDelete = (event: PlanningEvent) => {
    setDeletingEvent(event);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingEvent) return;

    try {
      const response = await fetch(`/api/admin/planning-events?id=${deletingEvent.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchEvents();
      }
    } catch (err) {
      console.error("Error deleting planning event:", err);
    } finally {
      setDeleteDialogOpen(false);
      setDeletingEvent(null);
    }
  };

  const handleSave = async () => {
    if (!editingEvent) return;

    const { name, date, time, location, address } = editingEvent;
    if (!name.trim() || !date) return;

    setSaving(true);
    try {
      const isNew = !("id" in editingEvent);
      const url = isNew
        ? "/api/admin/planning-events"
        : `/api/admin/planning-events?id=${(editingEvent as PlanningEvent).id}`;
      const method = isNew ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, date, time, location, address }),
      });

      if (response.ok) {
        fetchEvents();
        setDialogOpen(false);
        setEditingEvent(null);
      }
    } catch (err) {
      console.error("Error saving planning event:", err);
    } finally {
      setSaving(false);
    }
  };

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => a.date.localeCompare(b.date));
  }, [events]);

  const paginatedEvents = useMemo(
    () => sortedEvents.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sortedEvents, currentPage, pageSize]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 dark:text-red-400">{error}</p>
        <Button variant="outline" className="mt-4" onClick={fetchEvents}>
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestion des prestations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {events.length} prestation{events.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle prestation
        </Button>
      </div>

      {sortedEvents.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<Calendar className="w-12 h-12" />}
              title="Aucune prestation"
              description="Créez une prestation pour que les musiciens puissent indiquer leur disponibilité."
              action={
                <Button onClick={handleNew}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle prestation
                </Button>
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
                  <TableHead>Date</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Heure</TableHead>
                  <TableHead>Lieu</TableHead>
                  <TableHead>Adresse</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {formatDateShort(event.date)}
                    </TableCell>
                    <TableCell>{event.name}</TableCell>
                    <TableCell>
                      {event.time ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          {event.time}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {event.location ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                          {event.location}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {event.address || "—"}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(event)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(event)}>
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

      {sortedEvents.length > 0 && (
        <Pagination
          totalItems={sortedEvents.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingEvent && "id" in editingEvent
                ? "Modifier la prestation"
                : "Nouvelle prestation"}
            </DialogTitle>
          </DialogHeader>

          {editingEvent && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">
                  Nom <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={editingEvent.name || ""}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, name: e.target.value })
                  }
                  placeholder="Ex: Concert de Noël"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="date">
                  Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={editingEvent.date || ""}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, date: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="time">Heure</Label>
                <Input
                  id="time"
                  value={editingEvent.time || ""}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, time: e.target.value })
                  }
                  placeholder="Ex: 20H30"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="location">Lieu</Label>
                <Input
                  id="location"
                  value={editingEvent.location || ""}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, location: e.target.value })
                  }
                  placeholder="Ex: Salle des fêtes"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={editingEvent.address || ""}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, address: e.target.value })
                  }
                  placeholder="Ex: 1 rue de la Mairie, 94000 Sucy-en-Brie"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !editingEvent?.name?.trim() || !editingEvent?.date}
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la prestation ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingEvent && (
                <>
                  Vous êtes sur le point de supprimer la prestation{" "}
                  <strong>{deletingEvent.name}</strong> du{" "}
                  <strong>{formatDateShort(deletingEvent.date)}</strong>. Cette action est
                  irréversible et supprimera également toutes les disponibilités associées.
                </>
              )}
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
