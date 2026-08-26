"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Users, User, RefreshCw, Loader2, Search, X } from "lucide-react";
import { getInstrumentPriority } from "@/lib/instruments";

interface TrombinoscopeEntry {
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  avatar: string | null;
  harmonie_start_date: string | null;
  instruments: string[];
  image_consent: number;
}

function getAnciennete(startDate: string | null) {
  if (!startDate) return <span className="text-sm text-gray-500 dark:text-gray-400">Non renseignée</span>;
  const start = new Date(startDate);
  const now = new Date();

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();

  if (now.getDate() < start.getDate()) {
    months--;
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const dateStr = start.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} an${years > 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} mois`);
  const duree = parts.length > 0 ? `(${parts.join(" et ")})` : null;

  return (
    <span className="text-sm text-gray-500 dark:text-gray-400">
      Depuis le {dateStr}
      {duree && <br />}
      {duree && <span>{duree}</span>}
    </span>
  );
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

export function MusicianTrombinoscopeClient() {
  const [musicians, setMusicians] = useState<TrombinoscopeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "seniority" | "instrument">("instrument");
  const [filterInstrument, setFilterInstrument] = useState<string>("");

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
      setError(
        err instanceof Error ? err.message : "Une erreur inattendue est survenue"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMusicians();
  }, [fetchMusicians]);

  const uniqueInstruments = useMemo(() => {
    const set = new Set<string>();
    musicians.forEach((m) => m.instruments.forEach((i) => set.add(i)));
    return Array.from(set).sort((a, b) => {
      const prioA = getInstrumentPriority(a);
      const prioB = getInstrumentPriority(b);
      if (prioA !== prioB) return prioA - prioB;
      return a.localeCompare(b, "fr");
    });
  }, [musicians]);

  const filteredMusicians = useMemo(() => {
    let result = [...musicians];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      result = result.filter((m) => {
        const firstName = (m.first_name || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        const lastName = (m.last_name || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        return firstName.includes(q) || lastName.includes(q);
      });
    }

    // Filter by instrument
    if (filterInstrument) {
      result = result.filter((m) => m.instruments.includes(filterInstrument));
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "name") {
        const nameA = (a.last_name || "").toLowerCase();
        const nameB = (b.last_name || "").toLowerCase();
        if (nameA !== nameB) return nameA.localeCompare(nameB, "fr");
        const firstA = (a.first_name || "").toLowerCase();
        const firstB = (b.first_name || "").toLowerCase();
        return firstA.localeCompare(firstB, "fr");
      }
      if (sortBy === "seniority") {
        if (!a.harmonie_start_date && !b.harmonie_start_date) return 0;
        if (!a.harmonie_start_date) return 1;
        if (!b.harmonie_start_date) return -1;
        return a.harmonie_start_date.localeCompare(b.harmonie_start_date);
      }
      if (sortBy === "instrument") {
        const aHasInstruments = a.instruments.length > 0;
        const bHasInstruments = b.instruments.length > 0;
        if (aHasInstruments !== bHasInstruments) return aHasInstruments ? -1 : 1;
        if (!aHasInstruments) {
          const nameA = (a.last_name || "").toLowerCase();
          const nameB = (b.last_name || "").toLowerCase();
          if (nameA !== nameB) return nameA.localeCompare(nameB, "fr");
          const firstA = (a.first_name || "").toLowerCase();
          const firstB = (b.first_name || "").toLowerCase();
          return firstA.localeCompare(firstB, "fr");
        }
        const prioA = Math.min(...a.instruments.map(getInstrumentPriority));
        const prioB = Math.min(...b.instruments.map(getInstrumentPriority));
        if (prioA !== prioB) return prioA - prioB;
        const bestInstA = a.instruments.reduce((best, i) =>
          getInstrumentPriority(i) < getInstrumentPriority(best) ? i : best
        );
        const bestInstB = b.instruments.reduce((best, i) =>
          getInstrumentPriority(i) < getInstrumentPriority(best) ? i : best
        );
        if (bestInstA !== bestInstB) return bestInstA.localeCompare(bestInstB, "fr");
        const nameA = (a.last_name || "").toLowerCase();
        const nameB = (b.last_name || "").toLowerCase();
        if (nameA !== nameB) return nameA.localeCompare(nameB, "fr");
        const firstA = (a.first_name || "").toLowerCase();
        const firstB = (b.first_name || "").toLowerCase();
        return firstA.localeCompare(firstB, "fr");
      }
      return 0;
    });

    return result;
  }, [musicians, searchQuery, filterInstrument, sortBy]);

  const hasActiveFilters = searchQuery.trim() !== "" || filterInstrument !== "";

  function resetFilters() {
    setSearchQuery("");
    setFilterInstrument("");
    setSortBy("instrument");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Trombinoscope de l'Harmonie
          </h1>
          {!loading && !error && (
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {hasActiveFilters
                ? `${filteredMusicians.length} musicien${filteredMusicians.length > 1 ? "s" : ""} trouvé${filteredMusicians.length > 1 ? "s" : ""}`
                : `${musicians.length} musicien${musicians.length > 1 ? "s" : ""}`}
            </p>
          )}
        </div>
      </div>

      {/* Search, Sort, Filter bar */}
      {!loading && !error && musicians.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Search input */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher un musicien..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort select */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "name" | "seniority" | "instrument")}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="name">Tri : Nom</option>
            <option value="seniority">Tri : Ancienneté</option>
            <option value="instrument">Tri : Instrument</option>
          </select>

          {/* Instrument filter select */}
          <select
            value={filterInstrument}
            onChange={(e) => setFilterInstrument(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Instrument : Tous</option>
            {uniqueInstruments.map((inst) => (
              <option key={inst} value={inst}>
                {inst}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Active filters indicator */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span>
            {filteredMusicians.length} résultat{filteredMusicians.length > 1 ? "s" : ""}
            {searchQuery.trim() ? ` pour « ${searchQuery.trim()} »` : ""}
          </span>
          <button
            onClick={resetFilters}
            className="text-primary hover:text-primary/80 underline underline-offset-2 text-sm font-medium"
          >
            Réinitialiser
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <div className="p-4 rounded-full bg-red-50 dark:bg-red-900/20">
            <User className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-red-600 dark:text-red-400 text-lg font-medium">{error}</p>
          <button
            onClick={fetchMusicians}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
        </div>
      )}

      {/* Empty state (no musicians at all) */}
      {!loading && !error && musicians.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            Aucun musicien trouvé
          </p>
        </div>
      )}

      {/* Empty filtered state */}
      {!loading && !error && musicians.length > 0 && filteredMusicians.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            Aucun musicien ne correspond à votre recherche.
          </p>
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Réinitialiser les filtres
          </button>
        </div>
      )}

      {/* Musician grid */}
      {!loading && !error && filteredMusicians.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMusicians.map((musician) => (
            <div
              key={musician.user_id}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex flex-col items-center text-center space-y-3 transition-shadow hover:shadow-md"
            >
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                {musician.avatar && musician.image_consent === 1 ? (
                  <img
                    src={musician.avatar}
                    alt={getFullName(musician.first_name, musician.last_name)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-400 dark:text-gray-500">
                      {getInitials(musician.first_name, musician.last_name)}
                    </span>
                  </div>
                )}
              </div>

              {/* Name */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                  {getFullName(musician.first_name, musician.last_name)}
                </h3>
              </div>

              {/* Instruments */}
              {musician.instruments.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {musician.instruments.map((instrument, idx) => (
                    <span
                      key={idx}
                      className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                    >
                      {instrument}
                    </span>
                  ))}
                </div>
              )}

              {/* Seniority */}
              {getAnciennete(musician.harmonie_start_date)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
