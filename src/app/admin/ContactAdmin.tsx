"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card, CardContent } from "@/app/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
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
import { Eye, Trash2, Search, ArrowUp, ArrowDown, ArrowUpDown, Mail } from "lucide-react";
import type { ContactSubmission } from "@/db/types";
import { formatDateShort } from "@/lib/dates";
import { Pagination } from "@/app/components/ui/pagination";
import { EmptyState } from "@/app/components/ui/empty-state";

type SortField = "name" | "email" | "date";

export function ContactAdminClient() {
  const [items, setItems] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewing, setViewing] = useState<ContactSubmission | null>(null);
  const [deleting, setDeleting] = useState<ContactSubmission | null>(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/admin/contact");
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
          `${item.prenom} ${item.nom}`.toLowerCase().includes(q) ||
          item.email.toLowerCase().includes(q) ||
          item.message.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      let va: string;
      let vb: string;
      if (sortField === "name") {
        va = `${a.prenom} ${a.nom}`.toLowerCase();
        vb = `${b.prenom} ${b.nom}`.toLowerCase();
      } else if (sortField === "email") {
        va = a.email.toLowerCase();
        vb = b.email.toLowerCase();
      } else {
        va = a.created_at ?? "";
        vb = b.created_at ?? "";
      }
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

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      const response = await fetch(`/api/admin/contact?id=${deleting.id}`, { method: "DELETE" });
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
        <h1 className="text-3xl font-bold text-foreground">Messages de contact</h1>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email ou message…"
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
              icon={<Mail className="w-12 h-12" />}
              title={items.length === 0 ? "Aucun message" : "Aucun message trouvé"}
              description={
                items.length === 0
                  ? "Aucun message de contact pour le moment."
                  : "Essayez de modifier vos critères de recherche"
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
                  <TableHead
                    className="cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSort("email")}
                  >
                    <div className="flex items-center gap-1">
                      Email <SortIcon field="email" />
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
                      {item.prenom} {item.nom}
                    </TableCell>
                    <TableCell>
                      <a href={`mailto:${item.email}`} className="text-primary hover:underline">
                        {item.email}
                      </a>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{item.message}</TableCell>
                    <TableCell>{formatDateShort(item.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setViewing(item);
                          setViewDialogOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
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

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Message de {viewing?.prenom} {viewing?.nom}
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <a href={`mailto:${viewing.email}`} className="text-primary hover:underline">
                  {viewing.email}
                </a>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date</p>
                <p className="text-foreground">
                  {new Date(viewing.created_at).toLocaleString("fr-FR")}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Message</p>
                <p className="whitespace-pre-wrap bg-muted p-4 rounded-md text-foreground">
                  {viewing.message}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le message ?</AlertDialogTitle>
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
