/* eslint-disable react/no-unescaped-entities */
import Layout from "../components/Layout";
import ExportedImage from "next-image-export-optimizer";
import estelle from "../../public/images/estelle.png";
import maxime from "../../public/images/maxime.png";
import david from "../../public/images/david.png";
import mario from "../../public/images/mario.png";
import andrea from "../../public/images/andrea.png";
import marcel from "../../public/images/marcel.png";
import carole from "../../public/images/carole.png";

import thedansant1 from "../../public/images/thedansant1.jpg";
import thedansant2 from "../../public/images/thedansant2.jpg";
import thedansant3 from "../../public/images/thedansant3.jpg";

import { StaticImageData } from "next/image";

export interface Photo {
  src: StaticImageData;
  alt: string;
}

export const photos: Photo[] = [
  { src: thedansant1, alt: "Thé Dansant Sucy-en-Brie" },
  { src: thedansant2, alt: "Thé Dansant Sucy-en-Brie" },
  { src: thedansant3, alt: "Thé Dansant Sucy-en-Brie" },
];

const About = () => {
  return (
    <Layout title="L'Association" description="À Propos de l'Association">
      <section className="py-16">
        <div className="mx-auto max-w-[1320px] px-4">
          <h2 className="font-secondary font-bold leading-tight text-black text-h2-sm md:text-h2 mb-8 text-center">
            L'Association
          </h2>
          <div className="prose max-w-none">
            <p>
              Chez "Les Amis de l'Harmonie", la passion pour la musique et la
              vie associative s'entrelacent pour créer une expérience musicale
              enrichissante et conviviale.
            </p>
            <p>
              Notre association se consacre avant tout à épauler l'Harmonie
              Municipale dans ses activités quotidiennes et lors de ses
              prestations publiques. Que ce soit lors des fêtes locales, des
              cérémonies patriotiques, ou encore des concerts que nous
              organisons, l'agenda de l'orchestre est toujours bien rempli.
              Cependant, notre soutien ne se limite pas à la scène; nous sommes
              également impliqués dans la logistique, la communication, la
              gestion administrative, et d'autres tâches essentielles qui
              facilitent le bon déroulement et l'évolution de l'orchestre.
            </p>
            <p>
              Grâce à un bureau dynamique, un site internet interactif, et une
              présence active sur les réseaux sociaux, nous offrons une fenêtre
              ouverte sur l'Harmonie. Nous proposons également une variété
              d'événements exclusifs et d'avantages pour nos membres, tous
              tournés autour de la musique et de la culture, renforçant ainsi
              les liens.
            </p>
            <p>
              Adhérer à notre association, c'est rejoindre une famille musicale
              ! Vous pouvez dès maintenant devenir membre en ligne via notre
              site internet, où vous trouverez également l'agenda complet et
              toutes les informations pertinentes concernant l'Harmonie
              Municipale et les Amis de l'Harmonie.
            </p>
            <p>
              Venez, participez, et laissez la musique de l'Harmonie de
              Sucy-en-Brie vous inspirer et vous réunir!
            </p>
          </div>
          <div>
            <a href="https://drive.google.com/file/d/1rVXEI46FWbo0NTyN9MzTsuIL0zYR1HGp/view?usp=sharing">
              Plaquette de présentation de l'association
            </a>
            <br />
            <a href="https://drive.google.com/file/d/1hG9ppax_pNDczalp60psIq7C070SKsgk/view?usp=sharing">
              Statuts de l'association
            </a>
            <br />
            <a href="https://drive.google.com/file/d/1tVo5Wgq7rWl2-KrCjhxo3E6SUfO_8qRM/view?usp=drive_link">
              Réglement intérieur de l'association
            </a>
            <br />
            <br />
            <br />
          </div>
          <div className="flex flex-wrap text-center md:max-w-[1000px] md:m-auto justify-center">
            <div className="w-full sm:w-1/2 md:w-1/3 md:max-w-[275px] mb-3">
              <ExportedImage
                className="mb-3"
                src={maxime}
                sizes="33vw"
                alt="maxime"
                priority
              />
              <h5 className="text-primary">Maxime Leduc</h5>
              <p>Président</p>
              <p>Saxophoniste de l'Harmonie</p>
            </div>
            <div className="w-full sm:w-1/2 md:w-1/3 md:max-w-[275px] mb-3">
              <ExportedImage
                className="mb-3"
                src={andrea}
                sizes="33vw"
                alt="andrea"
                priority
              />
              <h5 className="text-primary">Andréa</h5>
              <p>Vice-Présidente</p>
              <p>Percussionniste de l'Harmonie</p>
            </div>
            <div className="w-full sm:w-1/2 md:w-1/3 md:max-w-[275px] mb-3">
              <ExportedImage
                className="mb-3"
                src={david}
                sizes="33vw"
                alt="david"
                priority
              />
              <h5 className="text-primary">David Brunet</h5>
              <p>Directeur musical</p>
              <p>Chef d'orchestre de l'Harmonie</p>
            </div>
            <div className="w-full sm:w-1/2 md:w-1/3 md:max-w-[275px] mb-3">
              <ExportedImage
                className="mb-3"
                src={carole}
                sizes="33vw"
                alt="carole"
                priority
              />
              <h5 className="text-primary">Carole Siméone</h5>
              <p>Trésorière</p>
              <p>Saxophoniste de l'Harmonie</p>
            </div>
            <div className="w-full sm:w-1/2 md:w-1/3 md:max-w-[275px] mb-3">
              <ExportedImage
                className="mb-3"
                src={mario}
                sizes="33vw"
                alt="mario"
                priority
              />
              <h5 className="text-primary">Mario Nunes</h5>
              <p>Trésorier adjoint</p>
              <p>Parent d'un musicien de l'Harmonie</p>
            </div>
            <div className="w-full sm:w-1/2 md:w-1/3 md:max-w-[275px] mb-3">
              <ExportedImage
                className="mb-3"
                src={estelle}
                sizes="33vw"
                alt="estelle"
                priority
              />
              <h5 className="text-primary">Estelle Debache</h5>
              <p>Responsable communication</p>
              <p>Percussionniste de l'Harmonie</p>
            </div>
            <div className="w-full sm:w-1/2 md:w-1/3 md:max-w-[275px] mb-3">
              <ExportedImage
                className="mb-3"
                src={marcel}
                sizes="33vw"
                alt="marcel"
                priority
              />
              <h5 className="text-primary">Marcel Hamon</h5>
              <p>Membre</p>
              <p>Chef adjoint et percussionniste de l'Harmonie</p>
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

export default About;
