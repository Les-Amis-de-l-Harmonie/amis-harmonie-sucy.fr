"use client";

import { useState } from "react";
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
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { Music } from "lucide-react";

export function MusicianLoginClient() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [debugLink, setDebugLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setDebugLink(null);

    try {
      const formData = new FormData();
      formData.append("email", email);

      const response = await fetch("/api/auth/musician-magic-link", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
        debug_link?: string;
      };

      if (data.success) {
        setMessage({ type: "success", text: data.message || "Lien envoyé" });
        if (data.debug_link) {
          setDebugLink(data.debug_link);
        }
      } else {
        setMessage({ type: "error", text: data.error || "Une erreur est survenue" });
      }
    } catch {
      setMessage({ type: "error", text: "Une erreur est survenue" });
    } finally {
      setLoading(false);
    }
  };

  const urlParams =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const errorParam = urlParams?.get("error");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 transition-colors">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Music className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Espace Musicien</CardTitle>
          <CardDescription>
            Connectez-vous avec votre email pour accéder à votre profil
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorParam && (
            <div
              role="alert"
              className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {errorParam === "invalid_token" &&
                "Le lien de connexion est invalide ou a déjà été utilisé."}
              {errorParam === "expired_token" &&
                "Le lien de connexion a expiré. Veuillez en demander un nouveau."}
              {errorParam === "account_inactive" &&
                "Votre compte est inactif. Contactez l'administrateur."}
              {errorParam === "unauthorized" && "Vous n'êtes pas autorisé à accéder à cet espace."}
              {errorParam === "admin_not_allowed" &&
                "Les administrateurs ne peuvent pas se connecter à l'espace musicien."}
              {errorParam === "server_error" &&
                "Une erreur serveur est survenue. Veuillez réessayer."}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="musicien@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Envoi en cours..." : "Recevoir le lien de connexion"}
            </Button>
          </form>

          {message && (
            <div
              role={message.type === "success" ? "status" : "alert"}
              className={`mt-4 rounded-md border p-3 text-sm ${
                message.type === "success"
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {message.text}
            </div>
          )}

          {debugLink && (
            <div className="mt-4 rounded-md border border-warning/30 bg-warning/10 p-3">
              <p className="mb-2 text-sm text-warning">
                <strong>Mode développement:</strong> Cliquez sur le lien ci-dessous pour vous
                connecter
              </p>
              <a href={debugLink} className="break-all text-sm text-warning underline">
                {debugLink}
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
