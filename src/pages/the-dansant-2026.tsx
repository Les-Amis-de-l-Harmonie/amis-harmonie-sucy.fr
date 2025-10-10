import Layout from "../components/Layout";
import ExportedImage from "next-image-export-optimizer";
import Link from "next/link";
import Youtube from "../components/Youtube";

import thedansant20261 from "../../public/images/thedansant20261.png";
import thedansant20262 from "../../public/images/thedansant20262.png";
import evt010226 from "../../public/images/evt010226.png";
import rencontreharmonies1 from "../../public/images/rencontreharmonies1.png";
import rencontreharmonies2 from "../../public/images/rencontreharmonies2.png";
import logoSucy from "../../public/images/logo-sucy.png";
import logoCmf from "../../public/images/logo-cmf.png";
import sla from "../../public/images/logo-sla.png";
import cmontaleau from "../../public/images/logo-clubmontaleau.jpeg";
import kifekoi from "../../public/images/logo-kifekoi.png";
import confrerie from "../../public/images/logo-confrerie.jpeg";

const TheDansant2026 = () => {
  return (
    <Layout title="Thé Dansant - Dimanche 01 février 2026 - 14H">
      <div className="py-16">
        <div className="mx-auto max-w-[1320px] px-4">
          {/* Title and Flyer */}
          <section className="text-center mb-12">
            <h1 className="font-secondary font-bold leading-tight text-black text-h1-sm md:text-h1 mb-8">
              Le plus Grand Thé Dansant d&apos;Ile-de-France
            </h1>
            <h2 className="font-secondary font-bold leading-tight text-black md:text-h3 mb-8">
              Dimanche 01 février 2026 - 14H - Sucy-en-Brie
            </h2>
            <div className="flex justify-center gap-4 mb-8 w-full">
              <ExportedImage
                src={thedansant20261}
                alt="Flyer Thé Dansant 2026 - Part 1"
                className="rounded-lg shadow-md w-full"
                // sizes="50vw"
              />
              <ExportedImage
                src={thedansant20262}
                alt="Flyer Thé Dansant 2026 - Part 2"
                className="rounded-lg shadow-md w-full"
                // sizes="50vw"
              />
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
            <h2 className="font-secondary font-bold text-h2-sm md:text-h2 mb-4 text-center">
              Revivez le Thé Dansant 2025
            </h2>
            <div className="flex justify-center">
              <div className="w-full max-w-2xl">
                <Youtube id="iZwfSjflbKA" title="Thé Dansant 2025" />
              </div>
            </div>
          </section>

          {/* Photos */}
          <section className="mb-12">
            <h2 className="font-secondary font-bold text-h2-sm md:text-h2 mb-4 text-center">
              Photos de l&apos;évènement
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ExportedImage
                src={evt010226}
                alt="Événement 2026"
                className="rounded-lg shadow-md"
                sizes="33vw"
              />
              <ExportedImage
                src={rencontreharmonies1}
                alt="Rencontre d'Harmonies 1"
                className="rounded-lg shadow-md"
                sizes="33vw"
              />
              <ExportedImage
                src={rencontreharmonies2}
                alt="Rencontre d'Harmonies 2"
                className="rounded-lg shadow-md"
                sizes="33vw"
              />
            </div>
          </section>

          {/* Partners */}
          <section>
            <h2 className="font-secondary font-bold text-h2-sm md:text-h2 mb-4 text-center">
              Nos partenaires
            </h2>
            <div className="flex justify-center gap-8">
              <ExportedImage
                src={logoSucy}
                alt="Ville de Sucy-en-Brie"
                className="h-16 w-auto"
                sizes="100px"
              />
              <ExportedImage
                src={logoCmf}
                alt="Confédération Musicale de France"
                className="h-16 w-auto"
                sizes="100px"
              />
              <ExportedImage
                className="h-16 w-auto"
                src={kifekoi}
                sizes="100px"
                alt="kifekoi"
              />
              <ExportedImage
                className="h-16 w-auto"
                src={confrerie}
                sizes="100px"
                alt="confrerie"
              />
              <ExportedImage
                className="h-16 w-auto"
                src={sla}
                sizes="100px"
                alt="sla"
              />
              <ExportedImage
                className="h-16 w-auto"
                src={cmontaleau}
                sizes="100px"
                alt="montaleau"
              />
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default TheDansant2026;
