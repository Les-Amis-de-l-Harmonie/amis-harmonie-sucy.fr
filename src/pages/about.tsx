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

import asso1 from "../../public/images/1asso.png";
import asso2 from "../../public/images/2asso.jpg";
import asso3 from "../../public/images/3asso.jpg";
import asso4 from "../../public/images/4asso.jpg";
import asso5 from "../../public/images/5asso.jpg";
import asso6 from "../../public/images/6asso.jpg";
import asso7 from "../../public/images/7asso.jpg";
import asso8 from "../../public/images/8asso.jpg";
import asso9 from "../../public/images/9asso.jpg";
import asso10 from "../../public/images/10asso.jpg";
import asso11 from "../../public/images/11asso.jpg";
import asso12 from "../../public/images/12asso.jpg";
import asso13 from "../../public/images/13asso.jpg";
import asso14 from "../../public/images/14asso.jpg";
import asso15 from "../../public/images/15asso.jpg";
import asso16 from "../../public/images/16asso.jpg";
import asso17 from "../../public/images/17asso.jpg";
import asso18 from "../../public/images/18asso.jpg";
import asso19 from "../../public/images/19asso.jpg";
import asso20 from "../../public/images/20asso.jpg";
import asso21 from "../../public/images/21asso.jpg";
import asso22 from "../../public/images/22asso.jpg";
import asso23 from "../../public/images/23asso.jpg";
import asso24 from "../../public/images/24asso.jpg";
import asso25 from "../../public/images/25asso.jpg";
import asso26 from "../../public/images/26asso.jpg";
import asso27 from "../../public/images/27asso.jpg";
import asso28 from "../../public/images/28asso.jpg";
import asso29 from "../../public/images/29asso.jpg";
import asso30 from "../../public/images/30asso.jpg";
import asso31 from "../../public/images/31asso.jpg";
import asso32 from "../../public/images/32asso.jpg";
import asso33 from "../../public/images/33asso.jpg";
import asso34 from "../../public/images/34asso.jpg";
import asso35 from "../../public/images/35asso.jpg";
import asso36 from "../../public/images/36asso.jpg";
import asso37 from "../../public/images/37asso.jpg";



import { StaticImageData } from "next/image";

export interface Photo {
  src: StaticImageData;
  alt: string;
}


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

export const photos: Photo[] = [
  { src: asso1, alt: "" },
  { src: asso2, alt: "" },
  { src: asso3, alt: "" },
  { src: asso4, alt: "" },
  { src: asso5, alt: "" },
  { src: asso6, alt: "" },
  { src: asso8, alt: "" },
  { src: asso9, alt: "" },
  { src: asso10, alt: "" },
  { src: asso11, alt: "" },
  { src: asso12, alt: "" },
  { src: asso13, alt: "" },
  { src: asso14, alt: "" },
  { src: asso15, alt: "" },
  { src: asso16, alt: "" },
  { src: asso17, alt: "" },
  { src: asso18, alt: "" },
  { src: asso19, alt: "" },
  { src: asso20, alt: "" },
  { src: asso21, alt: "" },
  { src: asso22, alt: "" },
  { src: asso23, alt: "" },
  { src: asso24, alt: "" },
  { src: asso25, alt: "" },
  { src: asso26, alt: "" },
  { src: asso27, alt: "" },
  { src: asso28, alt: "" },
  { src: asso29, alt: "" },
  { src: asso30, alt: "" },
  { src: asso31, alt: "" },
  { src: asso32, alt: "" },
  { src: asso33, alt: "" },
  { src: asso34, alt: "" },
  { src: asso35, alt: "" },
  { src: asso36, alt: "" },
  { src: asso37, alt: "" },


];


export default About;
