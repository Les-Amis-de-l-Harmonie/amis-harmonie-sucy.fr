import { ChevronRight, FolderOpen } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { LockedCardOverlay } from "./LockedCardOverlay";
import { LockableCardBody } from "./LockableCardBody";

interface PartitionsCardProps {
  profileComplete: boolean;
}

export function PartitionsCard({ profileComplete }: PartitionsCardProps) {
  const locked = !profileComplete;

  return (
    <Card className="relative flex min-h-[220px] flex-col">
      <LockableCardBody locked={locked}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FolderOpen className="h-5 w-5 text-primary" aria-hidden="true" />
            Partitions
          </CardTitle>
          <CardDescription>
            Retrouvez l&apos;ensemble des partitions scannées, s&apos;il vous manque une partition
            vous pouvez la demander aux collègues sur le groupe whatsapp ou à David.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          <div className="flex-1" />
          <a
            href="https://drive.google.com/drive/folders/1pUqqJonhyugZCuT3SrWrpNTQ_NFI0BAz?usp=drive_link"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto"
          >
            <Button variant="outline" className="w-full">
              Accéder aux partitions
              <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </a>
        </CardContent>
      </LockableCardBody>
      {locked && <LockedCardOverlay reason="profile" />}
    </Card>
  );
}
