"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { MessageCircle } from "lucide-react";
import type { IdeaWithLikes } from "@/db/types";
import { formatIdeaDate } from "./idea-filters";

interface IdeaResponseDialogProps {
  open: boolean;
  idea: IdeaWithLikes | null;
  onOpenChange: (open: boolean) => void;
}

export function IdeaResponseDialog({ idea, open, onOpenChange }: IdeaResponseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Réponse du bureau</DialogTitle>
        </DialogHeader>
        {idea && (
          <div className="space-y-4 py-4">
            <div>
              <p className="mb-1 text-sm font-medium text-muted-foreground">Votre idée</p>
              <p className="text-base font-semibold text-foreground">{idea.title}</p>
            </div>
            <div className="rounded-md bg-muted p-4">
              <p className="whitespace-pre-wrap text-sm text-foreground">{idea.admin_notes}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              <span>{formatIdeaDate(idea.created_at)}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
