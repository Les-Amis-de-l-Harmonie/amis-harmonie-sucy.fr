import Layout from "../components/Layout";
import ExportedImage from "next-image-export-optimizer";
import Youtube from "../components/Youtube";
import EventReservationButton from "../components/EventReservationButton";
import PartnersSection from "../components/PartnersSection";
import {
  photos,
  flyerImages,
  villepartners,
  assopartners,
  commercepartners,
} from "../constants/theDansantData";

const TheDansant2026 = () => {
  return (
    <Layout
      title="Thé Dansant 2026 - Les Amis de l'Harmonie de Sucy-en-Brie"
      description="Réservez pour le Thé Dansant 2026 organisé par l'assocaitions les Amis de l'Harmonie de Sucy-en-Brie. Une journée de danse et musique avec deux orchestres exceptionnels pour 4 heures de rythmes variés : valses, tangos et plus. Initiation au tango, verre offert, pâtisserie et tombola. Événement incontournable à Sucy-en-Brie pour amateurs de musique et danse."
    >
      <div className="pt-16">
        <div className="mx-auto max-w-[1320px] px-4">
          {/* Title and Flyer */}
          <section className="text-center mb-12 flex flex-col gap-8">
            <div>
              <h1 className="font-secondary font-bold leading-tight text-black text-h1-sm md:text-h1 mb-8">
                Thé Dansant 2026
              </h1>
            </div>
            <div>
              <EventReservationButton />
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
            <h3 className="font-secondary font-bold text-h2-sm md:text-h2 mb-4 text-center">
              À propos de l&apos;événement
            </h3>
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
              <br />
              <br />
              Sous le charme du tango, un couple de danseurs professionnels vous
              guidera, pas à pas, lors d&apos;une initiation, dans
              l’apprentissage de cette danse aussi exigeante qu’élégante.
              <br />
              <br />
              Verre de pétillant, pâtisserie et un fruit offert. 🥂🍰🍊
            </p>
            <p className="text-lg text-gray-700 text-center max-w-4xl mx-auto mt-8 bg-yellow-200">
              NOUVEAU : buvette sur place et tombola (2€/ticket, 4 achetés = 1
              offert)
            </p>
          </section>

          {/* Reservation Button */}
          <section className="text-center mb-12">
            <EventReservationButton />
          </section>

          {/* Partners */}
          <section className="mb-12 flex flex-col gap-8">
            <h3 className="font-secondary font-bold text-h2-sm md:text-h2 text-center">
              Nos partenaires
            </h3>

            <PartnersSection
              title="Ville de Sucy-en-Brie"
              description="Cet événement est organisé en partenariat avec la Ville de Sucy-en-Brie, dont le soutien et l’engagement rendent possible la tenue de cette belle journée festive."
              partners={villepartners}
            />
            <h6 className="font-secondary font-bold text-h6-sm md:text-h6 text-center">
              Commerçants
            </h6>
            <PartnersSection
              title="Commerçants partenaires"
              description="Nous remercions chaleureusement les entreprises et commerçants Sucyciens, dont la participation et la générosité contribuent à faire de cette journée un moment unique. Leurs dons permettront d'organiser pour la première fois une tombola, une belle occasion pour nous de valoriser les acteurs locaux et de mettre en lumière leur engagement à nos côtés."
              partners={commercepartners}
            />
            <div className="flex flex-wrap justify-center gap-8 text-purple-700 font-bold ">
              <a href="https://www.facebook.com/p/Les-Petits-Plats-de-Chlo%C3%A9-0650082824-100077768149167/">
                Les Petits Plats de Chloé
              </a>
              <a href="https://lesproduitsdemathilde.fr/">
                Les produits de Mathilde
              </a>
              <a href="https://cordonnerie-leperreux.fr/fr/page/cordonnerie-de-sucy">
                Cordonnerie Sucy
              </a>
              <a href="https://cavepetitverdot.fr/">Le Petit Verdot</a>
              <a href="https://www.facebook.com/p/Le-Quercy-Bar-Brasserie-Restaurant-100063781620749/?locale=fr_FR">
                Le Quercy
              </a>
              <a href="https://www.facebook.com/tomatecerisesucy/">
                Tomate Cerise
              </a>
              <a href="https://www.facebook.com/Stefoptique">
                Opticien Stef&apos; Optique
              </a>
              <a href="https://www.instagram.com/lebonbonchocolat/">
                Le Bonbon Chocolat
              </a>
              <a href="https://www.institut-sucyenbrie.guinot.com/">
                Guinot beauté
              </a>
              <a href="https://lesyeuxdoria-sucy-en-brie.monopticien.com/">
                Les Yeux d&apos;Oria
              </a>
              <a href="https://mendielaoptique-sucyenbrie.monopticien.com/">
                Mendiela Optique
              </a>
              <a href="">La terrasse 94</a>
              <a href="https://www.planity.com/klyc-styl-94370-sucy-en-brie">
                Klyc Styl
              </a>
              <a href="https://bodyminute.com/instituts/sucy-en-brie-3455/">
                Body Minute
              </a>
              <a href="https://www.facebook.com/latelier.sucy?rdid=HkbKOckpafzN0zdn&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2FPvzuovuuVE3v9ui1%2F#">
                L&apos;atelier
              </a>
              <a href="https://www.facebook.com/p/La-Station-Sucy-100093120762211/?locale=fr_FR">
                La Station
              </a>
              
            </div>
            <h6 className="font-secondary font-bold text-h6-sm md:text-h6 text-center">
              Associations
            </h6>
            <PartnersSection
              title="Associations partenaires"
              description="Les adhérents des associations partenaires (SLA, Kifekoi?, La Confrérie des Coteaux, Le Club Montaleau et tous les clubs de danse) bénéficient d'un tarif préférentiel pour le Thé Dansant, symbole de notre collaboration et de notre volonté de favoriser la convivialité et le partage."
              partners={assopartners}
            />
          </section>

          {/* YouTube Video */}
          <section className="mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 justify-center">
              <div className="w-full">
                <Youtube id="iZwfSjflbKA" title="Thé Dansant 2025" />
              </div>
              <div className="w-full">
                <Youtube id="ze4b6Br0qCI" title="Thé Dansant 2024" />
              </div>
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
          {/* Reservation Button */}
          <section className="text-center">
            <EventReservationButton />
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default TheDansant2026;
