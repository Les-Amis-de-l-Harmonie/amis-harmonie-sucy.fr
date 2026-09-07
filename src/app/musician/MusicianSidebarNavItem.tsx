import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MusicianSidebarNavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  external?: boolean;
}

/**
 * Un lien de navigation de la sidebar desktop. État actif signalé par une
 * double redondance couleur + forme (fond teinté ET barre verticale), jamais
 * la seule teinte — voir la direction design §B1.
 *
 * Pas de point de notification pour l'instant (idées non lues, échéance
 * proche…) : la donnée n'existe pas encore à ce niveau du shell, elle sera
 * branchée en Phase 2 quand `useMusicianDashboardData` existera.
 */
export function MusicianSidebarNavItem({
  href,
  label,
  icon: Icon,
  active,
  external = false,
}: MusicianSidebarNavItemProps) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-current={active ? "page" : undefined}
      aria-label={external ? `${label} (s'ouvre dans un nouvel onglet)` : undefined}
      className={cn(
        "relative flex h-11 items-center gap-3 rounded-lg px-4 text-sm font-medium transition-colors",
        active
          ? "bg-primary/12 text-primary"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      {active && (
        <span aria-hidden="true" className="absolute left-0 h-6 w-1 rounded-full bg-primary" />
      )}
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="flex-1 truncate">{label}</span>
    </a>
  );
}
