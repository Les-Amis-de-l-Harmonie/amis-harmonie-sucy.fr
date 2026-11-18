export type SwitchProfileResult = { ok: true } | { ok: false; error: string };

const DEFAULT_ERROR = "Impossible de changer de profil pour le moment. Veuillez réessayer.";

/**
 * Demande au serveur d'agir pour un autre profil (`null` = revenir à « Moi »).
 * Ne recharge pas la page : l'appelant le fait après un succès, pour que les
 * pages et leurs données suivent la nouvelle session.
 */
export async function switchMusicianProfile(userId: number | null): Promise<SwitchProfileResult> {
  try {
    const response = await fetch("/api/musician/acting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (response.ok) return { ok: true };
    let message = DEFAULT_ERROR;
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // Corps absent ou illisible : on garde le message par défaut.
    }
    return { ok: false, error: message };
  } catch {
    return { ok: false, error: DEFAULT_ERROR };
  }
}

/** Isolé pour pouvoir être remplacé dans les tests (happy-dom ne recharge rien). */
export function reloadPage(): void {
  window.location.reload();
}
