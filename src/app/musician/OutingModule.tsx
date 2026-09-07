import { ChevronRight, MapPin, Ticket } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import type { OutingSettings } from "@/db/types";

interface OutingModuleProps {
  outingSettings: OutingSettings;
}

/**
 * Remplace `OutingCard`, sans verrou. Affiché uniquement quand
 * `outingSettings.is_active === 1` — décidé par l'appelant (`MusicianHome`),
 * pas ici, comme pour l'ancienne carte.
 */
export function OutingModule({ outingSettings }: OutingModuleProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Ticket className="h-5 w-5 text-primary" aria-hidden="true" />
          {outingSettings.title}
        </CardTitle>
        {outingSettings.subtitle && (
          <CardDescription className="font-medium text-primary">
            {outingSettings.subtitle}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {outingSettings.description && (
          <p className="mb-3 text-sm text-muted-foreground">{outingSettings.description}</p>
        )}
        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {outingSettings.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
              {outingSettings.location}
            </span>
          )}
          {outingSettings.price && <span>{outingSettings.price}</span>}
        </div>
        {outingSettings.button_link && (
          <a href={outingSettings.button_link} target="_blank" rel="noopener noreferrer">
            <Button variant="outline">
              {outingSettings.button_text}
              <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </a>
        )}
      </CardContent>
    </Card>
  );
}
