"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Save, GripVertical, LayoutGrid } from "lucide-react";
import { MUSICIAN_CARD_LABELS, type MusicianCardType } from "@/db/types";

const DEFAULT_CARDS: MusicianCardType[] = [
  "profile",
  "adhesion",
  "assurance",
  "planning",
  "partitions",
  "boite-a-idee",
  "outing",
  "birthdays",
  "social",
];

interface SortableCardItemProps {
  cardId: MusicianCardType;
  index: number;
}

function SortableCardItem({ cardId, index }: SortableCardItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cardId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-muted/50 rounded-lg border ${
        isDragging
          ? "shadow-lg ring-2 ring-primary bg-primary/5 border-primary"
          : "hover:border-muted-foreground/20"
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
      >
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </div>
      <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
      <span className="flex-1 font-medium">{MUSICIAN_CARD_LABELS[cardId]}</span>
    </div>
  );
}

export function CardOrderClient() {
  const [cardOrder, setCardOrder] = useState<MusicianCardType[]>(DEFAULT_CARDS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/card-order");
      if (res.ok) {
        const data = (await res.json()) as { card_order: string };
        if (data.card_order) {
          try {
            const parsed = JSON.parse(data.card_order) as MusicianCardType[];
            // Validate that all cards are present
            const validCards = parsed.filter((card): card is MusicianCardType =>
              DEFAULT_CARDS.includes(card)
            );
            // Add any missing cards
            const missingCards = DEFAULT_CARDS.filter((card) => !validCards.includes(card));
            setCardOrder([...validCards, ...missingCards]);
          } catch {
            setCardOrder(DEFAULT_CARDS);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching card order:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCardOrder((items) => {
        const oldIndex = items.indexOf(active.id as MusicianCardType);
        const newIndex = items.indexOf(over.id as MusicianCardType);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/card-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_order: cardOrder }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Ordre des cartouches sauvegardé avec succès !" });
      } else {
        const data = (await res.json()) as { error?: string };
        setMessage({ type: "error", text: data.error || "Erreur lors de la sauvegarde" });
      }
    } catch (err) {
      console.error("Error saving card order:", err);
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
        <LayoutGrid className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Ordre des cartouches</h1>
          <p className="text-muted-foreground">
            Personnalisez l'ordre d'affichage des cartouches dans l'espace musicien
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
          <CardTitle>Réorganiser les cartouches</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Glissez-déposez les cartouches pour modifier l'ordre d'affichage sur la page d'accueil
            de l'espace musicien.
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={cardOrder} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {cardOrder.map((cardId, index) => (
                  <SortableCardItem key={cardId} cardId={cardId} index={index} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Sauvegarde..." : "Sauvegarder l'ordre"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
