/* eslint-disable react/no-unescaped-entities */
import Layout from "../components/Layout";
import ExportedImage from "next-image-export-optimizer";
import estelle from "../public/images/estelle.png";
import maxime from "../public/images/maxime.png";
import david from "../public/images/david.png";
import mario from "../public/images/mario.png";
import andrea from "../public/images/andrea.png";
import marcel from "../public/images/marcel.png";
import carole from "../public/images/carole.png";

const About = () => {
  return (
    <Layout title="L'Association" description="À Propos de l'Association">
      <section className="py-16">
        <div className="mx-auto max-w-[1320px]">
          <h2 className="font-secondary font-bold leading-tight text-black dark:text-darkmode-light text-h2-sm md:text-h2 mb-8 text-center">
            L'Association
          </h2>
          <div className="prose max-w-none prose-headings:mt-[.5em] prose-headings:mb-[.9em] prose-headings:font-bold prose-headings:text-dark prose-headings:dark:text-white prose-h1:text-h1-sm md:prose-h1:text-h1 prose-h2:text-h2-sm md:prose-h2:text-h2 prose-h3:text-h3-sm md:prose-h3:text-h3 prose-hr:border-border prose-hr:dark:border-darkmode-border prose-p:text-base prose-p:text-text prose-p:dark:text-darkmode-light prose-blockquote:mb-12 prose-blockquote:rounded prose-blockquote:border-0 prose-blockquote:bg-theme-light prose-blockquote:py-1 prose-blockquote:px-12 prose-blockquote:not-italic prose-blockquote:dark:bg-theme-dark prose-blockquote:lg:px-16 prose-code:px-1 prose-code:text-primary prose-pre:rounded prose-img:rounded prose-table:rounded prose-strong:text-dark prose-strong:dark:text-darkmode-light prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-li:text-text prose-li:dark:text-darkmode-light prose-table:overflow-hidden prose-table:border prose-table:border-border prose-table:dark:border-darkmode-border prose-thead:border-border prose-thead:bg-theme-light prose-th:py-4 prose-th:px-4 prose-th:text-dark prose-thead:dark:border-darkmode-border prose-thead:dark:bg-theme-dark prose-th:dark:text-darkmode-light prose-tr:border-border prose-tr:dark:border-darkmode-border prose-td:px-3 prose-td:py-4 prose-td:dark:text-darkmode-light prose-li:marker:dark:text-darkmode-light">
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
          <div className="row text-center md:max-w-[1000px] md:m-auto justify-center">
            <div className="col-12 sm:col-6 md:col-4 md:max-w-[275px] mb-3">
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
            <div className="col-12 sm:col-6 md:col-4 md:max-w-[275px] mb-3">
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
            <div className="col-12 sm:col-6 md:col-4 md:max-w-[275px] mb-3">
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
            <div className="col-12 sm:col-6 md:col-4 md:max-w-[275px] mb-3">
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
            <div className="col-12 sm:col-6 md:col-4 md:max-w-[275px] mb-3">
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
            <div className="col-12 sm:col-6 md:col-4 md:max-w-[275px] mb-3">
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
            <div className="col-12 sm:col-6 md:col-4 md:max-w-[275px] mb-3">
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
        </div>
      </section>
    </Layout>
  );
};

export default About;
