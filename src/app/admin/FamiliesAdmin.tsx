"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarX,
  CheckCircle2,
  Mail,
  Phone,
  Printer,
  Search,
  UserRoundCog,
  UserX,
  Users,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { EmptyState } from "@/app/components/ui/empty-state";
import { Input } from "@/app/components/ui/input";
import { Skeleton } from "@/app/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  buildFamiliesModel,
  countAttention,
  totalAttention,
  userAdminHref,
  type AttentionLists,
  type Family,
  type FamilyChild,
  type FamilyGuardian,
  type FamilyMember,
  type GuardianLink,
  type PrintRow,
} from "./families";
import { matchesUserSearch, type UserWithProfile } from "./users-shared";

type View = "familles" | "a-verifier" | "mineurs";

const VIEWS: { id: View; label: string }[] = [
  { id: "familles", label: "Familles" },
  { id: "a-verifier", label: "À vérifier" },
  { id: "mineurs", label: "Liste des mineurs" },
];

function initialView(): View {
  if (typeof window === "undefined") return "familles";
  const requested = new URLSearchParams(window.location.search).get("vue");
  return VIEWS.some((view) => view.id === requested) ? (requested as View) : "familles";
}

function formatAge(age: number | null): string {
  if (age === null) return "âge inconnu";
  return age <= 1 ? `${age} an` : `${age} ans`;
}

function formatToday(): string {
  return new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// --- Petits éléments partagés -----------------------------------------------------

function KindBadge({ member }: { member: FamilyMember }) {
  if (member.kind === "managed") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
        title="Pas de connexion : ses responsables agissent pour lui"
      >
        <UserRoundCog className="h-3 w-3" aria-hidden="true" />
        Géré
      </span>
    );
  }
  if (member.kind === "guardian") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
        <Users className="h-3 w-3" aria-hidden="true" />
        Responsable
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
      Musicien
    </span>
  );
}

function InactiveMark({ member }: { member: FamilyMember }) {
  if (member.isActive) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-200">
      Inactif
    </span>
  );
}

function MemberLink({ member, className }: { member: FamilyMember; className?: string }) {
  return (
    <a
      href={userAdminHref(member.id)}
      className={cn("font-medium text-foreground hover:underline", className)}
      title="Ouvrir la fiche dans les utilisateurs"
    >
      {member.name}
    </a>
  );
}

function ContactLines({ member }: { member: FamilyMember }) {
  const phone = member.user.phone?.trim();
  const email = member.user.email;
  if (!phone && !email) {
    return <p className="text-xs italic text-muted-foreground">Aucune coordonnée</p>;
  }
  return (
    <div className="space-y-0.5 text-xs text-muted-foreground">
      {phone && (
        <p className="flex items-center gap-1.5">
          <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
          <a href={`tel:${phone.replace(/\s+/g, "")}`} className="hover:underline">
            {phone}
          </a>
        </p>
      )}
      {email && (
        <p className="flex items-center gap-1.5 min-w-0">
          <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
          <a href={`mailto:${email}`} className="truncate hover:underline">
            {email}
          </a>
        </p>
      )}
    </div>
  );
}

// --- Vue « Familles » -------------------------------------------------------------

function GuardianBlock({ guardian }: { guardian: FamilyGuardian }) {
  return (
    <li className="space-y-1">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <MemberLink member={guardian} />
        {guardian.relations.length > 0 && (
          <span className="text-muted-foreground">· {guardian.relations.join(", ")}</span>
        )}
        {guardian.kind !== "guardian" && <KindBadge member={guardian} />}
        <InactiveMark member={guardian} />
      </p>
      <ContactLines member={guardian} />
    </li>
  );
}

