"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
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
import { HardDrive, Trash2, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";

interface CleanupResult {
  dry_run: boolean;
  total_r2_objects: number;
  referenced_in_db: number;
  orphans_found: number;
  orphans: string[];
  kept: number;
  deleted: number;
}

export function R2CleanupClient() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setDeleteSuccess(false);
    try {
      const res = await fetch("/api/admin/r2-cleanup?dry_run=true");
      if (!res.ok) throw new Error("Erreur lors de l'analyse");
      const data: CleanupResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const runDelete = async () => {
    setShowConfirm(false);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/r2-cleanup?dry_run=false");
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      const data: CleanupResult = await res.json();
      setResult(data);
      setDeleteSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <HardDrive className="w-5 h-5" />
          Stockage R2
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Analysez le stockage R2 pour détecter les fichiers orphelins (non référencés en base de données).
        </p>

        <Button
          onClick={runAnalysis}
          disabled={loading}
          variant="outline"
          className="w-full sm:w-auto"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Analyser
        </Button>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {deleteSuccess && result && (
          <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-700 dark:text-green-300">
              {result.deleted} fichier{result.deleted > 1 ? "s" : ""} orphelin{result.deleted > 1 ? "s" : ""} supprimé{result.deleted > 1 ? "s" : ""}.
            </p>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{result.total_r2_objects}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Objets R2</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{result.referenced_in_db}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Référencés en BDD</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{result.kept}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Conservés</div>
              </div>
              <div className={`p-3 rounded-lg text-center ${result.orphans_found > 0 ? "bg-orange-50 dark:bg-orange-900/30" : "bg-green-50 dark:bg-green-900/30"}`}>
                <div className={`text-2xl font-bold ${result.orphans_found > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"}`}>
                  {result.orphans_found}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Orphelins</div>
              </div>
            </div>

            {result.dry_run && result.orphans_found > 0 && (
              <>
                <div className="p-3 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                      Fichiers orphelins détectés
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      {result.orphans.map((key) => (
                        <li key={key} className="font-mono truncate">{key}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <Button
                  onClick={() => setShowConfirm(true)}
                  variant="destructive"
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer {result.orphans_found} orphelin{result.orphans_found > 1 ? "s" : ""}
                </Button>
              </>
            )}

            {result.dry_run && result.orphans_found === 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                <p className="text-sm text-green-700 dark:text-green-300">
                  Aucun fichier orphelin. Le stockage R2 est propre.
                </p>
              </div>
            )}
          </div>
        )}

        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Vous êtes sur le point de supprimer {result?.orphans_found || 0} fichier{(result?.orphans_found || 0) > 1 ? "s" : ""} orphelin{(result?.orphans_found || 0) > 1 ? "s" : ""} du stockage R2.
                Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={runDelete} className="bg-red-600 hover:bg-red-700 text-white">
                Supprimer définitivement
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
