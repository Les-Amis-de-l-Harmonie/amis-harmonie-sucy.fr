"use client";

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
import { Loader2 } from "lucide-react";
import type { IdeaWithLikes } from "@/db/types";
import { delegatedIdeasMessage } from "./idea-delegation";

interface DeleteIdeaDialogProps {
  open: boolean;
  idea: IdeaWithLikes | null;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  /** Un responsable agit pour un enfant : la suppression n'est pas possible. */
  readOnly?: boolean;
  actingForName?: string | null;
}

export function DeleteIdeaDialog({
  open,
  idea,
  deleting,
  onOpenChange,
  onConfirm,
  readOnly = false,
  actingForName = null,
}: DeleteIdeaDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer l'idée ?</AlertDialogTitle>
          <AlertDialogDescription>
            {readOnly
              ? delegatedIdeasMessage(actingForName)
              : `Cette action est irréversible. L'idée « ${idea?.title ?? ""} » sera définitivement supprimée.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={deleting || readOnly}
            className="bg-destructive hover:bg-destructive/90"
          >
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
