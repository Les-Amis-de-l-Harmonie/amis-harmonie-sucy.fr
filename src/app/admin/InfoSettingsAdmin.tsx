"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import {
  Save,
  Info,
  Bold,
  Italic,
  Underline,
  Type,
  Palette,
  Link,
  Highlighter,
} from "lucide-react";

interface InfoSettings {
  id: number;
  title: string;
  subtitle: string;
  content: string;
  bg_color: string;
  text_color: string;
  border_color: string;
  icon: string;
  is_active: number;
}

const COLOR_OPTIONS = [
  { name: "Bleu", bg: "bg-blue-50", text: "text-blue-900", border: "border-blue-200" },
  { name: "Vert", bg: "bg-green-50", text: "text-green-900", border: "border-green-200" },
  { name: "Jaune", bg: "bg-yellow-50", text: "text-yellow-900", border: "border-yellow-200" },
  { name: "Rouge", bg: "bg-red-50", text: "text-red-900", border: "border-red-200" },
  { name: "Violet", bg: "bg-purple-50", text: "text-purple-900", border: "border-purple-200" },
  { name: "Orange", bg: "bg-orange-50", text: "text-orange-900", border: "border-orange-200" },
  { name: "Gris", bg: "bg-gray-50", text: "text-gray-900", border: "border-gray-200" },
  { name: "Rose", bg: "bg-pink-50", text: "text-pink-900", border: "border-pink-200" },
];

