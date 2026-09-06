"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, User, Users, RefreshCw, X } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { EmptyState } from "@/app/components/ui/empty-state";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Skeleton } from "@/app/components/ui/skeleton";
import { getInstrumentPriority } from "@/lib/instruments";
import {
  getAnciennete,
  sortTrombinoscopeEntries,
  type TrombinoscopeEntry,
  type TrombinoscopeSort,
} from "./trombinoscope-sort";

interface TrombinoscopeFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortBy: TrombinoscopeSort;
  onSortChange: (value: TrombinoscopeSort) => void;
  filterInstrument: string;
  onInstrumentChange: (value: string) => void;
  uniqueInstruments: string[];
}

function TrombinoscopeFilters({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  filterInstrument,
  onInstrumentChange,
  uniqueInstruments,
}: TrombinoscopeFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[200px] max-w-xs flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="text"
          placeholder="Rechercher un musicien..."
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          className="pl-9 pr-10"
          aria-label="Rechercher un musicien"
        />
        {searchQuery && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onSearchChange("")}
            className="absolute right-0.5 top-0.5"
            aria-label="Effacer la recherche"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Select value={sortBy} onValueChange={(value) => onSortChange(value as TrombinoscopeSort)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">Tri : Nom</SelectItem>
          <SelectItem value="seniority">Tri : Ancienneté</SelectItem>
          <SelectItem value="instrument">Tri : Instrument</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filterInstrument || "all"}
        onValueChange={(value) => onInstrumentChange(value === "all" ? "" : value)}
      >
        <SelectTrigger className="w-[190px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Instrument : Tous</SelectItem>
          {uniqueInstruments.map((instrument) => (
            <SelectItem key={instrument} value={instrument}>
              {instrument}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface MusicianDirectoryCardProps {
  musician: TrombinoscopeEntry;
}

function getInitials(firstName: string | null, lastName: string | null): string {
  const first = firstName ? firstName.charAt(0).toUpperCase() : "";
  const last = lastName ? lastName.charAt(0).toUpperCase() : "";
  return first + last || "?";
}

function getFullName(firstName: string | null, lastName: string | null): string {
  if (!firstName && !lastName) return "Anonyme";
  return [firstName, lastName].filter(Boolean).join(" ");
}

function MusicianDirectoryCard({ musician }: MusicianDirectoryCardProps) {
  const fullName = getFullName(musician.first_name, musician.last_name);
  const seniority = getAnciennete(musician.harmonie_start_date);

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex flex-col items-center space-y-3 p-5 text-center">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full bg-muted">
          {musician.avatar && musician.image_consent === 1 ? (
            <img src={musician.avatar} alt={fullName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-2xl font-bold text-muted-foreground">
                {getInitials(musician.first_name, musician.last_name)}
              </span>
            </div>
          )}
        </div>

        <h3 className="text-base font-semibold text-foreground">{fullName}</h3>

        {musician.instruments.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {musician.instruments.map((instrument) => (
              <Badge key={instrument} variant="primary">
                {instrument}
              </Badge>
            ))}
          </div>
        )}

        {seniority ? (
          <span className="text-sm text-muted-foreground">
            Depuis le {seniority.dateLabel}
            {seniority.durationLabel && (
              <>
                <br />
                <span>{seniority.durationLabel}</span>
              </>
            )}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Non renseignée</span>
        )}
      </CardContent>
    </Card>
  );
}

function TrombinoscopeSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <Card key={index}>
          <CardContent className="flex flex-col items-center space-y-3 p-5">
            <Skeleton variant="circle" className="h-24 w-24" />
            <Skeleton variant="text" size="md" className="w-32" />
            <div className="flex gap-1.5">
              <Skeleton variant="text" size="sm" className="w-20" />
              <Skeleton variant="text" size="sm" className="w-16" />
            </div>
            <Skeleton variant="text" size="sm" className="w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function MusicianTrombinoscopeClient() {
  const [musicians, setMusicians] = useState<TrombinoscopeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<TrombinoscopeSort>("instrument");
  const [filterInstrument, setFilterInstrument] = useState("");

  const fetchMusicians = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/musician/trombinoscope");
      if (!response.ok) {
        throw new Error("Erreur lors du chargement du trombinoscope");
      }
      const data = (await response.json()) as { musicians: TrombinoscopeEntry[] };
      setMusicians(data.musicians || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur inattendue est survenue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMusicians();
  }, [fetchMusicians]);

  const uniqueInstruments = useMemo(() => {
    const instruments = new Set<string>();
    musicians.forEach((musician) =>
      musician.instruments.forEach((instrument) => instruments.add(instrument))
    );
    return Array.from(instruments).sort((a, b) => {
      const priorityA = getInstrumentPriority(a);
      const priorityB = getInstrumentPriority(b);
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.localeCompare(b, "fr");
    });
  }, [musicians]);

  const filteredMusicians = useMemo(() => {
    let result = [...musicians];

    if (searchQuery.trim()) {
      const query = searchQuery
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      result = result.filter((musician) => {
        const firstName = (musician.first_name || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        const lastName = (musician.last_name || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        return firstName.includes(query) || lastName.includes(query);
      });
    }

    if (filterInstrument) {
      result = result.filter((musician) => musician.instruments.includes(filterInstrument));
    }

    return sortTrombinoscopeEntries(result, sortBy);
  }, [musicians, searchQuery, filterInstrument, sortBy]);

  const hasActiveFilters = searchQuery.trim() !== "" || filterInstrument !== "";

  function resetFilters() {
    setSearchQuery("");
    setFilterInstrument("");
    setSortBy("instrument");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground">
            <Users className="h-8 w-8 text-primary" />
            Trombinoscope de l'Harmonie
          </h1>
          {!loading && !error && (
            <p className="mt-1 text-muted-foreground">
              {hasActiveFilters
                ? `${filteredMusicians.length} musicien${filteredMusicians.length > 1 ? "s" : ""} trouvé${filteredMusicians.length > 1 ? "s" : ""}`
                : `${musicians.length} musicien${musicians.length > 1 ? "s" : ""}`}
            </p>
          )}
        </div>
      </div>

      {!loading && !error && musicians.length > 0 && (
        <TrombinoscopeFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          filterInstrument={filterInstrument}
          onInstrumentChange={setFilterInstrument}
          uniqueInstruments={uniqueInstruments}
        />
      )}

      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {filteredMusicians.length} résultat{filteredMusicians.length > 1 ? "s" : ""}
            {searchQuery.trim() ? ` pour « ${searchQuery.trim()} »` : ""}
          </span>
          <Button type="button" variant="link" size="sm" onClick={resetFilters}>
            Réinitialiser
          </Button>
        </div>
      )}

      {loading && <TrombinoscopeSkeleton />}

      {error && !loading && (
        <EmptyState
          icon={<User className="h-8 w-8" />}
          title={error}
          action={
            <Button type="button" onClick={fetchMusicians}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Réessayer
            </Button>
          }
        />
      )}

      {!loading && !error && musicians.length === 0 && (
        <EmptyState icon={<Users className="h-8 w-8" />} title="Aucun musicien trouvé" />
      )}

      {!loading && !error && musicians.length > 0 && filteredMusicians.length === 0 && (
        <EmptyState
          icon={<Search className="h-8 w-8" />}
          title="Aucun musicien ne correspond à votre recherche."
          action={
            <Button type="button" onClick={resetFilters}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Réinitialiser les filtres
            </Button>
          }
        />
      )}

      {!loading && !error && filteredMusicians.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredMusicians.map((musician) => (
            <MusicianDirectoryCard key={musician.user_id} musician={musician} />
          ))}
        </div>
      )}
    </div>
  );
}
