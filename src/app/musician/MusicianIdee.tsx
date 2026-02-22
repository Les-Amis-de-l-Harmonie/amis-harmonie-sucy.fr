"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Lightbulb, Send, Loader2, CheckCircle, Heart, Globe, Lock, Users } from "lucide-react";
import type { IdeaWithLikes, IdeaCategory } from "@/db/types";

const CATEGORY_LABELS: Record<IdeaCategory, string> = {
  association: "Association",
  harmonie: "Harmonie",
};

const STATUS_LABELS: Record<IdeaWithLikes["status"], string> = {
  pending: "En attente",
  reviewed: "En cours d'examen",
  accepted: "Acceptée",
  rejected: "Refusée",
};

const STATUS_COLORS: Record<IdeaWithLikes["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  reviewed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  accepted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function MusicianIdeeClient() {
  const [myIdeas, setMyIdeas] = useState<IdeaWithLikes[]>([]);
  const [publicIdeas, setPublicIdeas] = useState<IdeaWithLikes[]>([]);
  const [activeTab, setActiveTab] = useState<"my-ideas" | "public-wall">("my-ideas");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "" as IdeaCategory | "",
    is_public: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [likingId, setLikingId] = useState<number | null>(null);

  const fetchMyIdeas = useCallback(async () => {
    try {
      const response = await fetch("/api/musician/ideas");
      if (response.ok) {
        const data = (await response.json()) as IdeaWithLikes[];
        setMyIdeas(data);
      }
    } catch (err) {
      console.error("Error fetching my ideas:", err);
    }
  }, []);

  const fetchPublicIdeas = useCallback(async () => {
    try {
      const response = await fetch("/api/musician/ideas?view=public");
      if (response.ok) {
        const data = (await response.json()) as IdeaWithLikes[];
        setPublicIdeas(data);
      }
    } catch (err) {
      console.error("Error fetching public ideas:", err);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMyIdeas(), fetchPublicIdeas()]);
      setLoading(false);
    };
    loadData();
  }, [fetchMyIdeas, fetchPublicIdeas]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Le titre est obligatoire";
    }

    if (!formData.description.trim()) {
      newErrors.description = "La description est obligatoire";
    }

    if (!formData.category) {
      newErrors.category = "La catégorie est obligatoire";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
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

      if (response.ok) {
        setSubmitted(true);
        setFormData({ title: "", description: "", category: "", is_public: false });
        fetchMyIdeas();
        fetchPublicIdeas();
        setTimeout(() => {
          setSubmitted(false);
          setShowForm(false);
        }, 3000);
      } else {
        const data = (await response.json()) as { error?: string };
        setErrors({ submit: data.error || "Une erreur est survenue" });
      }
    } catch (err) {
      console.error("Error submitting idea:", err);
      setErrors({ submit: "Erreur lors de l'envoi" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (ideaId: number, currentlyLiked: boolean) => {
    setLikingId(ideaId);
    try {
      const action = currentlyLiked ? "unlike" : "like";
      const response = await fetch(`/api/musician/ideas?id=${ideaId}&action=${action}`, {
        method: "PUT",
      });

      if (response.ok) {
        // Update both lists
        setPublicIdeas((prev) =>
          prev.map((idea) =>
            idea.id === ideaId
              ? {
                  ...idea,
                  likes_count: currentlyLiked ? idea.likes_count - 1 : idea.likes_count + 1,
                  user_has_liked: !currentlyLiked,
                }
              : idea
          )
        );
        setMyIdeas((prev) =>
          prev.map((idea) =>
            idea.id === ideaId
              ? {
                  ...idea,
                  likes_count: currentlyLiked ? idea.likes_count - 1 : idea.likes_count + 1,
                  user_has_liked: !currentlyLiked,
                }
              : idea
          )
        );
      }
    } catch (err) {
      console.error("Error toggling like:", err);
    } finally {
      setLikingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Boîte à idée</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Partagez votre idée pour faire évoluer l'association
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab("my-ideas")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "my-ideas"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Mes idées
        </button>
        <button
          onClick={() => setActiveTab("public-wall")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "public-wall"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Users className="w-4 h-4" />
          Mur d'idées
          {publicIdeas.length > 0 && (
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
              {publicIdeas.length}
            </span>
          )}
        </button>
      </div>

      {submitted ? (
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Idée envoyée avec succès !
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Merci pour votre contribution. Votre idée sera examinée par le bureau.
            </p>
          </CardContent>
        </Card>
      ) : showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Nouvelle idée</CardTitle>
            <CardDescription>
              Décrivez votre idée en détail pour nous aider à l'évaluer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {errors.submit && (
              <div className="p-4 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                {errors.submit}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="category">
                Catégorie <span className="text-red-500">*</span>
              </Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as IdeaCategory })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Sélectionnez une catégorie</option>
                <option value="association">Association</option>
                <option value="harmonie">Harmonie</option>
              </select>
              {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">
                Titre de l'idée <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex : Organiser un concert de musique de film"
              />
              {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description détaillée <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Décrivez votre idée en détail : objectifs, organisation, bénéfices pour l'association..."
                rows={6}
              />
              {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
            </div>

            {/* Visibility Toggle */}
            <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <Label className="text-sm font-medium">Visibilité de l'idée</Label>
              <div className="flex flex-col gap-3">
                <label
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    formData.is_public
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    checked={formData.is_public}
                    onChange={() => setFormData({ ...formData, is_public: true })}
                    className="sr-only"
                  />
                  <Globe className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Publique</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Tous les musiciens pourront voir cette idée et ajouter des likes. Les admins
                      pourront la rendre privée.
                    </p>
                  </div>
                </label>
                <label
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    !formData.is_public
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    checked={!formData.is_public}
                    onChange={() => setFormData({ ...formData, is_public: false })}
                    className="sr-only"
                  />
                  <Lock className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Privée</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Seulement vous et les administrateurs pourront voir cette idée.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
              <Button onClick={handleSubmit} disabled={submitting} size="lg">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Soumettre mon idée
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-800/50 rounded-lg shrink-0">
                <Lightbulb className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Une idée à partager ?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  Vous avez une idée pour faire évoluer l'association ou enrichir la vie de
                  l'orchestre ? Partagez-la avec nous !
                </p>
                <Button onClick={() => setShowForm(true)} className="gap-2">
                  <Send className="w-4 h-4" />
                  Soumettre une idée
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Ideas Tab */}
      {activeTab === "my-ideas" && myIdeas.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Mes idées soumises
          </h2>
          {myIdeas.map((idea) => (
            <Card key={idea.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{idea.title}</CardTitle>
                      {idea.is_public === 1 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          <Globe className="w-3 h-3" />
                          Publique
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          <Lock className="w-3 h-3" />
                          Privée
                        </span>
                      )}
                    </div>
                    <CardDescription>
                      {CATEGORY_LABELS[idea.category]} • {formatDate(idea.created_at)}
                    </CardDescription>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      STATUS_COLORS[idea.status]
                    }`}
                  >
                    {STATUS_LABELS[idea.status]}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap mb-4">
                  {idea.description}
                </p>
                {idea.is_public === 1 && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                    <span>
                      {idea.likes_count || 0} like{idea.likes_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                {idea.admin_notes && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Réponse du bureau :
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{idea.admin_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Public Wall Tab */}
      {activeTab === "public-wall" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Mur d'idées publiques
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Découvrez les idées partagées par les autres musiciens et montrez votre soutien avec un
            like !
          </p>
          {publicIdeas.length === 0 ? (
            <Card className="bg-gray-50 dark:bg-gray-800/50">
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Aucune idée publique pour le moment.
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Soyez le premier à partager une idée publique !
                </p>
              </CardContent>
            </Card>
          ) : (
            publicIdeas.map((idea) => (
              <Card key={idea.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg">{idea.title}</CardTitle>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          <Globe className="w-3 h-3 inline mr-1" />
                          Publique
                        </span>
                      </div>
                      <CardDescription>
                        {CATEGORY_LABELS[idea.category]} • Proposée par{" "}
                        {idea.author_first_name && idea.author_last_name
                          ? `${idea.author_first_name} ${idea.author_last_name}`
                          : "Un musicien"}{" "}
                        • {formatDate(idea.created_at)}
                      </CardDescription>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        STATUS_COLORS[idea.status]
                      }`}
                    >
                      {STATUS_LABELS[idea.status]}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap mb-4">
                    {idea.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={idea.user_has_liked ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleLike(idea.id, idea.user_has_liked)}
                      disabled={likingId === idea.id}
                      className={idea.user_has_liked ? "bg-red-500 hover:bg-red-600" : ""}
                    >
                      {likingId === idea.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Heart
                          className={`w-4 h-4 mr-2 ${idea.user_has_liked ? "fill-white" : ""}`}
                        />
                      )}
                      {idea.likes_count || 0} like{idea.likes_count !== 1 ? "s" : ""}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
