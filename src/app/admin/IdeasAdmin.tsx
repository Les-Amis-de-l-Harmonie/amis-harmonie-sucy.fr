"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Textarea } from "@/app/components/ui/textarea";
import { Pencil, Search, ArrowUpDown, Globe, Lock, Lightbulb } from "lucide-react";
import type { Idea, IdeaCategory } from "@/db/types";
import { Pagination } from "@/app/components/ui/pagination";
import { formatDateShort } from "@/lib/dates";
import { EmptyState } from "@/app/components/ui/empty-state";

interface IdeaWithUser extends Idea {
  user_email?: string;
  user_first_name?: string;
  user_last_name?: string;
}

const CATEGORY_LABELS: Record<IdeaCategory, string> = {
  association: "Les Amis de l'Harmonie de Sucy-en-Brie",
  harmonie: "Harmonie Municipale de Sucy-en-Brie",
  website: "Site internet",
};

const VISIBILITY_LABELS: Record<number, string> = {
  0: "Privée",
  1: "Publique",
};

const VISIBILITY_COLORS: Record<number, string> = {
  0: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  1: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

export function IdeasAdminClient() {
  const [items, setItems] = useState<IdeaWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewing, setViewing] = useState<IdeaWithUser | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<IdeaCategory | "all">("all");
  const [commentFilter, setCommentFilter] = useState<"all" | "with" | "without">("all");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "public" | "private">("all");
  const [sortBy, setSortBy] = useState<"date" | "category">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/admin/ideas");
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

  const saveAdminNotes = async () => {
    if (!viewing) return;
    setSavingNotes(true);
    try {
      const response = await fetch(`/api/admin/ideas?id=${viewing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_notes: adminNotes }),
      });
      if (response.ok) {
        await fetchData();
        setViewDialogOpen(false);
        setViewing(null);
        setAdminNotes("");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setSavingNotes(false);
    }
  };

  const openViewDialog = (item: IdeaWithUser) => {
    setViewing(item);
    setAdminNotes(item.admin_notes || "");
    setViewDialogOpen(true);
  };

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(term) ||
          item.user_first_name?.toLowerCase().includes(term) ||
          item.user_last_name?.toLowerCase().includes(term) ||
          item.user_email?.toLowerCase().includes(term)
      );
    }

    if (categoryFilter !== "all") {
      result = result.filter((item) => item.category === categoryFilter);
    }

    if (commentFilter !== "all") {
      result = result.filter((item) =>
        commentFilter === "with" ? item.admin_notes : !item.admin_notes
      );
    }

    if (visibilityFilter !== "all") {
      result = result.filter((item) =>
        visibilityFilter === "public" ? item.is_public === 1 : item.is_public === 0
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "date":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "category":
          comparison = a.category.localeCompare(b.category);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [items, searchTerm, categoryFilter, commentFilter, visibilityFilter, sortBy, sortOrder]);

  const paginatedItems = useMemo(
    () => filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredItems, currentPage, pageSize]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, commentFilter, visibilityFilter]);

  if (loading) return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Boîte à idées</h1>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm font-medium text-muted-foreground mb-1">Rechercher</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nom, email, titre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Catégorie</p>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as IdeaCategory | "all")}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm"
              >
                <option value="all">Toutes</option>
                <option value="association">Association</option>
                <option value="harmonie">Harmonie</option>
                <option value="website">Site internet</option>
              </select>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Commentaire</p>
              <select
                value={commentFilter}
                onChange={(e) => setCommentFilter(e.target.value as "all" | "with" | "without")}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm"
              >
                <option value="all">Tous</option>
                <option value="with">Avec commentaire</option>
                <option value="without">Sans commentaire</option>
              </select>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Visibilité</p>
              <select
                value={visibilityFilter}
                onChange={(e) =>
                  setVisibilityFilter(e.target.value as "all" | "public" | "private")
                }
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm"
              >
                <option value="all">Toutes</option>
                <option value="public">Publique</option>
                <option value="private">Privée</option>
              </select>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Trier par</p>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "date" | "category")}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="date">Date</option>
                  <option value="category">Catégorie</option>
                </select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  title={sortOrder === "asc" ? "Croissant" : "Décroissant"}
                >
                  <ArrowUpDown className={`w-4 h-4 ${sortOrder === "desc" ? "rotate-180" : ""}`} />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<Lightbulb className="w-12 h-12" />}
              title={items.length === 0 ? "Aucune idée" : "Aucune idée trouvée"}
              description={
                items.length === 0
                  ? "Les musiciens n'ont pas encore soumis d'idées."
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
                  <TableHead>Date</TableHead>
                  <TableHead>Musicien</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Visibilité</TableHead>
                  <TableHead>Commentaire</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{formatDateShort(item.created_at)}</TableCell>
                    <TableCell className="font-medium">
                      {item.user_first_name && item.user_last_name
                        ? `${item.user_first_name} ${item.user_last_name}`
                        : item.user_email || "Anonyme"}
                    </TableCell>
                    <TableCell>{CATEGORY_LABELS[item.category]}</TableCell>
                    <TableCell className="max-w-xs truncate">{item.title}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${VISIBILITY_COLORS[item.is_public]}`}
                      >
                        {item.is_public === 1 ? (
                          <Globe className="w-3 h-3" />
                        ) : (
                          <Lock className="w-3 h-3" />
                        )}
                        {VISIBILITY_LABELS[item.is_public]}
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.admin_notes ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Oui
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">
                          Non
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openViewDialog(item)}>
                        <Pencil className="w-4 h-4" />
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
        totalItems={filteredItems.length}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
      />

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Modifier l'idée</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 py-4 overflow-y-auto px-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Musicien</p>
                  <p className="text-foreground">
                    {viewing.user_first_name && viewing.user_last_name
                      ? `${viewing.user_first_name} ${viewing.user_last_name}`
                      : viewing.user_email || "Anonyme"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-foreground">
                    {viewing.user_email ? (
                      <a
                        href={`mailto:${viewing.user_email}`}
                        className="text-primary hover:underline"
                      >
                        {viewing.user_email}
                      </a>
                    ) : (
                      "-"
                    )}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Catégorie</p>
                  <p className="text-foreground">{CATEGORY_LABELS[viewing.category]}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date de soumission</p>
                  <p className="text-foreground">
                    {new Date(viewing.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Description</p>
                <p className="whitespace-pre-wrap bg-muted p-4 rounded-md text-foreground">
                  {viewing.description}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Visibilité</p>
                <div className="flex gap-2">
                  <Button
                    variant={viewing.is_public === 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      fetch(`/api/admin/ideas?id=${viewing.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          admin_notes: adminNotes,
                          is_public: 1,
                        }),
                      }).then(() => {
                        fetchData();
                        setViewing({ ...viewing, is_public: 1 });
                      });
                    }}
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Publique
                  </Button>
                  <Button
                    variant={viewing.is_public === 0 ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      fetch(`/api/admin/ideas?id=${viewing.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          admin_notes: adminNotes,
                          is_public: 0,
                        }),
                      }).then(() => {
                        fetchData();
                        setViewing({ ...viewing, is_public: 0 });
                      });
                    }}
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Privée
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Commentaire / Réponse au musicien
                </p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Ajoutez un commentaire ou une réponse qui sera visible par le musicien..."
                  rows={4}
                  className="mb-2"
                />
                <div className="flex gap-2">
                  <Button onClick={saveAdminNotes} disabled={savingNotes} size="sm">
                    {savingNotes ? "Sauvegarde..." : "Sauvegarder"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
