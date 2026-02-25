"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { CircularCropper } from "@/app/components/CircularCropper";
import {
  Pencil,
  Eye,
  Trash2,
  Shield,
  Music,
  Camera,
  Loader2,
  Search,
  Plus,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Users } from "lucide-react";
import { EmptyState } from "@/app/components/ui/empty-state";
import type { UserRole } from "@/db/types";
import { isSuperAdmin } from "@/db/types";
import { Pagination } from "@/app/components/ui/pagination";

const isProfileComplete = (user: UserWithProfile): boolean => {
  const requiredFields = [
    user.first_name,
    user.last_name,
    user.date_of_birth,
    user.phone,
    user.address_line1,
    user.postal_code,
    user.city,
    user.harmonie_start_date,
    user.emergency_contact_first_name,
    user.emergency_contact_last_name,
    user.emergency_contact_phone,
  ];
  const allTextFieldsFilled = requiredFields.every(
    (field) => field && field.toString().trim() !== ""
  );
  const hasConservatoryChoice =
    user.is_conservatory_student === 0 || user.is_conservatory_student === 1;
  const hasImageConsentChoice = user.image_consent === 0 || user.image_consent === 1;
  return allTextFieldsFilled && hasConservatoryChoice && hasImageConsentChoice;
};

interface UserWithProfile {
  id?: number;
  email: string;
  role: UserRole;
  is_active?: number;
  last_login?: string | null;
  created_at?: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar?: string | null;
  date_of_birth?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  postal_code?: string | null;
  city?: string | null;
  harmonie_start_date?: string | null;
  is_conservatory_student?: number | null;
  music_theory_level?: string | null;
  emergency_contact_last_name?: string | null;
  emergency_contact_first_name?: string | null;
  emergency_contact_email?: string | null;
  emergency_contact_phone?: string | null;
  image_consent?: number | null;
  adhesion_2025_2026?: number | null;
  instruments?: { instrument_name: string; start_date?: string; level?: string }[];
  harmonieInstruments?: string[];
}

interface UsersAdminClientProps {
  currentUserRole: UserRole;
  currentUserEmail: string;
}

