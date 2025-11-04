/* eslint-disable react/no-unescaped-entities */
import Layout from "../components/Layout";
import ExportedImage from "next-image-export-optimizer";
import harmoniePng1 from "../../public/images/harmonie25.png";
import i from "../../public/images/i.png";

import harmonie6 from "../../public/images/harmonie6.jpg";
import harmonie7 from "../../public/images/harmonie7.jpg";
import harmonie8 from "../../public/images/harmonie8.jpg";
import harmonie9 from "../../public/images/harmonie9.jpg";
import harmonie10 from "../../public/images/harmonie10.jpg";
import harmonie11 from "../../public/images/harmonie11.jpg";
import harmonie12 from "../../public/images/harmonie12.jpg";
import harmonie13 from "../../public/images/harmonie13.jpg";
import harmonie14 from "../../public/images/harmonie14.jpg";
import harmonie15 from "../../public/images/harmonie15.jpg";
import harmonie16 from "../../public/images/harmonie16.jpeg";
import harmonie17 from "../../public/images/harmonie17.png";
import harmonie18 from "../../public/images/harmonie18.jpg";
import harmonie19 from "../../public/images/harmonie19.jpg";
import harmonie20 from "../../public/images/harmonie20.jpg";
import harmonie21 from "../../public/images/harmonie21.jpg";
import harmonie22 from "../../public/images/harmonie22.jpg";
import harmonie23 from "../../public/images/harmonie23.jpg";
import harmonie24 from "../../public/images/harmonie24.jpg";
import harmonie25 from "../../public/images/harmonie25.jpg";
import harmonie26 from "../../public/images/harmonie26.jpg";
import harmonie27 from "../../public/images/harmonie27.jpg";
import harmonie28 from "../../public/images/harmonie28.jpg";
import harmonie29 from "../../public/images/harmonie29.jpg";
import harmonie30 from "../../public/images/harmonie30.jpg";
import harmonie31 from "../../public/images/harmonie31.jpg";
import harmonie32 from "../../public/images/harmonie32.jpg";
import harmonie33 from "../../public/images/harmonie33.jpg";
import harmonie34 from "../../public/images/harmonie34.jpg";
import harmonie35 from "../../public/images/harmonie35.jpg";
import harmonie36 from "../../public/images/harmonie36.jpg";
import harmonie37 from "../../public/images/harmonie37.jpg";
import harmonie38 from "../../public/images/harmonie38.png";
import harmonie39 from "../../public/images/harmonie39.png";
import harmonie40 from "../../public/images/harmonie40.png";
import harmonie41 from "../../public/images/harmonie41.jpg";
import harmonie42 from "../../public/images/harmonie42.png";
import harmonie43 from "../../public/images/harmonie43.jpg";
import harmonie44 from "../../public/images/harmonie44.jpg";
import harmonie45 from "../../public/images/harmonie45.png";

import { StaticImageData } from "next/image";

export interface Photo {
  src: StaticImageData;
  alt: string;
}

export const photos: Photo[] = [
  { src: harmonie44, alt: "" },
  { src: harmonie43, alt: "" },
  { src: harmonie45, alt: "" },
  { src: harmonie40, alt: "" },
  { src: harmonie8, alt: "" },
  { src: harmonie9, alt: "" },
  { src: harmonie10, alt: "" },
  { src: harmonie11, alt: "" },
  { src: harmonie12, alt: "" },
  { src: harmonie13, alt: "" },
  { src: harmonie14, alt: "" },
  { src: harmonie15, alt: "" },
  { src: harmonie16, alt: "" },
  { src: harmonie17, alt: "" },
  { src: harmonie18, alt: "" },
  { src: harmonie19, alt: "" },
  { src: harmonie20, alt: "" },
  { src: harmonie21, alt: "" },
  { src: harmonie22, alt: "" },
  { src: harmonie23, alt: "" },
  { src: harmonie25, alt: "" },
  { src: harmonie26, alt: "" },
  { src: harmonie7, alt: "" },
  { src: harmonie27, alt: "" },
  { src: harmonie29, alt: "" },
  { src: harmonie30, alt: "" },
  { src: harmonie31, alt: "" },
  { src: harmonie32, alt: "" },
  { src: harmonie33, alt: "" },
  { src: harmonie34, alt: "" },
  { src: harmonie35, alt: "" },
  { src: harmonie37, alt: "" },
  { src: harmonie38, alt: "" },
  { src: harmonie39, alt: "" },
  { src: harmonie41, alt: "" },
  { src: harmonie42, alt: "" },
];

