"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Pencil,
  Eye,
  Shield,
  Music,
  Camera,
  Search,
  Plus,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Download,
  Users,
  Check,
  Star,
  UserRoundCog,
  X,
} from "lucide-react";
import { AvatarUploader } from "@/app/components/shared/AvatarUploader";
import { InstrumentEditor } from "@/app/components/shared/InstrumentEditor";
import { EmptyState } from "@/app/components/ui/empty-state";
import type { UserRole } from "@/db/types";
import { isSuperAdmin, HARMONIE_INSTRUMENTS } from "@/db/types";
import { Pagination } from "@/app/components/ui/pagination";
import { compareInstruments, resolveDeclaredPrimaryInstrument } from "@/lib/instruments";
import { cn } from "@/lib/utils";
import { AccountTypePicker } from "./AccountTypePicker";
import { ImageConsentBadge, ManagedImageConsentNote } from "./ImageConsentManaged";
import { ManagedAccountNotice } from "./ManagedAccountNotice";
import { UserGuardianLinks, type LinkedNames } from "./UserGuardianLinks";
import {
  buildUsersCsv,
  formatParisDateTime,
  getAccountKind,
  getFullName,
  getKindLabel,
  isAdultWithLinkedGuardian,
  isMusicianAccount,
  isProfileComplete,
  matchesUserSearch,
  type UserWithProfile,
} from "./users-shared";

const NEW_USER: Partial<UserWithProfile> = {
  email: "",
  role: "MUSICIAN",
  kind: "member",
  is_active: 1,
};

type RoleFilter = "all" | "SUPER_ADMIN" | "ADMIN" | "MUSICIAN" | "GUARDIAN" | "MANAGED";

interface UsersAdminClientProps {
  currentUserRole: UserRole;
  currentUserEmail: string;
}

