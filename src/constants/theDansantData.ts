import thedansant20261 from "../../public/images/thedansant20261.png";
import thedansant20262 from "../../public/images/thedansant20262.png";
import logoSucy from "../../public/images/logo-sucy.png";
import boulangerie from "../../public/images/boulangerie.jpg";
import madeinsens from "../../public/images/madeinsens.jpg";
import oiseau from "../../public/images/oiseau.jpg";
import sla from "../../public/images/logo-sla.png";
import beperfect from "../../public/images/beperfect.jpg";
import isabelle from "../../public/images/logoisabelle.jpg";
import minedor from "../../public/images/minedor.png";
import arbre from "../../public/images/arbre.png";
import cmontaleau from "../../public/images/logo-clubmontaleau.jpeg";
import kifekoi from "../../public/images/logo-kifekoi.png";
import confrerie from "../../public/images/logo-confrerie.jpeg";
import thedansant1 from "../../public/images/thedansant1.jpg";
import thedansant2 from "../../public/images/thedansant2.jpg";
import thedansant3 from "../../public/images/thedansant3.jpg";
import thedansant4 from "../../public/images/thedansant4.jpg";
import thedansant5 from "../../public/images/thedansant5.jpg";
import thedansant6 from "../../public/images/thedansant6.jpg";
import thedansant7 from "../../public/images/thedansant7.jpg";
import thedansant8 from "../../public/images/thedansant8.jpg";
import thedansant9 from "../../public/images/thedansant9.jpg";
import thedansant10 from "../../public/images/thedansant10.jpg";
import thedansant11 from "../../public/images/thedansant11.jpg";
import thedansant12 from "../../public/images/thedansant12.jpg";

import { StaticImageData } from "next/image";

export interface Photo {
  src: StaticImageData;
  alt: string;
}

export interface FlyerImage extends Photo {}

export interface Partner extends Photo {
  link: string;
}

export const photos: Photo[] = [
  { src: thedansant1, alt: "Thé Dansant Sucy-en-Brie" },
  { src: thedansant2, alt: "Thé Dansant Sucy-en-Brie" },
  { src: thedansant3, alt: "Thé Dansant Sucy-en-Brie" },
  { src: thedansant4, alt: "Thé Dansant Sucy-en-Brie" },
  { src: thedansant5, alt: "Thé Dansant Sucy-en-Brie" },
  { src: thedansant6, alt: "Thé Dansant Sucy-en-Brie" },
  { src: thedansant7, alt: "Thé Dansant Sucy-en-Brie" },
  { src: thedansant8, alt: "Thé Dansant Sucy-en-Brie" },
  { src: thedansant9, alt: "Thé Dansant Sucy-en-Brie" },
  { src: thedansant10, alt: "Thé Dansant Sucy-en-Brie" },
  { src: thedansant11, alt: "Thé Dansant Sucy-en-Brie" },
  { src: thedansant12, alt: "Thé Dansant Sucy-en-Brie" },
];

export const flyerImages: FlyerImage[] = [
  { src: thedansant20261, alt: "Flyer Thé Dansant 2026 - Part 1" },
  { src: thedansant20262, alt: "Flyer Thé Dansant 2026 - Part 2" },
];

export const villepartners: Partner[] = [
  {
    src: logoSucy,
    alt: "Ville de Sucy-en-Brie",
    link: "https://www.ville-sucy.fr/",
  },
];

export const assopartners: Partner[] = [
  { src: kifekoi, alt: "kifekoi", link: "https://kifekoisucy.fr/" },
  { src: confrerie, alt: "confrerie", link: "https://confrerie-sucy.fr/" },
  { src: sla, alt: "sla", link: "https://sla-sucy.fr/" },
  { src: cmontaleau, alt: "montaleau", link: "http://www.club-montaleau.fr/" },
];

export const commercepartners: Partner[] = [
  {
    src: arbre,
    alt: "L'Arbre ô jeux",
    link: "https://www.larbreojeux.fr/",
  },
  {
    src: boulangerie,
    alt: "boulangerie saint honoré",
    link: "https://share.google/y1oaJVB9eWm6SO3Jt",
  },
  {
    src: beperfect,
    alt: "beperfect",
    link: "https://www.planity.com/be-perfect-sucy-en-brie-94370",
  },
  {
    src: oiseau,
    alt: "oiseaumoqueur",
    link: "https://www.sucyofcourses.fr/l-oiseau-moqueur",
  },
  {
    src: isabelle,
    alt: "isabellechaussures",
    link: "https://www.facebook.com/chaussuresisabelle94/?locale=fr_FR",
  },
  {
    src: minedor,
    alt: "minedor",
    link: "https://www.mine-or.com/",
  },
  {
    src: madeinsens,
    alt: "madeinsens",
    link: "https://madeinsens.com/",
  },
];