export function InfoSettingsClient() {
  const [settings, setSettings] = useState<InfoSettings>({
    id: 1,
    title: "Information",
    subtitle: "",
    content: "",
    bg_color: "bg-blue-50",
    text_color: "text-blue-900",
    border_color: "border-blue-200",
    icon: "Info",
    is_active: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/info-settings");
      if (res.ok) {
        const data = (await res.json()) as InfoSettings;
        setSettings({
          id: data.id || 1,
          title: data.title || "Information",
          subtitle: data.subtitle || "",
          content: data.content || "",
          bg_color: data.bg_color || "bg-blue-50",
          text_color: data.text_color || "text-blue-900",
          border_color: data.border_color || "border-blue-200",
          icon: data.icon || "Info",
          is_active: data.is_active || 0,
        });
      }
    } catch (err) {
      console.error("Error fetching info settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Set content in editor when loading is complete and settings are loaded
  useEffect(() => {
    if (!loading && contentRef.current) {
      contentRef.current.innerHTML = settings.content || "";
    }
  }, [loading]); // Only on load — NOT on settings.content changes, that would reset the cursor on every keystroke

  const execCommand = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    // Don't update state immediately to avoid cursor jumping
    // The onInput handler will catch the change
  };

  const insertLink = () => {
    const url = window.prompt("Entrez l'URL du lien (ex: https://example.com):");
    if (url) {
      document.execCommand("createLink", false, url);
    }
  };

  const handleContentChange = () => {
    if (contentRef.current) {
      setSettings((prev) => ({ ...prev, content: contentRef.current?.innerHTML || "" }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/info-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: settings.title,
          subtitle: settings.subtitle || null,
          content: settings.content || null,
          bg_color: settings.bg_color,
          text_color: settings.text_color,
          border_color: settings.border_color,
          icon: settings.icon,
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
      console.error("Error saving info settings:", err);
      setMessage({ type: "error", text: "Erreur lors de la sauvegarde" });
    } finally {
      setSaving(false);
    }
  };

  const selectedColor = COLOR_OPTIONS.find((c) => c.bg === settings.bg_color) || COLOR_OPTIONS[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Info className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Cartouche Information</h1>
          <p className="text-muted-foreground">
            Configurez la cartouche d'information affichée dans l'espace musicien
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
              placeholder="Information"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subtitle">Sous-titre (optionnel)</Label>
            <Input
              id="subtitle"
              value={settings.subtitle}
              onChange={(e) => setSettings((prev) => ({ ...prev, subtitle: e.target.value }))}
              placeholder="Ex: Important"
            />
          </div>

          <div className="space-y-2">
            <Label>Couleur de la cartouche</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      bg_color: color.bg,
                      text_color: color.text,
                      border_color: color.border,
                    }))
                  }
                  className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    settings.bg_color === color.bg
                      ? `border-current ${color.text} ${color.bg} ring-2 ring-offset-2 ring-primary`
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className={color.text}>{color.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <div className="border rounded-lg overflow-hidden">
              <div className="flex items-center gap-1 p-2 bg-muted border-b">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => execCommand("bold")}
                  className="h-8 w-8 p-0"
                  title="Gras"
                >
                  <Bold className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => execCommand("italic")}
                  className="h-8 w-8 p-0"
                  title="Italique"
                >
                  <Italic className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => execCommand("underline")}
                  className="h-8 w-8 p-0"
                  title="Souligné"
                >
                  <Underline className="w-4 h-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => execCommand("fontSize", "5")}
                  className="h-8 px-2"
                  title="Gros texte"
                >
                  <Type className="w-4 h-4 mr-1" />
                  <span className="text-xs">Titre</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => execCommand("fontSize", "3")}
                  className="h-8 px-2"
                  title="Texte normal"
                >
                  <Type className="w-4 h-4 mr-1" />
                  <span className="text-xs">Normal</span>
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => execCommand("foreColor", "#ef4444")}
                  className="h-8 w-8 p-0"
                  title="Rouge"
                >
                  <Palette className="w-4 h-4 text-red-500" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => execCommand("foreColor", "#22c55e")}
                  className="h-8 w-8 p-0"
                  title="Vert"
                >
                  <Palette className="w-4 h-4 text-green-500" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => execCommand("foreColor", "#3b82f6")}
                  className="h-8 w-8 p-0"
                  title="Bleu"
                >
                  <Palette className="w-4 h-4 text-blue-500" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => execCommand("foreColor", "#000000")}
                  className="h-8 w-8 p-0"
                  title="Noir"
                >
                  <Palette className="w-4 h-4 text-black" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => execCommand("hiliteColor", "#fef08a")}
                  className="h-8 w-8 p-0"
                  title="Surligner (jaune)"
                >
                  <Highlighter className="w-4 h-4 text-yellow-600" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => execCommand("hiliteColor", "#bfdbfe")}
                  className="h-8 w-8 p-0"
                  title="Surligner (bleu)"
                >
                  <Highlighter className="w-4 h-4 text-blue-500" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => execCommand("hiliteColor", "#fecaca")}
                  className="h-8 w-8 p-0"
                  title="Surligner (rouge)"
                >
                  <Highlighter className="w-4 h-4 text-red-500" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => execCommand("hiliteColor", "transparent")}
                  className="h-8 w-8 p-0"
                  title="Retirer le surlignage"
                >
                  <Highlighter className="w-4 h-4 text-gray-400" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={insertLink}
                  className="h-8 px-2"
                  title="Insérer un lien"
                >
                  <Link className="w-4 h-4 mr-1" />
                  <span className="text-xs">Lien</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => execCommand("unlink")}
                  className="h-8 px-2 text-red-500 hover:text-red-600"
                  title="Supprimer le lien"
                >
                  <span className="text-xs">Suppr. lien</span>
                </Button>
              </div>
              <div
                ref={contentRef}
                contentEditable
                onInput={handleContentChange}
                className="min-h-[200px] p-4 focus:outline-none prose prose-sm max-w-none"
                style={{ minHeight: "200px" }}
                suppressContentEditableWarning={true}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Utilisez les boutons ci-dessus pour formater votre texte (gras, italique, couleurs...)
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
            className={`p-4 rounded-lg border ${selectedColor.bg} ${selectedColor.border} ${
              settings.is_active ? "" : "opacity-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <Info className={`w-5 h-5 mt-0.5 ${selectedColor.text}`} />
              <div className="flex-1">
                <h3 className={`font-semibold text-lg ${selectedColor.text}`}>
                  {settings.title || "Information"}
                </h3>
                {settings.subtitle && (
                  <p className={`text-sm font-medium mt-1 ${selectedColor.text} opacity-80`}>
                    {settings.subtitle}
                  </p>
                )}
                {settings.content ? (
                  <div
                    className={`mt-2 ${selectedColor.text} prose prose-sm max-w-none`}
                    dangerouslySetInnerHTML={{ __html: settings.content }}
                  />
                ) : (
                  <p className={`mt-2 ${selectedColor.text} opacity-60`}>
                    Le contenu de votre message apparaîtra ici...
                  </p>
                )}
              </div>
            </div>
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
