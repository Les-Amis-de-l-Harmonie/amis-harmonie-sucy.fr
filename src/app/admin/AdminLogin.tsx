"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";

export function AdminLoginClient() {
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

      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: data.message });
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

  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const errorParam = urlParams?.get("error");

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center p-4 transition-colors">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Administration</CardTitle>
          <CardDescription>
            Connectez-vous avec votre email pour recevoir un lien de connexion
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorParam && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-md text-sm">
              {errorParam === "invalid_token" && "Le lien de connexion est invalide ou a déjà été utilisé."}
              {errorParam === "expired_token" && "Le lien de connexion a expiré. Veuillez en demander un nouveau."}
              {errorParam === "server_error" && "Une erreur serveur est survenue. Veuillez réessayer."}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Envoi en cours..." : "Envoyer le lien magique"}
            </Button>
          </form>

          {message && (
            <div
              className={`mt-4 p-3 rounded-md text-sm ${
                message.type === "success"
                  ? "bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                  : "bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
              }`}
            >
              {message.text}
            </div>
          )}

          {debugLink && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                <strong>Mode développement:</strong> Cliquez sur le lien ci-dessous pour vous connecter
              </p>
              <a
                href={debugLink}
                className="text-blue-600 dark:text-blue-400 underline text-sm break-all"
              >
                {debugLink}
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
