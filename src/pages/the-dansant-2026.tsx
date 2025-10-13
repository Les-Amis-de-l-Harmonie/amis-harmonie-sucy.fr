import Layout from "../components/Layout";
import ExportedImage from "next-image-export-optimizer";
import Link from "next/link";
import Youtube from "../components/Youtube";

import thedansant20261 from "../../public/images/thedansant20261.png";
import thedansant20262 from "../../public/images/thedansant20262.png";
import logoSucy from "../../public/images/logo-sucy.png";
import sla from "../../public/images/logo-sla.png";
import beperfect from "../../public/images/beperfect.jpg";
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

const photos = [
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

const flyerImages = [
  { src: thedansant20261, alt: "Flyer Thé Dansant 2026 - Part 1" },
  { src: thedansant20262, alt: "Flyer Thé Dansant 2026 - Part 2" },
];

const partners = [
  { src: logoSucy, alt: "Ville de Sucy-en-Brie", link: "https://www.ville-sucy.fr/" },
  { src: kifekoi, alt: "kifekoi", link: "https://kifekoisucy.fr/" },
  { src: confrerie, alt: "confrerie", link: "https://confrerie-sucy.fr/" },
  { src: sla, alt: "sla", link: "https://sla-sucy.fr/" },
  { src: cmontaleau, alt: "montaleau", link: "http://www.club-montaleau.fr/" },
  { src: beperfect, alt: "beperfect", link: "https://www.planity.com/be-perfect-sucy-en-brie-94370" },
];

const TheDansant2026 = () => {
  return (
    <Layout title="Thé Dansant - Dimanche 01 février 2026 - 14H">
      <div className="py-16">
        <div className="mx-auto max-w-[1320px] px-4">
          {/* Title and Flyer */}
          <section className="text-center mb-12 flex flex-col gap-8">
            <div>
            <h1 className="font-secondary font-bold leading-tight text-black text-h1-sm md:text-h1 mb-8">
              Thé Dansant 2026
            </h1>
            <h2 className="font-secondary font-bold leading-tight text-black md:text-h5">
              Dimanche 01 février 2026 - 14H - Sucy-en-Brie
            </h2>
            </div>
            <div>
            <Link
              href="https://www.helloasso.com/associations/les-amis-de-l-harmonie/evenements/the-dansant-2026-sucy-en-brie"
              target="_blank"
              className="inline-block bg-primary text-white rounded-4xl py-3 px-12 font-bold text-lg hover:bg-primary-dark transition"
            >
              Réserver maintenant
            </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 justify-center gap-4 mb-8 w-full">
              {flyerImages.map((flyer) => (
                <ExportedImage
                  key={flyer.alt}
                  src={flyer.src}
                  alt={flyer.alt}
                  className="rounded-lg shadow-md"
                  // sizes="50vw"
                />
              ))}
            </div>
          </section>

          {/* Description */}
          <section className="mb-12">
            <h2 className="font-secondary font-bold text-h2-sm md:text-h2 mb-4 text-center">
              À propos de l&apos;événement
            </h2>
            <p className="text-lg text-gray-700 text-center max-w-4xl mx-auto">
              Plongez dans une journée inoubliable de danse et de musique au
              cœur de Sucy-en-Brie ! Organisé en partenariat avec la ville, ce
              Thé Dansant emblématique réunit deux orchestres exceptionnels pour
              plus de 4 heures de rythmes enivrants. L&apos;Harmonie Municipale,
              avec ses 30 talentueux musiciens, vous emportera dans un
              répertoire festif et varié, tandis que le Picotango Orquesta,
              maître du tango argentin passionné, fera vibrer vos pas de danse
              avec élégance et sensualité. Que vous soyez amateur de valses
              traditionnelles ou de tangos enflammés, cette fusion unique de
              styles vous ravira et créera une atmosphère magique, parfaite pour
              partager des moments de joie en famille ou entre amis. Ne manquez
              pas cet événement incontournable d&apos;Île-de-France, où la
              musique célèbre la vie !
            </p>
          </section>

          {/* Reservation Button */}
          <section className="text-center mb-12">
            <Link
              href="https://www.helloasso.com/associations/les-amis-de-l-harmonie/evenements/the-dansant-2026-sucy-en-brie"
              target="_blank"
              className="inline-block bg-primary text-white rounded-4xl py-3 px-12 font-bold text-lg hover:bg-primary-dark transition"
            >
              Réserver maintenant
            </Link>
          </section>

          {/* YouTube Video */}
          <section className="mb-12">
            <div className="grid gird-col-1 md:grid-cols-2 gap-8 justify-center">
              <div>
                <Youtube id="iZwfSjflbKA" title="Thé Dansant 2025" />
              </div>
              <div>
                <Youtube id="ze4b6Br0qCI" title="Thé Dansant 2024" />
              </div>
            </div>
          </section>

          

          {/* Partners */}
          <section>
            <h2 className="font-secondary font-bold text-h2-sm md:text-h2 mb-4 text-center">
              Nos partenaires
            </h2>
            <p className="text-lg text-gray-700 text-center max-w-4xl mx-auto">
              Cet événement est organisé en partenariat avec la Ville de Sucy-en-Brie, dont le soutien et l’engagement rendent possible la tenue de cette belle journée festive.
              <br/><br/>Les adhérents des associations partenaires (SLA, Kifekoi?, La Confrérie des Coteaux, Le Club Montaleau) bénéficient d’un tarif préférentiel pour le Thé Dansant, symbole de notre collaboration et de notre volonté de favoriser la convivialité et le partage.
              <br/><br/>Nous remercions chaleureusement les entreprises et commerçants Sucyciens, dont la participation et la générosité contribuent à faire de cette journée un moment unique.
              Leurs dons permettront d’organiser, pour la première fois, une tombola, une belle occasion pour nous de valoriser les acteurs locaux et de mettre en lumière leur engagement à nos côtés.
              <br/><br/>
            </p>
            <div className="flex flex-wrap justify-center gap-8">
              {partners.map((partner) => (
                            <Link
              href={partner.link}
              key={partner.alt}
              target="_blank"
              className=""
            >
<ExportedImage
                  
                  src={partner.src}
                  alt={partner.alt}
                  className="h-16 w-auto"
                  sizes="100px"
                />
                </Link>
              ))}
            </div>
          </section>
          {/* Photos */}
          <section className="mb-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <div key={photo.alt} className="w-full aspect-3/2">
                  <ExportedImage
                    src={photo.src}
                    alt={photo.alt}
                    className="rounded-lg shadow-md object-cover w-full h-full"
                    sizes="33vw"
                  />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default TheDansant2026;
