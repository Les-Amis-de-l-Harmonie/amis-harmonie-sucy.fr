"use client";

import { useEffect, useState } from "react";
import { Globe, Loader2, Lock, Send } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import type { IdeaCategory } from "@/db/types";
import { CATEGORY_LABELS } from "./idea-filters";

interface IdeaComposerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: () => void;
}

interface IdeaFormData {
  title: string;
  description: string;
  category: IdeaCategory | "";
  is_public: boolean;
}

export function IdeaComposerDialog({ open, onOpenChange, onSubmitted }: IdeaComposerDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<IdeaFormData>({
    title: "",
    description: "",
    category: "",
    is_public: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!submitted) return;
    const timeoutId = window.setTimeout(() => {
      setSubmitted(false);
      onOpenChange(false);
    }, 3000);
    return () => window.clearTimeout(timeoutId);
  }, [onOpenChange, submitted]);

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = "Le titre est obligatoire";
    if (!formData.description.trim()) newErrors.description = "La description est obligatoire";
    if (!formData.category) newErrors.category = "La catégorie est obligatoire";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/musician/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          is_public: formData.is_public,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setErrors({ submit: data.error || "Une erreur est survenue" });
        return;
      }

      setSubmitted(true);
      setErrors({});
      setFormData({ title: "", description: "", category: "", is_public: false });
      onSubmitted();
    } catch (error) {
      console.error("Error submitting idea:", error);
      setErrors({ submit: "Erreur lors de l'envoi" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{submitted ? "Idée envoyée avec succès !" : "Nouvelle idée"}</DialogTitle>
          <DialogDescription>
            {submitted
              ? "Merci pour votre contribution. Votre idée sera examinée par le bureau."
              : "Décrivez votre idée en détail pour nous aider à l'évaluer."}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div role="status" className="flex flex-col items-center justify-center py-8 text-center">
            <Send className="mb-4 h-16 w-16 text-success" />
            <p className="text-sm text-muted-foreground">La fenêtre se fermera automatiquement.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {errors.submit && (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
              >
                {errors.submit}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="idea-category">
                Catégorie <span className="text-destructive">*</span>
              </Label>
              <select
                id="idea-category"
                value={formData.category}
                aria-invalid={errors.category ? true : undefined}
                aria-describedby={errors.category ? "idea-category-error" : undefined}
                onChange={(event) =>
                  setFormData({ ...formData, category: event.target.value as IdeaCategory })
                }
                className="w-full cursor-pointer rounded-md border border-border bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Sélectionnez une catégorie</option>
                {(Object.keys(CATEGORY_LABELS) as IdeaCategory[]).map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p id="idea-category-error" className="text-sm text-destructive">
                  {errors.category}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="idea-title">
                Titre de l'idée <span className="text-destructive">*</span>
              </Label>
              <Input
                id="idea-title"
                value={formData.title}
                aria-invalid={errors.title ? true : undefined}
                aria-describedby={errors.title ? "idea-title-error" : undefined}
                onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                placeholder="Ex : Organiser un concert de musique de film"
              />
              {errors.title && (
                <p id="idea-title-error" className="text-sm text-destructive">
                  {errors.title}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="idea-description">
                Description détaillée <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="idea-description"
                value={formData.description}
                aria-invalid={errors.description ? true : undefined}
                aria-describedby={errors.description ? "idea-description-error" : undefined}
                onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                placeholder="Décrivez votre idée en détail : objectifs, organisation, bénéfices pour l'association..."
                rows={6}
              />
              {errors.description && (
                <p id="idea-description-error" className="text-sm text-destructive">
                  {errors.description}
                </p>
              )}
            </div>

            <div className="space-y-3 rounded-lg bg-muted/50 p-4">
              <Label htmlFor="idea-visibility" className="text-sm font-medium">
                Visibilité de l'idée
              </Label>
              <div className="flex flex-col gap-3">
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors ${
                    formData.is_public
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                  } focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2`}
                >
                  <input
                    id="idea-visibility"
                    type="radio"
                    name="idea-visibility"
                    checked={formData.is_public}
                    onChange={() => setFormData({ ...formData, is_public: true })}
                    className="sr-only"
                  />
                  <Globe className="mt-0.5 h-5 w-5 text-primary" />
                  <span>
                    <span className="block text-sm font-medium">Publique</span>
                    <span className="block text-xs text-muted-foreground">
                      Tous les musiciens pourront voir cette idée et ajouter des likes. Les admins
                      pourront la rendre privée.
                    </span>
                  </span>
                </label>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors ${
                    !formData.is_public
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                  } focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2`}
                >
                  <input
                    id="idea-visibility-private"
                    type="radio"
                    name="idea-visibility"
                    checked={!formData.is_public}
                    onChange={() => setFormData({ ...formData, is_public: false })}
                    className="sr-only"
                  />
                  <Lock className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <span>
                    <span className="block text-sm font-medium">Privée</span>
                    <span className="block text-xs text-muted-foreground">
                      Seulement vous et les administrateurs pourront voir cette idée.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={submitting} size="lg">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Soumettre mon idée
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
