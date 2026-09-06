"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Heart } from "lucide-react";
import type { IdeaWithLikes } from "@/db/types";

interface IdeaLikersDialogProps {
  open: boolean;
  idea: IdeaWithLikes | null;
  onOpenChange: (open: boolean) => void;
}

export function IdeaLikersDialog({ idea, open, onOpenChange }: IdeaLikersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Personnes qui ont aimé cette idée</DialogTitle>
        </DialogHeader>
        {idea && (
          <div className="py-4">
            <p className="mb-3 text-sm font-medium text-foreground">{idea.title}</p>
            {idea.likers && idea.likers.length > 0 ? (
              <ul className="space-y-2">
                {idea.likers.map((liker, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-foreground">
                    <Heart className="h-4 w-4 text-destructive" />
                    <span>
                      {liker.first_name && liker.last_name
                        ? `${liker.first_name} ${liker.last_name}`
                        : "Un musicien"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun like pour le moment.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