export function UsersAdminClient({ currentUserRole, currentUserEmail }: UsersAdminClientProps) {
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const isCurrentUserSuperAdmin = isSuperAdmin(currentUserRole);
  const isCurrentUserAdmin = currentUserRole === "ADMIN";
  const canEditUser = (userEmail: string | null) => {
    if (isCurrentUserSuperAdmin) return true;
    if (isCurrentUserAdmin) return userEmail !== null && userEmail === currentUserEmail;
    return false;
  };
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<UserWithProfile> | null>(null);
  const [viewing, setViewing] = useState<Partial<UserWithProfile> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<RoleFilter>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("active");
  const [filterAdhesion, setFilterAdhesion] = useState<"all" | "adherent" | "non_adherent">("all");
  const [filterProfile, setFilterProfile] = useState<"all" | "complete" | "incomplete">("all");
  const [filterImageConsent, setFilterImageConsent] = useState<
    "all" | "authorized" | "refused" | "not_set"
  >("all");
  const [sortField, setSortField] = useState<
    "name" | "email" | "role" | "city" | "status" | "adhesion" | "profile" | "last_login"
  >("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        setNotice("La liste des utilisateurs n'a pas pu être actualisée. Rechargez la page.");
        return;
      }
      setUsers((await response.json()) as UserWithProfile[]);
    } catch (err) {
      console.error("Error:", err);
      setNotice("La liste des utilisateurs n'a pas pu être actualisée. Rechargez la page.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Lien direct depuis la page « Familles » : /admin/users?user=ID ouvre la fiche.
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current || users.length === 0) return;
    deepLinkHandled.current = true;
    const requested = Number(new URLSearchParams(window.location.search).get("user"));
    const target = Number.isInteger(requested) ? users.find((u) => u.id === requested) : undefined;
    if (target) openViewDialog(target);
  }, [users]);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const isNew = !editing.id;
      const accountKind = getAccountKind(editing);
      const payload: Partial<UserWithProfile> = {
        ...editing,
        primaryHarmonieInstrument: resolveDeclaredPrimaryInstrument(
          editing.harmonieInstruments || [],
          editing.primaryHarmonieInstrument
        ),
      };
      if (isNew && accountKind === "managed") {
        // Musicien sans e-mail : le serveur génère l'adresse interne.
        payload.kind = "member";
        payload.noEmail = true;
        payload.role = "MUSICIAN";
        delete payload.email;
      } else if (isNew && accountKind === "guardian") {
        payload.kind = "guardian";
        payload.noEmail = false;
        payload.role = "MUSICIAN";
      }
      const response = await fetch(
        isNew ? "/api/admin/users" : `/api/admin/users?id=${editing.id}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = (await response.json()) as { error?: string };
      if (response.ok) {
        fetchData();
        setDialogOpen(false);
        setEditing(null);
        if (isNew && accountKind === "managed") {
          setNotice(
            "Compte créé. Ouvrez sa fiche pour indiquer ses responsables : sans eux, personne ne peut ouvrir son espace."
          );
        } else if (isNew && accountKind === "guardian") {
          setNotice(
            "Responsable créé. Pour le relier à un musicien, ouvrez la fiche du musicien et utilisez « Lier un compte existant »."
          );
        }
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
  /** Un lien responsable / enfant a changé : on recharge la liste et on rafraîchit la fiche ouverte. */
  const handleLinksChanged = (names: LinkedNames) => {
    void fetchData();
    const apply = (prev: Partial<UserWithProfile> | null) =>
      prev
        ? {
            ...prev,
            guardian_names: names.guardians,
            children_names: names.children,
            // Relié : le droit à l'image dépend des responsables ; sinon il redevient modifiable.
            image_consent_managed: !!names.guardians,
            ...(names.imageConsent !== undefined ? { image_consent: names.imageConsent } : {}),
          }
        : prev;
    setEditing(apply);
    setViewing(apply);
  };

  /** Transfert d'adresse ou accès personnel : le compte a changé de nature, on ferme la fiche. */
  const handleAccountChanged = (message: string) => {
    setDialogOpen(false);
    setViewDialogOpen(false);
    setEditing(null);
    setViewing(null);
    setNotice(message);
    void fetchData();
  };

  const handleSort = (
    field: "name" | "email" | "role" | "city" | "status" | "adhesion" | "profile" | "last_login"
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
    field: "name" | "email" | "role" | "city" | "status" | "adhesion" | "profile" | "last_login";
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

    if (filterRole === "GUARDIAN") {
      result = result.filter((u) => getAccountKind(u) === "guardian");
    } else if (filterRole === "MANAGED") {
      result = result.filter((u) => getAccountKind(u) === "managed");
    } else if (filterRole === "MUSICIAN") {
      result = result.filter((u) => isMusicianAccount(u));
    } else if (filterRole !== "all") {
      result = result.filter((u) => u.role === filterRole);
    }

    if (filterStatus !== "all") {
      result = result.filter((u) =>
        filterStatus === "active" ? u.is_active !== 0 : u.is_active === 0
      );
    }

    // Les responsables légaux n'ont ni adhésion, ni profil musicien, ni droit à l'image.
    if (filterAdhesion !== "all") {
      result = result.filter(
        (u) =>
          getAccountKind(u) !== "guardian" &&
          (filterAdhesion === "adherent" ? u.adhesion_2026_2027 === 1 : u.adhesion_2026_2027 !== 1)
      );
    }

    if (filterProfile !== "all") {
      result = result.filter(
        (u) =>
          getAccountKind(u) !== "guardian" &&
          (filterProfile === "complete" ? isProfileComplete(u) : !isProfileComplete(u))
      );
    }

    if (filterImageConsent !== "all") {
      result = result.filter((u) => {
        if (u.role === "SUPER_ADMIN" || u.role === "ADMIN" || getAccountKind(u) === "guardian") {
          return false;
        }
        if (filterImageConsent === "authorized") return u.image_consent === 1;
        if (filterImageConsent === "refused") return u.image_consent === 0;
        if (filterImageConsent === "not_set") return u.image_consent == null;
        return true;
      });
    }

    if (search.trim()) {
      result = result.filter((u) => matchesUserSearch(u, search));
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
        aVal = a.adhesion_2026_2027 === 1 ? 1 : 0;
        bVal = b.adhesion_2026_2027 === 1 ? 1 : 0;
      } else if (sortField === "profile") {
        aVal = isProfileComplete(a) ? 1 : 0;
        bVal = isProfileComplete(b) ? 1 : 0;
      } else if (sortField === "last_login") {
        aVal = a.last_login ? new Date(a.last_login).getTime() : 0;
        bVal = b.last_login ? new Date(b.last_login).getTime() : 0;
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
    filterImageConsent,
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
  }, [search, filterRole, filterStatus, filterAdhesion, filterProfile, filterImageConsent]);

  const getRoleBadge = (user: UserWithProfile) => {
    const role = user.role;
    const kind = getAccountKind(user);
    if (kind === "guardian") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
          <Users className="w-3 h-3" />
          Responsable
        </span>
      );
    }
    if (kind === "managed") {
      return (
        <span className="inline-flex flex-wrap items-center gap-1">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <Music className="w-3 h-3" />
            Musicien
          </span>
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
            title="Pas de connexion : ses responsables agissent pour lui"
          >
            <UserRoundCog className="w-3 h-3" />
            Géré
          </span>
        </span>
      );
    }
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

  const openEditDialog = (user: Partial<UserWithProfile>) => {
    const userToEdit = { ...user };
    if (!userToEdit.instruments || userToEdit.instruments.length === 0) {
      userToEdit.instruments = [{ instrument_name: "", start_date: "", level: "" }];
    }
    userToEdit.primaryHarmonieInstrument = resolveDeclaredPrimaryInstrument(
      userToEdit.harmonieInstruments || [],
      userToEdit.primaryHarmonieInstrument ?? null
    );
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

  const exportCSV = () => {
    const csvContent = buildUsersCsv(filteredUsers);

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `utilisateurs-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;

  const editingKind = editing ? getAccountKind(editing) : "member";
  // Un responsable légal n'a ni adresse postale, ni instruments, ni adhésion : seulement ses coordonnées.
  const showMusicianFields = !!editing && editing.role === "MUSICIAN" && editingKind !== "guardian";
  const viewingKind = viewing ? getAccountKind(viewing) : "member";
  const viewingIsMusician = !!viewing && viewing.role === "MUSICIAN" && viewingKind !== "guardian";

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
        <h1 className="text-3xl font-bold text-foreground">Utilisateurs</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} disabled={filteredUsers.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV
          </Button>
          {isCurrentUserSuperAdmin && (
            <Button onClick={() => openEditDialog(NEW_USER)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvel utilisateur
            </Button>
          )}
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className="mb-4 flex items-start justify-between gap-3 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-900 dark:border-green-700 dark:bg-green-900/20 dark:text-green-200"
        >
          <p>{notice}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Fermer le message"
            className="shrink-0 rounded p-0.5 hover:bg-green-100 dark:hover:bg-green-900/40 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
        <Select value={filterRole} onValueChange={(v) => setFilterRole(v as RoleFilter)}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="MUSICIAN">Musicien</SelectItem>
            <SelectItem value="GUARDIAN">Responsable légal</SelectItem>
            <SelectItem value="MANAGED">Musicien géré</SelectItem>
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
            <SelectItem value="adherent">Adhérent 2026-27</SelectItem>
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
        <Select
          value={filterImageConsent}
          onValueChange={(v) =>
            setFilterImageConsent(v as "all" | "authorized" | "refused" | "not_set")
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous droits à l'image</SelectItem>
            <SelectItem value="authorized">Autorisé</SelectItem>
            <SelectItem value="refused">Refusé</SelectItem>
            <SelectItem value="not_set">Non renseigné</SelectItem>
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
                  <Button onClick={() => openEditDialog(NEW_USER)}>
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
                  <TableHead>Droit à l'image</TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSort("last_login")}
                  >
                    <span className="inline-flex items-center">
                      Dernière connexion <SortIcon field="last_login" />
                    </span>
                  </TableHead>
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
                    <TableCell className="font-medium min-w-[11rem]">
                      {getDisplayName(user) || (
                        <span className="text-muted-foreground italic">Non renseigné</span>
                      )}
                      {user.guardian_names && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          Responsable : {user.guardian_names}
                        </span>
                      )}
                      {user.children_names && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          Responsable de {user.children_names}
                        </span>
                      )}
                      {isAdultWithLinkedGuardian(user) && (
                        <span
                          className="mt-1 inline-block rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium leading-snug text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                          title="Ce musicien a 18 ans ou plus mais un responsable légal est encore lié à son compte."
                        >
                          Majeur, responsable encore lié
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        className="hover:underline text-left"
                        onClick={() => openViewDialog(user)}
                      >
                        {user.email ?? (
                          <span className="text-muted-foreground italic">Pas d'e-mail</span>
                        )}
                      </button>
                    </TableCell>
                    <TableCell>{getRoleBadge(user)}</TableCell>
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
                      {!isMusicianAccount(user) ? (
                        ""
                      ) : user.adhesion_2026_2027 === 1 ? (
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
                      {!isMusicianAccount(user) ? (
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
                    <TableCell>
                      {!isMusicianAccount(user) ? (
                        ""
                      ) : user.image_consent === 1 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Autorisé
                        </span>
                      ) : user.image_consent === 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          Refusé
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                          Non renseigné
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {user.last_login ? formatParisDateTime(user.last_login) : "-"}
                    </TableCell>
                    <TableCell className="sticky right-0 bg-card text-right whitespace-nowrap shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openViewDialog(user)}
                        aria-label={`Voir la fiche de ${getDisplayName(user) ?? user.email ?? "ce compte"}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {canEditUser(user.email) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(user)}
                          aria-label={`Modifier ${getDisplayName(user) ?? user.email ?? "ce compte"}`}
                        >
                          <Pencil className="w-4 h-4" />
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

              <AvatarUploader
                avatar={editing.avatar}
                onUpload={(url) => setEditing({ ...editing, avatar: url })}
                uploadEndpoint="/api/admin/upload"
                size={80}
                onError={setError}
              />

              {!editing.id && (
                <AccountTypePicker
                  value={getAccountKind(editing)}
                  onChange={(kind) =>
                    setEditing({
                      ...editing,
                      kind: kind === "guardian" ? "guardian" : "member",
                      noEmail: kind === "managed",
                      role: kind === "member" ? editing.role : "MUSICIAN",
                    })
                  }
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                {editingKind === "managed" ? (
                  editing.id ? (
                    <ManagedAccountNotice
                      userId={editing.id}
                      name={getFullName(editing) || "Ce musicien"}
                      guardianNames={editing.guardian_names}
                      canGiveAccess={isCurrentUserSuperAdmin}
                      inEditForm
                      onGiven={handleAccountChanged}
                    />
                  ) : (
                    <p className="col-span-2 rounded-lg border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                      Pas d'adresse e-mail : ce musicien ne se connecte pas. Ses responsables
                      agiront à sa place. Vous pourrez les indiquer après l'enregistrement, depuis
                      sa fiche.
                    </p>
                  )
                ) : (
                  <div className="grid gap-2">
                    <Label htmlFor="user-edit-email">Email *</Label>
                    <Input
                      id="user-edit-email"
                      type="email"
                      value={editing.email || ""}
                      onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                      placeholder="email@example.com"
                      disabled={
                        isCurrentUserAdmin &&
                        !isCurrentUserSuperAdmin &&
                        editing.email === currentUserEmail
                      }
                      className={
                        isCurrentUserAdmin &&
                        !isCurrentUserSuperAdmin &&
                        editing.email === currentUserEmail
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }
                    />
                  </div>
                )}
                {editingKind !== "member" ? (
                  // À la création, le type est déjà choisi dans le sélecteur du haut.
                  editing.id && (
                    <div className="grid content-start gap-2">
                      <Label>Type de compte</Label>
                      <p className="flex h-10 items-center text-sm font-medium">
                        {getKindLabel(editingKind)}
                      </p>
                    </div>
                  )
                ) : (
                  <div className="grid gap-2">
                    <Label>Rôle *</Label>
                    <select
                      value={editing.role || "MUSICIAN"}
                      onChange={(e) => setEditing({ ...editing, role: e.target.value as UserRole })}
                      className={`flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                        isCurrentUserAdmin &&
                        !isCurrentUserSuperAdmin &&
                        editing.email === currentUserEmail
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                      disabled={
                        isCurrentUserAdmin &&
                        !isCurrentUserSuperAdmin &&
                        editing.email === currentUserEmail
                      }
                    >
                      <option value="MUSICIAN">Musicien</option>
                      <option value="ADMIN">Administrateur</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                    </select>
                  </div>
                )}
                <div className="grid gap-2">
                  <Label>Statut du compte</Label>
                  <div className="flex items-center gap-4 h-10">
                    <label
                      className={`flex items-center gap-2 ${isCurrentUserAdmin && !isCurrentUserSuperAdmin && editing.email === currentUserEmail ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <input
                        type="radio"
                        name="is_active"
                        checked={editing.is_active !== 0}
                        onChange={() => setEditing({ ...editing, is_active: 1 })}
                        className="w-4 h-4 text-primary"
                        disabled={
                          isCurrentUserAdmin &&
                          !isCurrentUserSuperAdmin &&
                          editing.email === currentUserEmail
                        }
                      />
                      <span className="text-sm">Actif</span>
                    </label>
                    <label
                      className={`flex items-center gap-2 ${isCurrentUserAdmin && !isCurrentUserSuperAdmin && editing.email === currentUserEmail ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <input
                        type="radio"
                        name="is_active"
                        checked={editing.is_active === 0}
                        onChange={() => setEditing({ ...editing, is_active: 0 })}
                        className="w-4 h-4 text-primary"
                        disabled={
                          isCurrentUserAdmin &&
                          !isCurrentUserSuperAdmin &&
                          editing.email === currentUserEmail
                        }
                      />
                      <span className="text-sm">Inactif</span>
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Un compte inactif ne pourra plus se connecter à son espace.
                  </p>
                </div>
              </div>

              {editing.id && (
                <UserGuardianLinks
                  user={editing}
                  users={users}
                  canManageAccounts={isCurrentUserSuperAdmin}
                  inEditForm
                  onLinksChanged={handleLinksChanged}
                  onAccountChanged={handleAccountChanged}
                />
              )}

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
                {showMusicianFields && (
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
                {!showMusicianFields && (
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

              {showMusicianFields && (
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
                      <div className="grid gap-2 col-span-2">
                        <Label>Instrument(s) joué(s) à l'Harmonie</Label>
                        <div
                          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2"
                          role="group"
                          aria-label="Instruments joués à l'Harmonie"
                        >
                          {HARMONIE_INSTRUMENTS.map((instrument) => {
                            const currentInstruments = editing.harmonieInstruments || [];
                            const isSelected = currentInstruments.includes(instrument);
                            return (
                              <button
                                key={instrument}
                                type="button"
                                aria-pressed={isSelected}
                                onClick={() => {
                                  const nextInstruments = isSelected
                                    ? currentInstruments.filter((i) => i !== instrument)
                                    : [...currentInstruments, instrument];
                                  setEditing({
                                    ...editing,
                                    harmonieInstruments: nextInstruments,
                                    primaryHarmonieInstrument: resolveDeclaredPrimaryInstrument(
                                      nextInstruments,
                                      editing.primaryHarmonieInstrument
                                    ),
                                  });
                                }}
                                className={`p-2 text-sm rounded border transition-colors text-left flex items-center gap-2 cursor-pointer ${
                                  isSelected
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-card border-border hover:bg-muted"
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 flex-shrink-0" />}
                                {instrument}
                              </button>
                            );
                          })}
                        </div>

                        {(() => {
                          const instruments = editing.harmonieInstruments || [];
                          if (instruments.length === 1) {
                            return (
                              <p className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                                <Star className="w-3.5 h-3.5 text-primary fill-primary flex-shrink-0" />
                                <span>
                                  <span className="font-medium text-foreground">
                                    {instruments[0]}
                                  </span>{" "}
                                  est automatiquement l'instrument principal.
                                </span>
                              </p>
                            );
                          }
                          if (instruments.length >= 2) {
                            const primary = resolveDeclaredPrimaryInstrument(
                              instruments,
                              editing.primaryHarmonieInstrument
                            );
                            return (
                              <div
                                className={cn(
                                  "rounded-lg border p-3 space-y-2 transition-colors",
                                  primary
                                    ? "border-border bg-muted/30"
                                    : "border-amber-400 bg-amber-50 dark:border-amber-500/60 dark:bg-amber-900/10"
                                )}
                              >
                                <div className="flex items-start gap-2">
                                  <Star
                                    className={cn(
                                      "w-4 h-4 mt-0.5 flex-shrink-0",
                                      primary
                                        ? "text-primary fill-primary"
                                        : "text-amber-600 dark:text-amber-500"
                                    )}
                                  />
                                  <div className="space-y-0.5">
                                    <p className="text-sm font-medium text-foreground">
                                      Instrument principal (pupitre){" "}
                                      <span className="text-red-500">*</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Plusieurs instruments sont sélectionnés : indiquez
                                      l'instrument principal de ce musicien.
                                    </p>
                                  </div>
                                </div>
                                <div
                                  className="flex flex-wrap gap-2"
                                  role="radiogroup"
                                  aria-label="Instrument principal"
                                >
                                  {instruments
                                    .slice()
                                    .sort(compareInstruments)
                                    .map((instrument) => {
                                      const checked = primary === instrument;
                                      return (
                                        <button
                                          key={instrument}
                                          type="button"
                                          role="radio"
                                          aria-checked={checked}
                                          onClick={() =>
                                            setEditing({
                                              ...editing,
                                              primaryHarmonieInstrument: instrument,
                                            })
                                          }
                                          className={cn(
                                            "px-3 py-1.5 text-sm rounded-full border transition-colors cursor-pointer",
                                            checked
                                              ? "bg-primary text-primary-foreground border-primary"
                                              : "bg-card border-border hover:bg-muted"
                                          )}
                                        >
                                          {instrument}
                                        </button>
                                      );
                                    })}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
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
                        {editing.image_consent_managed ? (
                          <ManagedImageConsentNote value={editing.image_consent} />
                        ) : (
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
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <h3 className="font-medium text-foreground mb-4">Adhésion 2026-2027</h3>
                    <div className="grid gap-2">
                      <Label>Statut adhésion</Label>
                      <div className="flex items-center gap-4 h-10">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="adhesion_2026_2027"
                            checked={editing.adhesion_2026_2027 === 1}
                            onChange={() => setEditing({ ...editing, adhesion_2026_2027: 1 })}
                            className="w-4 h-4 text-primary"
                          />
                          <span className="text-sm">Adhérent 2026-2027</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="adhesion_2026_2027"
                            checked={editing.adhesion_2026_2027 !== 1}
                            onChange={() => setEditing({ ...editing, adhesion_2026_2027: 0 })}
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
                      <InstrumentEditor
                        instruments={editing.instruments || []}
                        onChange={(instruments) => setEditing({ ...editing, instruments })}
                      />
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
            <Button
              onClick={handleSave}
              disabled={
                saving ||
                (editingKind !== "managed" && !editing?.email) ||
                // La règle suit les instruments déclarés, jamais le rôle : le chef
                // d'orchestre est un ADMIN qui joue, et il fait partie de l'effectif de
                // référence (voir src/lib/presence.ts). Le conditionner à MUSICIAN
                // laisserait passer un chef sans pupitre, refusé ensuite par l'API.
                !!(
                  (editing?.harmonieInstruments || []).length >= 2 &&
                  !resolveDeclaredPrimaryInstrument(
                    editing?.harmonieInstruments || [],
                    editing?.primaryHarmonieInstrument
                  )
                )
              }
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
                  <p className="text-sm font-medium">
                    {viewing.email ?? (
                      <span className="text-muted-foreground italic">Pas d'e-mail</span>
                    )}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Rôle</Label>
                  <p className="text-sm font-medium">
                    {viewing.role === "SUPER_ADMIN"
                      ? "Super Admin"
                      : viewing.role === "ADMIN"
                        ? "Administrateur"
                        : getKindLabel(viewingKind)}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Statut du compte</Label>
                  <p className="text-sm font-medium">
                    {viewing.is_active !== 0 ? "Actif" : "Inactif"}
                  </p>
                </div>
              </div>

              {viewingKind === "managed" && (
                <div className="grid grid-cols-2 gap-4">
                  <ManagedAccountNotice
                    userId={viewing.id}
                    name={getFullName(viewing) || "Ce musicien"}
                    guardianNames={viewing.guardian_names}
                    canGiveAccess={isCurrentUserSuperAdmin}
                    onGiven={handleAccountChanged}
                  />
                </div>
              )}

              {viewing.id && (
                <UserGuardianLinks
                  user={viewing}
                  users={users}
                  canManageAccounts={isCurrentUserSuperAdmin}
                  onLinksChanged={handleLinksChanged}
                  onAccountChanged={handleAccountChanged}
                />
              )}

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
                  {viewingIsMusician && (
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

              {viewingIsMusician && (
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
                      {viewing.harmonieInstruments && viewing.harmonieInstruments.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {viewing.harmonieInstruments.map((instrument) => {
                            const isPrimary = instrument === viewing.primaryHarmonieInstrument;
                            return (
                              <span
                                key={instrument}
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border",
                                  isPrimary
                                    ? "bg-primary/10 text-primary border-primary/30"
                                    : "bg-muted text-muted-foreground border-transparent"
                                )}
                              >
                                {isPrimary && (
                                  <Star className="w-3 h-3 fill-primary flex-shrink-0" />
                                )}
                                {instrument}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm font-medium">-</p>
                      )}
                    </div>
                    <div className="grid gap-2 mt-4">
                      <Label className="text-muted-foreground">Droit à l'image</Label>
                      {viewing.image_consent_managed ? (
                        <ManagedImageConsentNote value={viewing.image_consent} />
                      ) : (
                        <div className="flex items-center gap-2">
                          <ImageConsentBadge value={viewing.image_consent} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-border pt-4">
                    <h3 className="font-medium text-foreground mb-4">Adhésion 2026-2027</h3>
                    <div className="grid gap-2">
                      <Label className="text-muted-foreground">Statut adhésion</Label>
                      <p className="text-sm font-medium">
                        {viewing.adhesion_2026_2027 === 1 ? "Adhérent 2026-2027" : "Non adhérent"}
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
    </div>
  );
}
