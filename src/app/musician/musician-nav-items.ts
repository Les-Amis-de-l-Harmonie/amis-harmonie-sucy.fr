import {
  CalendarDays,
  Home,
  Lightbulb,
  Shield,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface MusicianNavItem {
  href: string;
  /** Libellé complet, utilisé dans la sidebar desktop et le sheet « Plus ». */
  label: string;
  /** Libellé court pour la barre d'onglets mobile ; retombe sur `label`. */
  tabLabel?: string;
  icon: LucideIcon;
  /**
   * `true` : l'item a son propre onglet dans la barre basse mobile.
   * `false` : l'item n'apparaît que dans la sidebar desktop et le sheet
   * « Plus » — consultation ponctuelle, pas un aller-retour quotidien.
   */
  inTabBar: boolean;
}

/**
 * Source unique de vérité pour la navigation du portail (sidebar desktop,
 * barre d'onglets mobile, sheet « Plus »). Les 6 pages gardées du portail
 * (hors /musician/login, qui n'a pas de shell) — voir src/worker.tsx:507-569.
 *
 * L'ordre choisi groupe volontairement les 4 sections à plus forte fréquence
 * en tête (identique à l'ordre des onglets mobiles), pour que la sidebar
 * desktop et la barre basse mobile racontent la même histoire de priorité.
 */
export const MUSICIAN_NAV_ITEMS: MusicianNavItem[] = [
  { href: "/musician/", label: "Accueil", icon: Home, inTabBar: true },
  {
    href: "/musician/disponibilites",
    label: "Mes prestations",
    tabLabel: "Prestations",
    icon: CalendarDays,
    inTabBar: true,
  },
  {
    href: "/musician/profile",
    label: "Mon profil",
    tabLabel: "Profil",
    icon: User,
    inTabBar: true,
  },
  {
    href: "/musician/idee",
    label: "Boîte à idée",
    tabLabel: "Idées",
    icon: Lightbulb,
    inTabBar: true,
  },
  { href: "/musician/assurance", label: "Assurance", icon: Shield, inTabBar: false },
  { href: "/musician/trombinoscope", label: "Trombinoscope", icon: Users, inTabBar: false },
];

export const MUSICIAN_TAB_ITEMS = MUSICIAN_NAV_ITEMS.filter((item) => item.inTabBar);
export const MUSICIAN_OVERFLOW_ITEMS = MUSICIAN_NAV_ITEMS.filter((item) => !item.inTabBar);
