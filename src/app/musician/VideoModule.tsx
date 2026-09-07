import { Play, Users } from "lucide-react";
import { Skeleton } from "@/app/components/ui/skeleton";
import { SocialIcons } from "@/app/components/SocialIcons";
import type { Video } from "@/db/types";

interface VideoModuleProps {
  loading: boolean;
  video: Video | null;
  onVideoClick: (video: Video) => void;
}

/**
 * Remplace `SocialCard`, sans verrou. Le contenu réel (miniature de la
 * dernière vidéo) reste au centre du module — les icônes sociales
 * l'accompagnent plutôt que de le remplacer, contrairement à l'ancienne
 * carte qui les affichait même sans vidéo disponible.
 */
export function VideoModule({ loading, video, onVideoClick }: VideoModuleProps) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" aria-hidden="true" />
          <h3 className="font-heading text-base font-bold text-foreground">Suivez-nous</h3>
        </div>
        <SocialIcons iconSize={20} />
      </div>

      {loading ? (
        <Skeleton className="aspect-video w-full rounded-lg" aria-hidden="true" />
      ) : video ? (
        <button
          type="button"
          onClick={() => onVideoClick(video)}
          className="group text-left"
          aria-label={`Regarder la vidéo : ${video.title}`}
        >
          <div className="relative overflow-hidden rounded-lg">
            <img
              src={`https://i.ytimg.com/vi/${video.youtube_id}/mqdefault.jpg`}
              alt=""
              className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:group-hover:scale-100"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  `https://i.ytimg.com/vi/${video.youtube_id}/default.jpg`;
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive shadow-lg transition-transform group-hover:scale-110 motion-reduce:group-hover:scale-100">
                <Play
                  className="ml-0.5 h-5 w-5 fill-destructive-foreground text-destructive-foreground"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
          <p className="mt-2 truncate text-sm font-medium text-foreground">{video.title}</p>
        </button>
      ) : (
        <p className="text-sm text-muted-foreground">Aucune vidéo disponible pour le moment.</p>
      )}
    </div>
  );
}
