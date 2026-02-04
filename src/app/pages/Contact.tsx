"use client";

import { useState } from "react";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Button } from "@/app/components/ui/button";

export function Contact() {
  const [formState, setFormState] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormState("submitting");

    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setFormState("success");
        (e.target as HTMLFormElement).reset();
      } else {
        setFormState("error");
      }
    } catch {
      setFormState("error");
    }
  }

  return (
    <>
      <title>Contact | Les Amis de l'Harmonie de Sucy</title>
      <meta name="description" content="Contactez Les Amis de l'Harmonie de Sucy-en-Brie. Posez vos questions, demandez des informations sur nos événements ou rejoignez notre association." />
      <meta property="og:title" content="Contact | Les Amis de l'Harmonie de Sucy" />
      <meta property="og:description" content="Contactez Les Amis de l'Harmonie de Sucy-en-Brie." />
      <meta property="og:url" content="https://amis-harmonie-sucy.fr/contact" />
      <link rel="canonical" href="https://amis-harmonie-sucy.fr/contact" />
      <div className="py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-['Merriweather_Sans'] text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8 text-center">
            Contactez-nous
          </h2>

          {formState === "success" && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg mb-6">
              Merci pour votre message ! Nous vous répondrons dans les plus brefs délais.
            </div>
          )}

          {formState === "error" && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
              Une erreur est survenue. Veuillez réessayer.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 mb-12">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="nom" className="text-gray-700 dark:text-gray-300">
                  Nom
                </Label>
                <Input
                  type="text"
                  id="nom"
                  name="nom"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prenom" className="text-gray-700 dark:text-gray-300">
                  Prénom
                </Label>
                <Input
                  type="text"
                  id="prenom"
                  name="prenom"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
                Email
              </Label>
              <Input
                type="email"
                id="email"
                name="email"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="message" className="text-gray-700 dark:text-gray-300">
                Votre Message
              </Label>
              <Textarea
                id="message"
                name="message"
                rows={5}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={formState === "submitting"}
              className="w-full py-3 bg-gradient-to-r from-primary to-[#e8b4c8] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              {formState === "submitting" ? "Envoi en cours..." : "Envoyer mon message"}
            </Button>
          </form>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Appelez-nous</p>
              <a
                href="tel:0783511741"
                className="flex h-[100px] items-center justify-center rounded border border-gray-200 dark:border-gray-700 p-4 text-primary hover:border-primary transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">07 83 51 17 41</span>
              </a>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Écrivez-nous</p>
              <a
                href="mailto:contact@amis-harmonie-sucy.fr"
                className="flex h-[100px] items-center justify-center rounded border border-gray-200 dark:border-gray-700 p-4 text-primary hover:border-primary transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">contact@amis-harmonie-sucy.fr</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
