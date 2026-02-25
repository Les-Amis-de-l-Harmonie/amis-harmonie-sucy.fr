"use client";

import { useState } from "react";
import type { GuestbookEntry } from "@/db/types";
import { Card, CardContent } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { formatDateFrench } from "@/lib/dates";
import { ScrollReveal } from "@/app/components/ScrollReveal";

function GuestbookEntryCard({ entry }: { entry: GuestbookEntry }) {
  const formattedDate = formatDateFrench(entry.date);
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <div className="mb-8">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{capitalizedDate}</p>
      <Card className="border-0 shadow-md hover-lift">
        <CardContent className="p-6">
          <h3 className="font-['Merriweather_Sans'] text-gray-900 dark:text-gray-100 mb-3">
            <span className="font-bold">{entry.first_name}</span> {entry.last_name}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">{entry.message}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function AddEntryForm({ onSuccess }: { onSuccess: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch("/api/guestbook", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        onSuccess();
      }
    } catch {
      alert("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="first_name" className="text-gray-700 dark:text-gray-300">
            Prénom *
          </Label>
          <Input type="text" id="first_name" name="first_name" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="last_name" className="text-gray-700 dark:text-gray-300">
            Nom *
          </Label>
          <Input type="text" id="last_name" name="last_name" required />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="message" className="text-gray-700 dark:text-gray-300">
          Message *
        </Label>
        <Textarea id="message" name="message" rows={4} required />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full rounded-full">
        {isSubmitting ? "Envoi..." : "Envoyer"}
      </Button>
    </form>
  );
}

export function LivreOrClient({ entries }: { entries: GuestbookEntry[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="text-center mb-8">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full px-6 py-3 h-auto">
              Ajouter un commentaire au livre d'or
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-['Merriweather_Sans'] text-2xl font-bold text-gray-900 dark:text-gray-100">
                Laisser un message
              </DialogTitle>
            </DialogHeader>
            <AddEntryForm
              onSuccess={() => {
                setOpen(false);
                window.location.reload();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Soyez le premier à laisser un message !
          </p>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          {entries.map((entry, index) => (
            <ScrollReveal key={entry.id} staggerIndex={index}>
              <GuestbookEntryCard entry={entry} />
            </ScrollReveal>
          ))}
        </div>
      )}
    </>
  );
}
