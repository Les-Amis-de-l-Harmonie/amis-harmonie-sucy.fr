import { Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { SocialIcons } from "@/app/components/SocialIcons";
import { LockedCardOverlay } from "./LockedCardOverlay";
import { LockableCardBody } from "./LockableCardBody";
import type { Video } from "@/db/types";

interface SocialCardProps {
  profileComplete: boolean;
  firstVideo: Video | null;
  onVideoClick: (video: Video) => void;
}

export function SocialCard({ profileComplete, firstVideo, onVideoClick }: SocialCardProps) {
  const locked = !profileComplete;

  return (
    <Card className="relative flex min-h-[220px] flex-col">
      <LockableCardBody locked={locked}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" aria-hidden="true" />
            Suivez-nous
          </CardTitle>
          <CardDescription>Soutenez votre orchestre préféré !</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-between">
          <div className="flex flex-1 flex-col">
            <SocialIcons iconSize={28} />
            {firstVideo && (
              <div
                className="group relative mt-3 max-h-[120px] cursor-pointer overflow-hidden rounded-lg"
                onClick={() => onVideoClick(firstVideo)}
              >
                <img
                  src={`https://i.ytimg.com/vi/${firstVideo.youtube_id}/mqdefault.jpg`}
                  alt={firstVideo.title}
                  className="aspect-video h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      `https://i.ytimg.com/vi/${firstVideo.youtube_id}/default.jpg`;
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/40">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive shadow-lg transition-transform group-hover:scale-110">
                    <svg
                      className="ml-0.5 h-4 w-4 text-destructive-foreground"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </LockableCardBody>
      {locked && <LockedCardOverlay reason="profile" />}
    </Card>
  );
}