function ChildRow({ child, showGuardians }: { child: FamilyChild; showGuardians: boolean }) {
  return (
    <li className="space-y-0.5">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <MemberLink member={child} />
        <span className="text-muted-foreground">{formatAge(child.age)}</span>
        <KindBadge member={child} />
        <InactiveMark member={child} />
      </p>
      {showGuardians && child.guardians.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {child.guardians
            .map(({ member, relation }) =>
              relation ? `${member.name} (${relation})` : member.name
            )
            .join(", ")}
        </p>
      )}
    </li>
  );
}

function FamilyCard({ family }: { family: Family }) {
  // Quand un seul responsable est lié à tous les enfants, le détail par enfant est
  // redondant : on ne l'affiche que si la famille compte plusieurs responsables.
  const showGuardians = family.guardians.length > 1;
  return (
    <Card className="print:break-inside-avoid">
      <CardContent className="space-y-4 p-4">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {family.guardians.length > 1 ? "Responsables" : "Responsable"}
          </h3>
          <ul className="space-y-3">
            {family.guardians.map((guardian) => (
              <GuardianBlock key={guardian.id} guardian={guardian} />
            ))}
          </ul>
        </div>
        <div className="border-t border-border pt-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {family.children.length > 1 ? "Enfants" : "Enfant"}
          </h3>
          <ul className="space-y-2.5">
            {family.children.map((child) => (
              <ChildRow key={child.id} child={child} showGuardians={showGuardians} />
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function FamiliesView({ families, users }: { families: Family[]; users: UserWithProfile[] }) {
  const [query, setQuery] = useState("");
  const usersById = useMemo(() => {
    const map = new Map<number, UserWithProfile>();
    for (const user of users) if (user.id !== undefined) map.set(user.id, user);
    return map;
  }, [users]);

  const visible = useMemo(() => {
    if (!query.trim()) return families;
    return families.filter((family) =>
      [...family.guardians, ...family.children].some((member) => {
        const user = usersById.get(member.id);
        return user ? matchesUserSearch(user, query, { includeRelations: false }) : false;
      })
    );
  }, [families, query, usersById]);

  if (families.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="Aucune famille pour le moment"
            description="Les familles apparaissent dès qu'un responsable légal est lié à un musicien, depuis la fiche du musicien."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher un parent ou un enfant"
          aria-label="Rechercher une famille"
          className="pl-9"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {visible.length} famille{visible.length > 1 ? "s" : ""}
        {query.trim() ? ` sur ${families.length}` : ""}
      </p>
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune famille ne correspond.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {visible.map((family) => (
            <FamilyCard key={family.key} family={family} />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Vue « À vérifier » -----------------------------------------------------------

interface AttentionSectionProps {
  title: string;
  hint: string;
  icon: React.ReactNode;
  members: (FamilyMember & { guardianNames?: string })[];
  detail?: (member: FamilyMember & { guardianNames?: string }) => string;
  testId: string;
}

function AttentionSection({ title, hint, icon, members, detail, testId }: AttentionSectionProps) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="space-y-1 pb-3">
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span className="flex items-center gap-2">
            {icon}
            {title}
          </span>
          <span
            className={cn(
              "inline-flex min-w-7 items-center justify-center rounded-full px-2 py-0.5 text-sm font-semibold tabular-nums",
              members.length > 0
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
            )}
            aria-label={`${members.length} à vérifier`}
          >
            {members.length}
          </span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardHeader>
      <CardContent className="pt-0">
        {members.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Rien à signaler.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2 text-sm"
              >
                <span className="min-w-0">
                  <MemberLink member={member} />
                  <span className="ml-2 text-muted-foreground">{formatAge(member.age)}</span>
                  {detail && (
                    <span className="block text-xs text-muted-foreground">{detail(member)}</span>
                  )}
                </span>
                <a
                  href={userAdminHref(member.id)}
                  className="shrink-0 text-xs font-medium text-foreground underline underline-offset-2 hover:text-primary"
                >
                  Ouvrir la fiche
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AttentionView({ attention }: { attention: AttentionLists }) {
  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
      <AttentionSection
        testId="attention-minors"
        title="Mineurs sans responsable"
        hint="Moins de 18 ans, aucun responsable légal lié."
        icon={<UserX className="h-4 w-4 text-amber-600" aria-hidden="true" />}
        members={attention.minorsWithoutGuardian}
      />
      <AttentionSection
        testId="attention-birthdate"
        title="Date de naissance manquante"
        hint="Impossible de savoir si le musicien est mineur."
        icon={<CalendarX className="h-4 w-4 text-amber-600" aria-hidden="true" />}
        members={attention.missingBirthDate}
      />
      <AttentionSection
        testId="attention-managed"
        title="Comptes gérés sans responsable"
        hint="Pas de connexion et personne pour agir à sa place."
        icon={<UserRoundCog className="h-4 w-4 text-amber-600" aria-hidden="true" />}
        members={attention.managedWithoutGuardian}
      />
      <AttentionSection
        testId="attention-adults"
        title="Majeurs encore reliés"
        hint="Ont 18 ans ou plus : retirer le responsable ou lui donner un accès personnel."
        icon={<AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />}
        members={attention.adultsStillLinked}
        detail={(member) => (member.guardianNames ? `Responsable : ${member.guardianNames}` : "")}
      />
    </div>
  );
}

// --- Vue « Liste des mineurs » (impression) ---------------------------------------

function PrintTable({ rows }: { rows: PrintRow[] }) {
  return (
    <table className="w-full border-collapse text-sm print:text-xs">
      <thead className="print:table-header-group">
        <tr className="border-b-2 border-border text-left print:border-black">
          <th className="px-2 py-2 font-semibold">Musicien</th>
          <th className="px-2 py-2 font-semibold">Âge</th>
          <th className="px-2 py-2 font-semibold">Responsable</th>
          <th className="px-2 py-2 font-semibold">Téléphone</th>
          <th className="px-2 py-2 font-semibold">E-mail</th>
          <th className="px-2 py-2 font-semibold">Contact d&apos;urgence</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const guardianRows = row.guardians.length > 0 ? row.guardians : [null];
          return guardianRows.map((guardian, index) => (
            <tr
              key={`${row.child.id}-${index}`}
              className={cn(
                "align-top print:break-inside-avoid",
                index === guardianRows.length - 1
                  ? "border-b border-border print:border-gray-400"
                  : ""
              )}
            >
              {index === 0 && (
                <>
                  <td className="px-2 py-1.5 font-medium" rowSpan={guardianRows.length}>
                    {row.child.name}
                    {row.child.kind === "managed" && (
                      <span className="block text-xs font-normal text-muted-foreground print:text-gray-600">
                        sans connexion
                      </span>
                    )}
                  </td>
                  <td
                    className="whitespace-nowrap px-2 py-1.5 tabular-nums"
                    rowSpan={guardianRows.length}
                  >
                    {row.child.age === null ? "?" : row.child.age}
                  </td>
                </>
              )}
              {guardian ? (
                <>
                  <td className="px-2 py-1.5">
                    {guardian.name}
                    {guardian.relation && (
                      <span className="text-muted-foreground print:text-gray-600">
                        {" "}
                        ({guardian.relation})
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">
                    {guardian.phone ?? "—"}
                  </td>
                  <td className="px-2 py-1.5 break-all">{guardian.email ?? "—"}</td>
                </>
              ) : (
                <td
                  colSpan={3}
                  className="px-2 py-1.5 italic text-muted-foreground print:text-gray-600"
                >
                  Aucun responsable lié
                </td>
              )}
              {index === 0 && (
                <td className="px-2 py-1.5" rowSpan={guardianRows.length}>
                  {row.emergency ? (
                    <>
                      {row.emergency.name || "—"}
                      {row.emergency.phone && (
                        <span className="block whitespace-nowrap tabular-nums">
                          {row.emergency.phone}
                        </span>
                      )}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              )}
            </tr>
          ));
        })}
      </tbody>
    </table>
  );
}

// Le fond gris de la page (thème) ne doit pas sortir sur le papier, et la feuille est en A4.
const PRINT_PAGE_CSS =
  "@page { size: A4 portrait; margin: 12mm; } @media print { html, body, html.dark, html.dark body { background: #fff !important; } }";

function MinorsView({ rows }: { rows: PrintRow[] }) {
  return (
    <div className="space-y-4 print:space-y-3">
      <style>{PRINT_PAGE_CSS}</style>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground print:text-lg print:text-black">
            Mineurs et téléphones des parents
          </h2>
          <p className="text-sm text-muted-foreground print:text-gray-700">
            Mis à jour le {formatToday()} · {rows.length} musicien{rows.length > 1 ? "s" : ""}
          </p>
        </div>
        <Button type="button" onClick={() => window.print()} className="print:hidden">
          <Printer className="mr-2 h-4 w-4" />
          Imprimer
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun mineur ni enfant relié à un responsable pour le moment.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card print:overflow-visible print:rounded-none print:border-0 print:bg-white print:text-black">
          <PrintTable rows={rows} />
        </div>
      )}
      <p className="text-xs text-muted-foreground print:hidden">
        La liste comprend les musiciens de moins de 18 ans et ceux qui ont encore un responsable
        lié. Le contact d&apos;urgence vient de la fiche du musicien.
      </p>
    </div>
  );
}

// --- Page -------------------------------------------------------------------------

function isLinksPayload(value: unknown): value is { links: GuardianLink[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "links" in value &&
    Array.isArray((value as { links: unknown }).links)
  );
}

export function FamiliesAdminClient() {
  const [users, setUsers] = useState<UserWithProfile[] | null>(null);
  const [links, setLinks] = useState<GuardianLink[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("familles");

  useEffect(() => {
    setView(initialView());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [usersResponse, linksResponse] = await Promise.all([
          fetch("/api/admin/users"),
          fetch("/api/admin/guardians"),
        ]);
        if (!usersResponse.ok || !linksResponse.ok) throw new Error("Chargement impossible");
        const usersData = (await usersResponse.json()) as UserWithProfile[];
        const linksData: unknown = await linksResponse.json();
        if (!Array.isArray(usersData) || !isLinksPayload(linksData)) {
          throw new Error("Réponse inattendue");
        }
        if (!cancelled) {
          setUsers(usersData);
          setLinks(linksData.links);
        }
      } catch (loadError) {
        console.error("Erreur lors du chargement des familles :", loadError);
        if (!cancelled) setError("Impossible de charger les familles. Réessayez dans un instant.");
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const model = useMemo(() => (users ? buildFamiliesModel(users, links) : null), [users, links]);
  const attentionTotal = model ? totalAttention(countAttention(model.attention)) : 0;

  const changeView = (next: View) => {
    setView(next);
    const url = new URL(window.location.href);
    if (next === "familles") url.searchParams.delete("vue");
    else url.searchParams.set("vue", next);
    window.history.replaceState(null, "", url);
  };

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <h1 className="text-3xl font-bold text-foreground">Familles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Les responsables légaux et leurs enfants, et ce qui reste à vérifier.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Vues de la page Familles"
        className="flex flex-wrap gap-2 print:hidden"
      >
        {VIEWS.map((item) => {
          const selected = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => changeView(item.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-muted"
              )}
            >
              {item.label}
              {item.id === "a-verifier" && attentionTotal > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs font-semibold tabular-nums",
                    selected ? "bg-white/25" : "bg-amber-100 text-amber-800"
                  )}
                >
                  {attentionTotal}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
        >
          {error}
        </div>
      ) : !model ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : view === "familles" ? (
        <FamiliesView families={model.families} users={users ?? []} />
      ) : view === "a-verifier" ? (
        <AttentionView attention={model.attention} />
      ) : (
        <MinorsView rows={model.printRows} />
      )}
    </div>
  );
}
