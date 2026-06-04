"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, User, RefreshCw, Loader2 } from "lucide-react";

interface TrombinoscopeEntry {
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  avatar: string | null;
  harmonie_start_date: string | null;
  instruments: string[];
  image_consent: number;
}

function getAnciennete(startDate: string | null): string {
  if (!startDate) return "Non renseignée";
  const start = new Date(startDate);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  if (
    now.getMonth() < start.getMonth() ||
    (now.getMonth() === start.getMonth() && now.getDate() < start.getDate())
  ) {
    years--;
  }
  if (years < 1) return "Moins d'un an";
  return `${years} an${years > 1 ? "s" : ""}`;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Trombinoscope de l'Harmonie
          </h1>
          {!loading && !error && (
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {musicians.length} musicien{musicians.length > 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

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

      {/* Empty state */}
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

      {/* Musician grid */}
      {!loading && !error && musicians.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {musicians.map((musician) => (
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
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {getAnciennete(musician.harmonie_start_date)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
