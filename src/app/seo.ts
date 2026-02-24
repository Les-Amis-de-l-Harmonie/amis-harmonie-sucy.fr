export const SITE_NAME = "Les Amis de l'Harmonie de Sucy";
export const SITE_URL = "https://amis-harmonie-sucy.fr";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/logo.png`;

export const DEFAULT_DESCRIPTION =
  "Association Les Amis de l'Harmonie de Sucy-en-Brie — Soutenez l'Harmonie Municipale, participez à nos événements musicaux et rejoignez notre communauté passionnée de musique.";

interface PageSeo {
  title: string | null;
  description: string;
}

const PAGE_SEO: Record<string, PageSeo> = {
  "/": {
    title: null,
    description:
      "Soutenez l'Harmonie Municipale de Sucy-en-Brie. Concerts, thés dansants, événements musicaux. Rejoignez l'association Les Amis de l'Harmonie !",
  },
  "/about": {
    title: "L'Association",
    description:
      "Découvrez l'association Les Amis de l'Harmonie de Sucy-en-Brie, son histoire, son bureau et sa mission de soutien à la musique.",
  },
  "/harmonie": {
    title: "L'Harmonie Municipale",
    description:
      "L'Harmonie Municipale de Sucy-en-Brie : orchestre d'harmonie, répétitions, concerts et événements musicaux dans le Val-de-Marne.",
  },
  "/the-dansant": {
    title: "Thé Dansant",
    description:
      "Participez à nos thés dansants à Sucy-en-Brie. Danse, musique live et convivialité au programme.",
  },
  "/billetterie": {
    title: "Billetterie",
    description:
      "Réservez vos places pour les concerts, thés dansants et spectacles de l'Harmonie de Sucy-en-Brie.",
  },
  "/videos": {
    title: "Vidéos",
    description:
      "Retrouvez les vidéos de nos concerts et événements. L'Harmonie Municipale de Sucy-en-Brie en images.",
  },
  "/publications": {
    title: "Publications",
    description:
      "Actualités et publications de l'association Les Amis de l'Harmonie de Sucy-en-Brie.",
  },
  "/livre-or": {
    title: "Livre d'Or",
    description:
      "Témoignages de notre public. Laissez un message dans le livre d'or de l'Harmonie de Sucy-en-Brie.",
  },
  "/adhesion": {
    title: "Adhésion",
    description:
      "Rejoignez Les Amis de l'Harmonie de Sucy-en-Brie. Soutenez la musique locale en devenant adhérent de l'association.",
  },
  "/partenaires": {
    title: "Nos Partenaires",
    description:
      "Partenaires et sponsors qui soutiennent l'Harmonie Municipale de Sucy-en-Brie et ses événements musicaux.",
  },
  "/contact": {
    title: "Contact",
    description:
      "Contactez Les Amis de l'Harmonie de Sucy-en-Brie. Adresse, email et formulaire de contact.",
  },
  "/legal": {
    title: "Mentions légales",
    description: "Mentions légales du site amis-harmonie-sucy.fr.",
  },
};

export function getPageSeo(path: string): { title: string; description: string } {
  const normalized = path.replace(/\/+$/, "") || "/";
  const page = PAGE_SEO[normalized];

  const title = page?.title ? `${page.title} | ${SITE_NAME}` : SITE_NAME;
  const description = page?.description || DEFAULT_DESCRIPTION;

  return { title, description };
}

export function isNoIndexPath(path: string): boolean {
  const normalized = path.replace(/\/+$/, "") || "/";
  return (
    normalized.startsWith("/admin") ||
    normalized.startsWith("/musician") ||
    normalized.startsWith("/api")
  );
}