export function UsersAdminClient({ currentUserRole, currentUserEmail }: UsersAdminClientProps) {
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const isCurrentUserSuperAdmin = isSuperAdmin(currentUserRole);
  const isCurrentUserAdmin = currentUserRole === "ADMIN";
  const canEditUser = (userEmail: string) => {
    if (isCurrentUserSuperAdmin) return true;
    if (isCurrentUserAdmin) return userEmail === currentUserEmail;
    return false;
  };
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<UserWithProfile> | null>(null);
  const [viewing, setViewing] = useState<Partial<UserWithProfile> | null>(null);
  const [deleting, setDeleting] = useState<UserWithProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "SUPER_ADMIN" | "ADMIN" | "MUSICIAN">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterAdhesion, setFilterAdhesion] = useState<"all" | "adherent" | "non_adherent">("all");
  const [filterProfile, setFilterProfile] = useState<"all" | "complete" | "incomplete">("all");
  const [sortField, setSortField] = useState<
    "name" | "email" | "role" | "city" | "status" | "adhesion" | "profile"
  >("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) setUsers((await response.json()) as UserWithProfile[]);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;

    if (!file.type.startsWith("image/")) {
      setError("Veuillez sélectionner une image");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("L'image ne doit pas dépasser 5 Mo");
      return;
    }

    // Open cropper instead of uploading directly
    setSelectedImage(file);
    setCropperOpen(true);
  };

  const handleCroppedImage = async (croppedBlob: Blob) => {
    setCropperOpen(false);
    setUploadingAvatar(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", croppedBlob, "avatar.jpg");

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (response.ok && data.url) {
        setEditing({ ...editing, avatar: data.url });
      } else {
        setError(data.error || "Erreur lors du téléchargement");
      }
    } catch (err) {
      console.error("Error uploading avatar:", err);
      setError("Erreur lors du téléchargement");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const isNew = !editing.id;
      const response = await fetch(
        isNew ? "/api/admin/users" : `/api/admin/users?id=${editing.id}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editing),
        }
      );
      const data = (await response.json()) as { error?: string };
      if (response.ok) {
        fetchData();
        setDialogOpen(false);
        setEditing(null);
      } else {
        setError(data.error || "Une erreur est survenue");
      }
    } catch (err) {
      console.error("Error:", err);
      setError("Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      const response = await fetch(`/api/admin/users?id=${deleting.id}`, { method: "DELETE" });
      if (response.ok) fetchData();
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setDeleteDialogOpen(false);
      setDeleting(null);
    }
  };

  const handleSort = (
    field: "name" | "email" | "role" | "city" | "status" | "adhesion" | "profile"
  ) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({
    field,
  }: {
    field: "name" | "email" | "role" | "city" | "status" | "adhesion" | "profile";
  }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 ml-1" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 ml-1" />
    );
  };

  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (filterRole !== "all") {
      result = result.filter((u) => u.role === filterRole);
    }

    if (filterStatus !== "all") {
      result = result.filter((u) =>
        filterStatus === "active" ? u.is_active !== 0 : u.is_active === 0
      );
    }

    if (filterAdhesion !== "all") {
      result = result.filter((u) =>
        filterAdhesion === "adherent" ? u.adhesion_2025_2026 === 1 : u.adhesion_2025_2026 !== 1
      );
    }

    if (filterProfile !== "all") {
      result = result.filter((u) =>
        filterProfile === "complete" ? isProfileComplete(u) : !isProfileComplete(u)
      );
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (u) =>
          u.email?.toLowerCase().includes(q) ||
          u.first_name?.toLowerCase().includes(q) ||
          u.last_name?.toLowerCase().includes(q) ||
          `${u.first_name} ${u.last_name}`.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      if (sortField === "name") {
        aVal = `${a.last_name || ""} ${a.first_name || ""}`.toLowerCase();
        bVal = `${b.last_name || ""} ${b.first_name || ""}`.toLowerCase();
      } else if (sortField === "city") {
        aVal = (a.city || "").toLowerCase();
        bVal = (b.city || "").toLowerCase();
      } else if (sortField === "status") {
        aVal = a.is_active !== 0 ? 1 : 0;
        bVal = b.is_active !== 0 ? 1 : 0;
      } else if (sortField === "adhesion") {
        aVal = a.adhesion_2025_2026 === 1 ? 1 : 0;
        bVal = b.adhesion_2025_2026 === 1 ? 1 : 0;
      } else if (sortField === "profile") {
        aVal = isProfileComplete(a) ? 1 : 0;
        bVal = isProfileComplete(b) ? 1 : 0;
      } else {
        aVal = ((a[sortField] as string) || "").toLowerCase();
        bVal = ((b[sortField] as string) || "").toLowerCase();
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }

      const cmp = (aVal as string).localeCompare(bVal as string, "fr");
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [
    users,
    search,
    filterRole,
    filterStatus,
    filterAdhesion,
    filterProfile,
    isProfileComplete,
    sortField,
    sortDir,
  ]);

  const paginatedUsers = useMemo(
    () => filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredUsers, currentPage, pageSize]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterRole, filterStatus, filterAdhesion, filterProfile]);

  const getRoleBadge = (role: UserRole) => {
    if (role === "SUPER_ADMIN") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
          <Shield className="w-3 h-3" />
          Super Admin
        </span>
      );
    }
    if (role === "ADMIN") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
          <Shield className="w-3 h-3" />
          Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
        <Music className="w-3 h-3" />
        Musicien
      </span>
    );
  };

  const getDisplayName = (user: UserWithProfile) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim();
    }
    return null;
  };

  const addInstrument = () => {
    if (!editing) return;
    setEditing({
      ...editing,
      instruments: [
        ...(editing.instruments || []),
        { instrument_name: "", start_date: "", level: "" },
      ],
    });
  };

  const removeInstrument = (index: number) => {
    if (!editing) return;
    const newInstruments = [...(editing.instruments || [])];
    newInstruments.splice(index, 1);
    if (newInstruments.length === 0) {
      newInstruments.push({ instrument_name: "", start_date: "", level: "" });
    }
    setEditing({ ...editing, instruments: newInstruments });
  };

  const updateInstrument = (index: number, field: string, value: string) => {
    if (!editing) return;
    const newInstruments = [...(editing.instruments || [])];
    newInstruments[index] = { ...newInstruments[index], [field]: value };
    setEditing({ ...editing, instruments: newInstruments });
  };

  const openEditDialog = (user: Partial<UserWithProfile>) => {
    const userToEdit = { ...user };
    if (!userToEdit.instruments || userToEdit.instruments.length === 0) {
      userToEdit.instruments = [{ instrument_name: "", start_date: "", level: "" }];
    }
    setEditing(userToEdit);
    setError(null);
    setDialogOpen(true);
  };

  const openViewDialog = (user: Partial<UserWithProfile>) => {
    const userToView = { ...user };
    if (!userToView.instruments || userToView.instruments.length === 0) {
      userToView.instruments = [{ instrument_name: "", start_date: "", level: "" }];
    }
    setViewing(userToView);
    setViewDialogOpen(true);
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
        <h1 className="text-3xl font-bold text-foreground">Utilisateurs</h1>
        {isCurrentUserSuperAdmin && (
          <Button onClick={() => openEditDialog({ email: "", role: "MUSICIAN", is_active: 1 })}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvel utilisateur
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Rechercher (nom, email...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filterRole}
          onValueChange={(v) => setFilterRole(v as "all" | "SUPER_ADMIN" | "ADMIN" | "MUSICIAN")}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="MUSICIAN">Musicien</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filterStatus}
          onValueChange={(v) => setFilterStatus(v as "all" | "active" | "inactive")}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="inactive">Inactif</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filterAdhesion}
          onValueChange={(v) => setFilterAdhesion(v as "all" | "adherent" | "non_adherent")}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes adhésions</SelectItem>
            <SelectItem value="adherent">Adhérent 2025-26</SelectItem>
            <SelectItem value="non_adherent">Non adhérent</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filterProfile}
          onValueChange={(v) => setFilterProfile(v as "all" | "complete" | "incomplete")}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les profils</SelectItem>
            <SelectItem value="complete">Profil complet</SelectItem>
            <SelectItem value="incomplete">Profil incomplet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<Users className="w-12 h-12" />}
              title={users.length === 0 ? "Aucun utilisateur" : "Aucun utilisateur trouvé"}
              description={
                users.length === 0
                  ? "Créez-en un pour commencer !"
                  : "Essayez de modifier vos critères de recherche"
              }
              action={
                users.length === 0 && isCurrentUserSuperAdmin ? (
                  <Button
                    onClick={() => openEditDialog({ email: "", role: "MUSICIAN", is_active: 1 })}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvel utilisateur
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
                  <TableHead className="w-12"></TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSort("name")}
                  >
                    <span className="inline-flex items-center">
                      Nom <SortIcon field="name" />
                    </span>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSort("email")}
                  >
                    <span className="inline-flex items-center">
                      Email <SortIcon field="email" />
                    </span>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSort("role")}
                  >
                    <span className="inline-flex items-center">
                      Rôle <SortIcon field="role" />
                    </span>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSort("status")}
                  >
                    <span className="inline-flex items-center">
                      Statut <SortIcon field="status" />
                    </span>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSort("adhesion")}
                  >
                    <span className="inline-flex items-center">
                      Adhésion <SortIcon field="adhesion" />
                    </span>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSort("profile")}
                  >
                    <span className="inline-flex items-center">
                      Profil <SortIcon field="profile" />
                    </span>
                  </TableHead>
                  <TableHead>Dernière connexion</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <Music className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {getDisplayName(user) || (
                        <span className="text-muted-foreground italic">Non renseigné</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        className="hover:underline text-left"
                        onClick={() => openViewDialog(user)}
                      >
                        {user.email}
                      </button>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      {user.is_active !== 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          Inactif
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.role === "SUPER_ADMIN" || user.role === "ADMIN" ? (
                        ""
                      ) : user.adhesion_2025_2026 === 1 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Adhérent
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                          Non adhérent
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.role === "SUPER_ADMIN" || user.role === "ADMIN" ? (
                        ""
                      ) : isProfileComplete(user) ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Complet
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          Incomplet
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {user.last_login
                        ? new Date(user.last_login).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Europe/Paris",
                          })
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openViewDialog(user)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {canEditUser(user.email || "") && (
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      {isCurrentUserSuperAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeleting(user);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Pagination
        totalItems={filteredUsers.length}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
      />

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Modifier" : "Nouvel"} utilisateur</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-6 py-4">
              {error && (
                <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-6">
                <div className="relative">
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    disabled={uploadingAvatar}
                    className="relative w-20 h-20 rounded-full overflow-hidden bg-muted hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    {editing.avatar ? (
                      <img
                        src={editing.avatar}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                      </div>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Photo de profil</p>
                  <p>Cliquez pour changer</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={editing.email || ""}
                    onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Rôle *</Label>
                  <select
                    value={editing.role || "MUSICIAN"}
                    onChange={(e) => setEditing({ ...editing, role: e.target.value as UserRole })}
                    className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="MUSICIAN">Musicien</option>
                    <option value="ADMIN">Administrateur</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Statut du compte</Label>
                  <div className="flex items-center gap-4 h-10">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="is_active"
                        checked={editing.is_active !== 0}
                        onChange={() => setEditing({ ...editing, is_active: 1 })}
                        className="w-4 h-4 text-primary"
                      />
                      <span className="text-sm">Actif</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="is_active"
                        checked={editing.is_active === 0}
                        onChange={() => setEditing({ ...editing, is_active: 0 })}
                        className="w-4 h-4 text-primary"
                      />
                      <span className="text-sm">Inactif</span>
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    Un compte inactif ne pourra plus se connecter à son espace.
                  </p>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="font-medium text-foreground mb-4">Informations personnelles</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Prénom</Label>
                    <Input
                      value={editing.first_name || ""}
                      onChange={(e) => setEditing({ ...editing, first_name: e.target.value })}
                      placeholder="Jean"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Nom</Label>
                    <Input
                      value={editing.last_name || ""}
                      onChange={(e) => setEditing({ ...editing, last_name: e.target.value })}
                      placeholder="Dupont"
                    />
                  </div>
                </div>
                {editing.role === "MUSICIAN" && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="grid gap-2">
                      <Label>Date de naissance</Label>
                      <Input
                        type="date"
                        value={editing.date_of_birth || ""}
                        onChange={(e) => setEditing({ ...editing, date_of_birth: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Téléphone</Label>
                      <Input
                        type="tel"
                        value={editing.phone || ""}
                        onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                        placeholder="06 12 34 56 78"
                      />
                    </div>
                  </div>
                )}
                {editing.role !== "MUSICIAN" && (
                  <div className="grid grid-cols-1 gap-4 mt-4">
                    <div className="grid gap-2">
                      <Label>Téléphone</Label>
                      <Input
                        type="tel"
                        value={editing.phone || ""}
                        onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                        placeholder="06 12 34 56 78"
                      />
                    </div>
                  </div>
                )}
              </div>

              {editing.role === "MUSICIAN" && (
                <>
                  <div className="border-t border-border pt-4">
                    <h3 className="font-medium text-foreground mb-4">Adresse postale</h3>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label>Adresse</Label>
                        <Input
                          value={editing.address_line1 || ""}
                          onChange={(e) =>
                            setEditing({ ...editing, address_line1: e.target.value })
                          }
                          placeholder="123 rue de la Musique"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Complément d'adresse</Label>
                        <Input
                          value={editing.address_line2 || ""}
                          onChange={(e) =>
                            setEditing({ ...editing, address_line2: e.target.value })
                          }
                          placeholder="Appartement 4B, Bâtiment C"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Code postal</Label>
                          <Input
                            value={editing.postal_code || ""}
                            onChange={(e) =>
                              setEditing({ ...editing, postal_code: e.target.value })
                            }
                            placeholder="94370"
                            maxLength={5}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Ville</Label>
                          <Input
                            value={editing.city || ""}
                            onChange={(e) => setEditing({ ...editing, city: e.target.value })}
                            placeholder="Sucy-en-Brie"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <h3 className="font-medium text-foreground mb-4">Harmonie</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Date d'entrée à l'Harmonie</Label>
                        <Input
                          type="date"
                          value={editing.harmonie_start_date || ""}
                          onChange={(e) =>
                            setEditing({ ...editing, harmonie_start_date: e.target.value })
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Élève au Conservatoire</Label>
                        <div className="flex items-center gap-4 h-10">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="conservatory"
                              checked={editing.is_conservatory_student === 1}
                              onChange={() =>
                                setEditing({ ...editing, is_conservatory_student: 1 })
                              }
                              className="w-4 h-4 text-primary"
                            />
                            <span className="text-sm">Oui</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="conservatory"
                              checked={editing.is_conservatory_student === 0}
                              onChange={() =>
                                setEditing({ ...editing, is_conservatory_student: 0 })
                              }
                              className="w-4 h-4 text-primary"
                            />
                            <span className="text-sm">Non</span>
                          </label>
                        </div>
                      </div>
                      <div className="grid gap-3 col-span-2">
                        <Label>Droit à l'image</Label>
                        <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg space-y-3">
                          <p>
                            Dans le cadre des activités de l'association « Les Amis de l'Harmonie »
                            et de l'Harmonie Municipale de Sucy-en-Brie, des photographies, vidéos
                            ou captations numériques peuvent être réalisées.
                          </p>
                          <p>Ces images peuvent représenter :</p>
                          <ul className="list-disc list-inside ml-2 space-y-1">
                            <li>moi-même</li>
                            <li>et/ou mon enfant (si représentant légal)</li>
                          </ul>
                          <p>
                            Si vous acceptez, vous autorisez l'association « Les Amis de l'Harmonie
                            » et l'Harmonie Municipale de Sucy-en-Brie à :
                          </p>
                          <ul className="list-disc list-inside ml-2 space-y-1">
                            <li>
                              fixer, reproduire et communiquer au public les photographies, vidéos
                              ou captations numériques réalisées dans ce cadre ;
                            </li>
                            <li>
                              exploiter et utiliser ces images, directement ou par l'intermédiaire
                              de tiers, sous toute forme et sur tous supports (presse, livre,
                              supports numériques, exposition, publicité, projection publique,
                              concours, site internet, réseaux sociaux, etc.) ;
                            </li>
                            <li>
                              utiliser ces images pour un territoire illimité et sans limitation de
                              durée, intégralement ou par extraits.
                            </li>
                          </ul>
                          <p>
                            Cette autorisation est consentie à titre gratuit et ne donnera lieu à
                            aucune rémunération.
                          </p>
                          <p>
                            Les bénéficiaires de l'autorisation s'engagent à ne pas utiliser les
                            images dans un cadre susceptible de porter atteinte à la vie privée, à
                            la dignité ou à la réputation des personnes concernées.
                          </p>
                          <p>
                            Vous garantissez ne pas être lié(e), ni la personne que vous représentez
                            le cas échéant, par un contrat exclusif relatif à l'utilisation de votre
                            image ou de votre nom.
                          </p>
                          <p>
                            Conformément à la réglementation en vigueur, vous pouvez retirer votre
                            consentement à tout moment par demande écrite adressée à l'association
                            (sans effet rétroactif sur les utilisations déjà réalisées).
                          </p>
                          <p className="italic">
                            Rappel : la reproduction de l'image d'un groupe dans un lieu public ou
                            sur scène peut être permise sans solliciter le consentement individuel
                            de chaque personne photographiée.
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 pt-2">
                          <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-muted/30 rounded">
                            <input
                              type="radio"
                              name="image_consent"
                              checked={editing.image_consent === 1}
                              onChange={() => setEditing({ ...editing, image_consent: 1 })}
                              className="w-4 h-4 text-primary"
                            />
                            <span className="text-sm">J'autorise l'utilisation de mon image</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-muted/30 rounded">
                            <input
                              type="radio"
                              name="image_consent"
                              checked={editing.image_consent === 0}
                              onChange={() => setEditing({ ...editing, image_consent: 0 })}
                              className="w-4 h-4 text-primary"
                            />
                            <span className="text-sm">
                              Je n'autorise pas l'utilisation de mon image
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <h3 className="font-medium text-foreground mb-4">Adhésion 2025-2026</h3>
                    <div className="grid gap-2">
                      <Label>Statut adhésion</Label>
                      <div className="flex items-center gap-4 h-10">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="adhesion_2025_2026"
                            checked={editing.adhesion_2025_2026 === 1}
                            onChange={() => setEditing({ ...editing, adhesion_2025_2026: 1 })}
                            className="w-4 h-4 text-primary"
                          />
                          <span className="text-sm">Adhérent 2025-2026</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="adhesion_2025_2026"
                            checked={editing.adhesion_2025_2026 !== 1}
                            onChange={() => setEditing({ ...editing, adhesion_2025_2026: 0 })}
                            className="w-4 h-4 text-primary"
                          />
                          <span className="text-sm">Non adhérent</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <h3 className="font-medium text-foreground mb-4">
                      Pratique instrumentale et formation musicale
                    </h3>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label>Formation Musicale (solfège) - Niveau conservatoire</Label>
                        <Input
                          value={editing.music_theory_level || ""}
                          onChange={(e) =>
                            setEditing({ ...editing, music_theory_level: e.target.value })
                          }
                          placeholder="Ex: Cycle 2, 3ème année"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Instruments</Label>
                        {(editing.instruments || []).map((instrument, index) => (
                          <div
                            key={index}
                            className="p-4 border border-border rounded-lg space-y-4"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-foreground">
                                Instrument {index + 1}
                              </span>
                              {(editing.instruments?.length || 0) > 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeInstrument(index)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="grid gap-2">
                                <Label>Instrument</Label>
                                <Input
                                  value={instrument.instrument_name || ""}
                                  onChange={(e) =>
                                    updateInstrument(index, "instrument_name", e.target.value)
                                  }
                                  placeholder="Ex: Clarinette"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Date de début</Label>
                                <Input
                                  type="date"
                                  value={instrument.start_date || ""}
                                  onChange={(e) =>
                                    updateInstrument(index, "start_date", e.target.value)
                                  }
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Niveau conservatoire</Label>
                                <Input
                                  value={instrument.level || ""}
                                  onChange={(e) => updateInstrument(index, "level", e.target.value)}
                                  placeholder="Ex: Cycle 3"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        <Button variant="outline" onClick={addInstrument} className="w-full">
                          <Plus className="w-4 h-4 mr-2" />
                          Ajouter un instrument
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <h3 className="font-medium text-foreground mb-4">
                      Contact d'urgence / Représentant légal
                    </h3>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Prénom</Label>
                          <Input
                            value={editing.emergency_contact_first_name || ""}
                            onChange={(e) =>
                              setEditing({
                                ...editing,
                                emergency_contact_first_name: e.target.value,
                              })
                            }
                            placeholder="Marie"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Nom</Label>
                          <Input
                            value={editing.emergency_contact_last_name || ""}
                            onChange={(e) =>
                              setEditing({
                                ...editing,
                                emergency_contact_last_name: e.target.value,
                              })
                            }
                            placeholder="Dupont"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={editing.emergency_contact_email || ""}
                            onChange={(e) =>
                              setEditing({ ...editing, emergency_contact_email: e.target.value })
                            }
                            placeholder="marie.dupont@email.com"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Téléphone</Label>
                          <Input
                            type="tel"
                            value={editing.emergency_contact_phone || ""}
                            onChange={(e) =>
                              setEditing({ ...editing, emergency_contact_phone: e.target.value })
                            }
                            placeholder="06 12 34 56 78"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving || !editing?.email}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CircularCropper
        imageFile={selectedImage}
        isOpen={cropperOpen}
        onClose={() => setCropperOpen(false)}
        onConfirm={handleCroppedImage}
      />

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de l'utilisateur</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="grid gap-6 py-4">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-muted">
                    {viewing.avatar ? (
                      <img
                        src={viewing.avatar}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Photo de profil</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="text-sm font-medium">{viewing.email || "-"}</p>
                </div>
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Rôle</Label>
                  <p className="text-sm font-medium">
                    {viewing.role === "SUPER_ADMIN"
                      ? "Super Admin"
                      : viewing.role === "ADMIN"
                        ? "Administrateur"
                        : "Musicien"}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Statut du compte</Label>
                  <p className="text-sm font-medium">
                    {viewing.is_active !== 0 ? "Actif" : "Inactif"}
                  </p>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="font-medium text-foreground mb-4">Informations personnelles</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <div className="grid gap-2">
                    <Label className="text-muted-foreground">Prénom</Label>
                    <p className="text-sm font-medium">{viewing.first_name || "-"}</p>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-muted-foreground">Nom</Label>
                    <p className="text-sm font-medium">{viewing.last_name || "-"}</p>
                  </div>
                  {viewing.role === "MUSICIAN" && (
                    <div className="grid gap-2">
                      <Label className="text-muted-foreground">Date de naissance</Label>
                      <p className="text-sm font-medium">
                        {viewing.date_of_birth
                          ? new Date(viewing.date_of_birth).toLocaleDateString("fr-FR")
                          : "-"}
                      </p>
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label className="text-muted-foreground">Téléphone</Label>
                    <p className="text-sm font-medium">{viewing.phone || "-"}</p>
                  </div>
                </div>
              </div>

              {viewing.role === "MUSICIAN" && (
                <>
                  <div className="border-t border-border pt-4">
                    <h3 className="font-medium text-foreground mb-4">Adresse postale</h3>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label className="text-muted-foreground">Adresse</Label>
                        <p className="text-sm font-medium">{viewing.address_line1 || "-"}</p>
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-muted-foreground">Complément d'adresse</Label>
                        <p className="text-sm font-medium">{viewing.address_line2 || "-"}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label className="text-muted-foreground">Code postal</Label>
                          <p className="text-sm font-medium">{viewing.postal_code || "-"}</p>
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-muted-foreground">Ville</Label>
                          <p className="text-sm font-medium">{viewing.city || "-"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <h3 className="font-medium text-foreground mb-4">Harmonie</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                      <div className="grid gap-2">
                        <Label className="text-muted-foreground">Date d'entrée à l'Harmonie</Label>
                        <p className="text-sm font-medium">
                          {viewing.harmonie_start_date
                            ? new Date(viewing.harmonie_start_date).toLocaleDateString("fr-FR")
                            : "-"}
                        </p>
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-muted-foreground">Élève au Conservatoire</Label>
                        <p className="text-sm font-medium">
                          {viewing.is_conservatory_student === 1 ? "Oui" : "Non"}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-2 mt-4">
                      <Label className="text-muted-foreground">
                        Instrument(s) joué(s) à l'Harmonie
                      </Label>
                      <p className="text-sm font-medium">
                        {viewing.harmonieInstruments && viewing.harmonieInstruments.length > 0
                          ? viewing.harmonieInstruments.join(", ")
                          : "-"}
                      </p>
                    </div>
                    <div className="grid gap-2 mt-4">
                      <Label className="text-muted-foreground">Droit à l'image</Label>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            viewing.image_consent === 1
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : viewing.image_consent === 0
                                ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {viewing.image_consent === 1
                            ? "Autorisé"
                            : viewing.image_consent === 0
                              ? "Non autorisé"
                              : "Non renseigné"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-border pt-4">
                    <h3 className="font-medium text-foreground mb-4">Adhésion 2025-2026</h3>
                    <div className="grid gap-2">
                      <Label className="text-muted-foreground">Statut adhésion</Label>
                      <p className="text-sm font-medium">
                        {viewing.adhesion_2025_2026 === 1 ? "Adhérent 2025-2026" : "Non adhérent"}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <h3 className="font-medium text-foreground mb-4">
                      Pratique instrumentale et formation musicale
                    </h3>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label className="text-muted-foreground">
                          Formation Musicale (solfège) - Niveau conservatoire
                        </Label>
                        <p className="text-sm font-medium">{viewing.music_theory_level || "-"}</p>
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-muted-foreground">Instruments</Label>
                        {(viewing.instruments || []).some(
                          (i) => i.instrument_name || i.start_date || i.level
                        ) ? (
                          (viewing.instruments || []).map((instrument, index) =>
                            instrument.instrument_name ||
                            instrument.start_date ||
                            instrument.level ? (
                              <div
                                key={index}
                                className="p-4 border border-border rounded-lg space-y-2"
                              >
                                <div className="grid grid-cols-3 gap-4">
                                  <div>
                                    <Label className="text-xs text-muted-foreground">
                                      Instrument
                                    </Label>
                                    <p className="text-sm font-medium">
                                      {instrument.instrument_name || "-"}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-muted-foreground">
                                      Date de début
                                    </Label>
                                    <p className="text-sm font-medium">
                                      {instrument.start_date
                                        ? new Date(instrument.start_date).toLocaleDateString(
                                            "fr-FR"
                                          )
                                        : "-"}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-muted-foreground">
                                      Niveau conservatoire
                                    </Label>
                                    <p className="text-sm font-medium">{instrument.level || "-"}</p>
                                  </div>
                                </div>
                              </div>
                            ) : null
                          )
                        ) : (
                          <p className="text-sm text-muted-foreground">-</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <h3 className="font-medium text-foreground mb-4">
                      Contact d'urgence / Représentant légal
                    </h3>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label className="text-muted-foreground">Prénom</Label>
                          <p className="text-sm font-medium">
                            {viewing.emergency_contact_first_name || "-"}
                          </p>
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-muted-foreground">Nom</Label>
                          <p className="text-sm font-medium">
                            {viewing.emergency_contact_last_name || "-"}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label className="text-muted-foreground">Email</Label>
                          <p className="text-sm font-medium">
                            {viewing.emergency_contact_email || "-"}
                          </p>
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-muted-foreground">Téléphone</Label>
                          <p className="text-sm font-medium">
                            {viewing.emergency_contact_phone || "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'utilisateur "{deleting?.email}" et toutes ses données
              seront définitivement supprimés.
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
