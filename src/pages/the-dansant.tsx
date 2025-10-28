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
    <Layout title="Thé Dansant - Dimanche 01 février 2026 - 14H">
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

            <PartnersSection
              title="Commerçants partenaires"
              description="Nous remercions chaleureusement les entreprises et commerçants Sucyciens, dont la participation et la générosité contribuent à faire de cette journée un moment unique. Leurs dons permettront d'organiser pour la première fois une tombola, une belle occasion pour nous de valoriser les acteurs locaux et de mettre en lumière leur engagement à nos côtés."
              partners={commercepartners}
              
            />
         

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
