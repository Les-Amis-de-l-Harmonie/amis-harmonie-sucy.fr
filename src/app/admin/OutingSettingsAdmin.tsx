"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Switch } from "@/app/components/ui/switch";
import { Save, Ticket } from "lucide-react";

interface OutingSettings {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  location: string;
  price: string;
  button_text: string;
  button_link: string;
  is_active: number;
}

export function OutingSettingsClient() {
  const [settings, setSettings] = useState<OutingSettings>({
    id: 1,
    title: "Inscription Sortie",
    subtitle: "",
    description: "",
    location: "",
    price: "",
    button_text: "S'inscrire",
    button_link: "",
    is_active: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/outing-settings");
      if (res.ok) {
        const data = (await res.json()) as OutingSettings;
        setSettings({
          id: data.id || 1,
          title: data.title || "Inscription Sortie",
          subtitle: data.subtitle || "",
          description: data.description || "",
          location: data.location || "",
          price: data.price || "",
          button_text: data.button_text || "S'inscrire",
          button_link: data.button_link || "",
          is_active: data.is_active || 0,
        });
      }
    } catch (err) {
      console.error("Error fetching outing settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/outing-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: settings.title,
          subtitle: settings.subtitle || null,
          description: settings.description || null,
          location: settings.location || null,
          price: settings.price || null,
          button_text: settings.button_text,
          button_link: settings.button_link || null,
          is_active: settings.is_active,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Paramètres sauvegardés avec succès !" });
      } else {
        const data = (await res.json()) as { error?: string };
        setMessage({ type: "error", text: data.error || "Erreur lors de la sauvegarde" });
      }
    } catch (err) {
      console.error("Error saving outing settings:", err);
      setMessage({ type: "error", text: "Erreur lors de la sauvegarde" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Ticket className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Inscription Sortie</h1>
          <p className="text-muted-foreground">
            Configurez la cartouche d'inscription aux sorties affichée dans l'espace musicien
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Paramètres de la cartouche</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Activer la cartouche</Label>
              <p className="text-sm text-muted-foreground">
                Afficher la cartouche dans l'espace musicien
              </p>
            </div>
            <Switch
              id="is_active"
              checked={settings.is_active === 1}
              onCheckedChange={(checked: boolean) =>
                setSettings((prev) => ({ ...prev, is_active: checked ? 1 : 0 }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              value={settings.title}
              onChange={(e) => setSettings((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Inscription Sortie"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subtitle">Sous-titre</Label>
            <Input
              id="subtitle"
              value={settings.subtitle}
              onChange={(e) => setSettings((prev) => ({ ...prev, subtitle: e.target.value }))}
              placeholder="Ex: Sortie du 15 mars 2026"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="description">Description</Label>
              <span
                className={`text-xs ${settings.description.length > 300 ? "text-red-500" : "text-muted-foreground"}`}
              >
                {settings.description.length}/300
              </span>
            </div>
            <Textarea
              id="description"
              value={settings.description}
              onChange={(e) => {
                const value = e.target.value.slice(0, 300);
                setSettings((prev) => ({ ...prev, description: value }));
              }}
              placeholder="Décrivez la sortie..."
              rows={4}
              maxLength={300}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Lieu</Label>
            <Input
              id="location"
              value={settings.location}
              onChange={(e) => setSettings((prev) => ({ ...prev, location: e.target.value }))}
              placeholder="Ex: Salle des fêtes de Sucy-en-Brie"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Tarif</Label>
            <Input
              id="price"
              value={settings.price}
              onChange={(e) => setSettings((prev) => ({ ...prev, price: e.target.value }))}
              placeholder="Ex: 25€ / personne"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="button_text">Texte du bouton</Label>
            <Input
              id="button_text"
              value={settings.button_text}
              onChange={(e) => setSettings((prev) => ({ ...prev, button_text: e.target.value }))}
              placeholder="S'inscrire"
            />
          </div>

          <div className="space-y-2">
            <Input
              id="button_link"
              type="url"
              value={settings.button_link}
              onChange={(e) => setSettings((prev) => ({ ...prev, button_link: e.target.value }))}
              placeholder="https://..."
            />
            <p className="text-sm text-muted-foreground">
              Lien vers le formulaire d'inscription (Google Forms, etc.)
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">Aperçu</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`p-4 rounded-lg border ${
              settings.is_active ? "bg-card" : "bg-gray-100 dark:bg-gray-800 opacity-50"
            }`}
          >
            <h3 className="font-semibold text-lg">{settings.title || "Inscription Sortie"}</h3>
            {settings.subtitle && (
              <p className="text-sm text-primary font-medium mt-1">{settings.subtitle}</p>
            )}
            {settings.description && (
              <p className="text-sm text-muted-foreground mt-2">{settings.description}</p>
            )}
            {settings.location && (
              <p className="text-sm text-muted-foreground mt-1">📍 {settings.location}</p>
            )}
            {settings.price && (
              <p className="text-sm text-muted-foreground mt-1">💰 {settings.price}</p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              disabled={!settings.is_active || !settings.button_link}
            >
              {settings.button_text || "S'inscrire"}
            </Button>
          </div>
          {!settings.is_active && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              La cartouche est actuellement désactivée
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