const Harmonie = () => {
  return (
    <Layout
      title="L'Harmonie Municipale - Sucy-en-Brie"
      description="Découvrez l'Harmonie Municipale de Sucy-en-Brie, un orchestre d'harmonie amateur composé de 35 musiciens passionnés. Fondée il y a plus de 160 ans, elle anime la vie culturelle locale avec des concerts variés, des cérémonies patriotiques et des événements festifs. Apprenez-en plus sur son répertoire éclectique, ses répétitions hebdomadaires et comment rejoindre cette formation musicale emblématique de Sucy-en-Brie."
    >
      <section className="py-16">
        <div className="mx-auto max-w-[1320px]">
          <h2 className="font-secondary font-bold leading-tight text-black text-h2-sm md:text-h2 mb-8 text-center">
            L'Harmonie Municipale de Sucy-en-Brie
          </h2>
          <ExportedImage
            className=""
            src={harmoniePng1}
            sizes="100vw"
            alt="banner-harmonie"
            priority
            placeholder="empty"
          />
          <div className="flex flex-col gap-3 pt-4 px-4">
            <p>
              L'harmonie municipale de Sucy-en-Brie s'inscrit dans une longue
              tradition d'orchestres amateurs apparus à la fin du XIXe siècle.
              Elle fêtera ses 160 ans en 2027.
            </p>
            <p>
              Aujourd'hui fort de ses 35 musiciens, elle se veut un outil
              municipal d'animation au service des territoires qui composent
              notre commune.
            </p>
            <p>
              Son répertoire éclectique lui permet de s'adresser à tous les
              publics quel que soit le cadre ; officiel pour les cérémonies,
              concerts de la saison culturelle et associatif, avec les fêtes de
              quartier, d'école…
            </p>
            <p>
              Elle accueille essentiellement des musiciens amateurs et parfois
              en renfort, à certaines occasions, des musiciens professionnels
              professeurs au conservatoire.
            </p>
            <p>
              Son orchestre est composé principalement des instruments de la
              famille des vents et des percussions.
            </p>
            <p>
              Sont représentées, les familles des flûtes traversières, des
              clarinettes, des saxophones (soprano, alto, ténor, baryton), des
              trompettes, trombones, euphoniums et tubas. Sans oublier la grande
              famille des percussions avec la batterie, les percussions
              traditionnelles et les percussions d'orchestre. Et comme il faut
              toujours une exception qui confirme la règle, nous avons la chance
              de compter parmi nous une contrebasse.
            </p>
            <p>
              L'harmonie a aussi à sa disposition une association « Les Amis de
              l'Harmonie » regroupant tous ceux qui souhaitent soutenir et
              participer au rayonnement de notre orchestre, dans et en dehors du
              cadre municipal. Elle organise le thé-dansant et régulièrement des
              déplacements culturels et musicaux en région et bientôt à
              l'étranger.
            </p>
            <p>
              Les répétitions se déroulent tous les vendredis soirs de 19h30 à
              21h30 à l'auditorium du conservatoire.
            </p>
            <p>Direction : David BRUNET</p>
            <p>Sous-direction : Marcel HAMON</p>
          </div>
          <div className="flex flex-wrap rounded-2xl bg-primary mt-16">
            <div className="w-full md:w-1/4 md:my-6 px-10 py-6 md:py-10 border-b-4 md:border-b-0 md:border-r-4">
              <ExportedImage
                className="w-[100px] h-auto md:w-[500px] mx-auto"
                src={i}
                sizes="10vw"
                alt="i"
                priority
              />
            </div>
            <div className="w-full md:w-3/4 text-center md:text-left text-white md:pl-16 py-6 md:py-10 px-4">
              <p className="pb-6">
                <strong>Venez renforcer l'harmonie municipale !</strong>
              </p>
              <p className="pb-6">
                L'orchestre est ouvert à tous les musiciens pratiquant un
                instrument à vent ou jouant des percussions quel que soit son
                âge et à partir du moment où il peut justifier d'un niveau lui
                permettant de s'intégrer facilement à l'orchestre.
              </p>
              <p className="pb-6">
                Pour les élèves du conservatoire, l'harmonie municipale devient
                obligatoire pour une validation de leur scolarité à partir du
                3ième Cycle. Elle leur permet aussi de bénéficier d'une
                réduction de 50 % sur leur scolarité.
              </p>
              <p>
                Aussi, grâce au partenariat signé avec l'association "Les Amis
                de l'Harmonie", tous les musiciens de l'orchestre bénéficient de
                -50% à l'atelier Grain de Vent, luthier basé à Sucy-en-Brie.
              </p>
            </div>
          </div>
          <div className="mt-16">
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
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Harmonie;
