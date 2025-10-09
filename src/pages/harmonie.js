/* eslint-disable react/no-unescaped-entities */
import Layout from "../components/Layout";
import ExportedImage from "next-image-export-optimizer";
import harmoniePng1 from "../../public/images/harmonie25.png";
import i from "../../public/images/i.png";

const Harmonie = () => {
  return (
    <Layout
      title="L'Harmonie Municipale de Sucy-en-Brie"
      description="L'Harmonie Municipale de Sucy-en-Brie"
    >
      <section className="py-16">
        <div className="mx-auto max-w-[1320px]">
          <h2 className="font-secondary font-bold leading-tight text-black dark:text-darkmode-light text-h2-sm md:text-h2 mb-8 text-center">
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
          <div className="content">
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
          <div className="row rounded-2xl bg-primary mt-16">
            <div className="col-12 md:col-3 md:my-6 px-16 px-10 py-6 md:py-10 border-b-4 md:border-b-0 md:border-r-4">
              <ExportedImage
                className="w-[100px] h-auto md:w-[500px] mx-auto"
                src={i}
                sizes="10vw"
                alt="i"
                priority
              />
            </div>
            <div className="col-12 md:col-9 text-center md:text-left text-white md:pl-16 py-6 md:py-10">
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
        </div>
      </section>
    </Layout>
  );
};

export default Harmonie;
