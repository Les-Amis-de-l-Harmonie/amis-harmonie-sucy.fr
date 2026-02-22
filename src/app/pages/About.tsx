import { getGalleryImages } from "@/app/shared/gallery";
import { ScrollReveal } from "@/app/components/ScrollReveal";

export async function About() {
  const pageTitle = "L'Association | Les Amis de l'Harmonie de Sucy";
  const pageDescription =
    "Découvrez Les Amis de l'Harmonie de Sucy-en-Brie, notre bureau et notre mission : soutenir l'Harmonie Municipale et promouvoir la musique.";

  const [teamImages, galleryImages] = await Promise.all([
    getGalleryImages("team"),
    getGalleryImages("association_gallery"),
  ]);

  return (
    <>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content="https://amis-harmonie-sucy.fr/about" />
      <link rel="canonical" href="https://amis-harmonie-sucy.fr/about" />
      <section className="py-12">
        <div className="mx-auto max-w-[1320px] px-4">
          <ScrollReveal>
            <h1 className="font-['Merriweather_Sans'] text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-8 text-center">
              L'Association
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={100} className="prose prose-gray dark:prose-invert max-w-none mb-8">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Chez "Les Amis de l'Harmonie", la passion pour la musique et la vie associative
              s'entrelacent pour créer une expérience musicale enrichissante et conviviale.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Notre association se consacre avant tout à épauler l'Harmonie Municipale dans ses
              activités quotidiennes et lors de ses prestations publiques. Que ce soit lors des
              fêtes locales, des cérémonies patriotiques, ou encore des concerts que nous
              organisons, l'agenda de l'orchestre est toujours bien rempli. Cependant, notre soutien
              ne se limite pas à la scène; nous sommes également impliqués dans la logistique, la
              communication, la gestion administrative, et d'autres tâches essentielles qui
              facilitent le bon déroulement et l'évolution de l'orchestre.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Grâce à un bureau dynamique, un site internet interactif, et une présence active sur
              les réseaux sociaux, nous offrons une fenêtre ouverte sur l'Harmonie. Nous proposons
              également une variété d'événements exclusifs et d'avantages pour nos membres, tous
              tournés autour de la musique et de la culture, renforçant ainsi les liens.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Adhérer à notre association, c'est rejoindre une famille musicale ! Vous pouvez dès
              maintenant devenir membre en ligne via notre site internet, où vous trouverez
              également l'agenda complet et toutes les informations pertinentes concernant
              l'Harmonie Municipale et les Amis de l'Harmonie.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Venez, participez, et laissez la musique de l'Harmonie de Sucy-en-Brie vous inspirer
              et vous réunir!
            </p>
          </ScrollReveal>

          <ScrollReveal delay={200} className="mb-12">
            <a
              href="https://drive.google.com/file/d/1rVXEI46FWbo0NTyN9MzTsuIL0zYR1HGp/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline block"
            >
              Plaquette de présentation de l'association
            </a>
            <a
              href="https://drive.google.com/file/d/1hG9ppax_pNDczalp60psIq7C070SKsgk/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline block"
            >
              Statuts de l'association
            </a>
            <a
              href="https://drive.google.com/file/d/1tVo5Wgq7rWl2-KrCjhxo3E6SUfO_8qRM/view?usp=drive_link"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline block"
            >
              Réglement intérieur de l'association
            </a>
          </ScrollReveal>

          <div className="flex flex-wrap text-center md:max-w-[1000px] md:mx-auto justify-center mb-16">
            {teamImages.map((member, index) => {
              const name = member.alt_text || "";
              const role = member.link_name?.includes(" - ")
                ? member.link_name.split(" - ").slice(1).join(" - ")
                : member.link_name || "";
              return (
                <ScrollReveal
                  key={member.id}
                  delay={index * 100}
                  className="w-full sm:w-1/2 md:w-1/3 max-w-[275px] mb-6 px-2"
                >
                  <img src={member.image_url} alt={name} className="mb-3 w-full" loading="lazy" />
                  <h5 className="text-primary font-bold">{name}</h5>
                  <p className="text-gray-700 dark:text-gray-300">{role}</p>
                </ScrollReveal>
              );
            })}
          </div>

          <div className="mt-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {galleryImages.map((image, index) => (
                <ScrollReveal key={image.id} delay={index * 80}>
                  <div className="w-full aspect-[3/2]">
                    <img
                      src={image.image_url}
                      alt={image.alt_text || ""}
                      className="rounded-lg shadow-md object-cover w-full h-full"
                      loading="lazy"
                    />
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
