import { Cake, User } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { LockedCardOverlay } from "./LockedCardOverlay";
import { LockableCardBody } from "./LockableCardBody";
import type { Birthday } from "./musician-types";

interface BirthdaysCardProps {
  profileComplete: boolean;
  loading: boolean;
  birthdays: Birthday[];
}

const MONTH_NAMES = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

export function BirthdaysCard({ profileComplete, loading, birthdays }: BirthdaysCardProps) {
  const locked = !profileComplete;
  const currentMonth = MONTH_NAMES[new Date().getMonth()];

  return (
    <Card className="relative flex min-h-[220px] flex-col">
      <LockableCardBody locked={locked}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cake className="h-5 w-5 text-primary" aria-hidden="true" />
            {birthdays.length === 1 ? "Anniversaire" : "Anniversaires"}
          </CardTitle>
          <CardDescription>
            {birthdays.length === 0
              ? `Pas d'anniversaire en ${currentMonth}`
              : birthdays.length === 1
                ? `Anniversaire du mois de ${currentMonth}`
                : `Anniversaires du mois de ${currentMonth}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col overflow-hidden">
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : birthdays.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun anniversaire ce mois-ci</p>
          ) : (
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {birthdays.map((b, i) => {
                const day = new Date(b.date_of_birth).getDate();
                const name = [b.first_name, b.last_name].filter(Boolean).join(" ") || "Musicien";
                return (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
                    {b.avatar ? (
                      <img
                        src={b.avatar}
                        alt=""
                        className="h-8 w-8 rounded-full border border-primary/30 object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-4 w-4 text-primary" aria-hidden="true" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{name}</p>
                    </div>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {day} {currentMonth}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </LockableCardBody>
      {locked && <LockedCardOverlay reason="profile" />}
    </Card>
  );
}
