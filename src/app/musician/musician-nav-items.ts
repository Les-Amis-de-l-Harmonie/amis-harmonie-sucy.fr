import {
  CalendarDays,
  CreditCard,
  FileMusic,
  Home,
  Lightbulb,
  Shield,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { isMusicianPathActive } from "@/app/musician/isMusicianPathActive";

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
  /** `true` : la destination quitte la coquille du portail et s'ouvre dans un nouvel onglet. */
  external?: boolean;
}

/**
 * Source unique de vérité pour la navigation du portail (sidebar desktop,
 * barre d'onglets mobile, sheet « Plus ») : 6 pages du portail + 2 destinations
 * hors coquille (hors /musician/login, qui n'a pas de shell) — voir src/worker.tsx:507-569.
 *
 * L'ordre choisi groupe volontairement les 4 sections à plus forte fréquence
 * en tête (identique à l'ordre des onglets mobiles), pour que la sidebar
 * desktop et la barre basse mobile racontent la même histoire de priorité.
 *
 * Les deux derniers items (`external: true`) forment un second groupe visuel
 * dans la sidebar et le sheet « Plus » (séparateur + libellé « Hors du
 * portail », voir MusicianSidebar.tsx et MusicianMoreSheet.tsx) : ils quittent
 * la coquille, ce n'est pas la même nature d'action que les six pages
 * internes. Adhésion précède Partitions dans ce sous-groupe : en base de
 * production, 32 musiciens sur 38 ne sont pas adhérents pour 2026-2027,
 * contre une poignée qui consulte les partitions au quotidien — à priorité
 * égale (toutes deux hors sheet direct), Adhésion reste la plus utile au
 * plus grand nombre. Elle n'est pas remontée dans les onglets mobiles pour
 * autant : la page d'accueil porte son propre parcours de complétion,
 * la navigation n'a pas à dupliquer ce rôle.
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
  { href: "/adhesion", label: "Adhésion", icon: CreditCard, inTabBar: false, external: true },
  {
    href: "https://drive.google.com/drive/folders/1pUqqJonhyugZCuT3SrWrpNTQ_NFI0BAz?usp=drive_link",
    label: "Partitions",
    icon: FileMusic,
    inTabBar: false,
    external: true,
  },
];

export const MUSICIAN_TAB_ITEMS = MUSICIAN_NAV_ITEMS.filter((item) => item.inTabBar);
export const MUSICIAN_OVERFLOW_ITEMS = MUSICIAN_NAV_ITEMS.filter((item) => !item.inTabBar);

export function isNavItemActive(item: MusicianNavItem, pathname: string): boolean {
  return !item.external && isMusicianPathActive(pathname, item.href);
}

export function findActiveNavItem(pathname: string): MusicianNavItem | undefined {
  return MUSICIAN_NAV_ITEMS.find((item) => isNavItemActive(item, pathname));
}
