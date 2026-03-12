import { TheDansantClient } from "./TheDansantClient";
import { getGalleryImages } from "@/app/shared/gallery";
import { ScrollReveal } from "@/app/components/ScrollReveal";

export async function TheDansant() {
  const pageTitle = "Thé Dansant 2026 | Les Amis de l'Harmonie de Sucy";
  const pageDescription =
    "Thé Dansant 2026 à Sucy-en-Brie - Journée de danse et musique avec l'Harmonie Municipale et Picotango Orquesta.";

  const [flyers, sponsors, galleryImages] = await Promise.all([
    getGalleryImages("thedansant_flyers"),
    getGalleryImages("thedansant_sponsors"),
    getGalleryImages("thedansant_gallery"),
  ]);

  const commercantsText = [
    {
      name: "Les Petits Plats de Chloé",
      url: "https://www.facebook.com/p/Les-Petits-Plats-de-Chlo%C3%A9-0650082824-100077768149167/",
    },
    { name: "Les produits de Mathilde", url: "https://lesproduitsdemathilde.fr/" },
    {
      name: "Cordonnerie Sucy",
      url: "https://cordonnerie-leperreux.fr/fr/page/cordonnerie-de-sucy",
    },
    { name: "Le Petit Verdot", url: "https://cavepetitverdot.fr/" },
    {
      name: "Le Quercy",
      url: "https://www.facebook.com/p/Le-Quercy-Bar-Brasserie-Restaurant-100063781620749/?locale=fr_FR",
    },
    { name: "Tomate Cerise", url: "https://www.facebook.com/tomatecerisesucy/" },
    { name: "Opticien Stef' Optique", url: "https://www.facebook.com/Stefoptique" },
    { name: "Le Bonbon Chocolat", url: "https://www.instagram.com/lebonbonchocolat/" },
    { name: "Guinot beauté", url: "https://www.institut-sucyenbrie.guinot.com/" },
    { name: "Les Yeux d'Oria", url: "https://lesyeuxdoria-sucy-en-brie.monopticien.com/" },
    { name: "Mendiela Optique", url: "https://mendielaoptique-sucyenbrie.monopticien.com/" },
    { name: "La terrasse 94", url: "#" },
    { name: "Klyc Styl", url: "https://www.planity.com/klyc-styl-94370-sucy-en-brie" },
    { name: "Body Minute", url: "https://bodyminute.com/instituts/sucy-en-brie-3455/" },
    { name: "L'atelier", url: "https://www.facebook.com/latelier.sucy" },
    {
      name: "La Station",
      url: "https://www.facebook.com/p/La-Station-Sucy-100093120762211/?locale=fr_FR",
    },
    { name: "C'est Bien", url: "https://www.naturopathevaldemarne.com/" },
  ];

  const associations = [
    { name: "Kifékoi?", url: "https://kifekoisucy.fr/", image: "/images/logo-kifekoi.webp" },
    {
      name: "Confrérie des Côteaux de Sucy",
      url: "https://confrerie-sucy.fr/",
      image: "/images/logo-confrerie.webp",
    },
    { name: "Sucy Loisirs Accueil", url: "https://sla-sucy.fr/", image: "/images/logo-sla.webp" },
    {
      name: "Le Club Montaleau",
      url: "http://www.club-montaleau.fr/",
      image: "/images/logo-clubmontaleau.webp",
    },
  ];

  return (
    <>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content="https://amis-harmonie-sucy.fr/the-dansant" />
      <link rel="canonical" href="https://amis-harmonie-sucy.fr/the-dansant" />
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <h1 className="font-['Merriweather_Sans'] text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-8 text-center">
              Thé Dansant 2026
            </h1>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-4 mb-12">
            <div className="md:col-span-2 w-full aspect-video overflow-hidden rounded-lg shadow-lg bg-black">
              <iframe
                className="w-full h-full"
                src="https://www.youtube-nocookie.com/embed/8s0ZlxZ2RVM"
                title="Thé Dansant"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>

            {flyers.slice(2).map((flyer) => (
              <img
                key={flyer.id}
                src={flyer.image_url}
                alt={flyer.alt_text || "Flyer Thé Dansant"}
                className="w-full h-auto rounded-lg shadow-lg"
                loading="lazy"
                width={1200}
                height={1600}
              />
            ))}
          </div>

          <ScrollReveal delay={100}>
            <section className="mb-12">
              <h3 className="font-['Merriweather_Sans'] text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                À propos de l'événement
              </h3>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Un immense merci à toutes et à tous pour votre présence et votre énergie lors de
                  notre Thé Dansant 2026.
                  <br />
                  Vous étiez plus de 150 à partager cet après-midi festif ! 🤩
                  <br />
                  Tout était réuni pour faire de cet événement un moment convivial, rythmé et
                  chaleureux.
                  <br />
                  Danse après danse, musiciens et danseurs ont voyagé ensemble à travers les styles
                  et les tempos, dans une ambiance pleine de sourires et de passion.
                  <br />
                  Bravo à chacun d’entre vous pour cette belle complicité sur la piste ! 🪩💃🏻
                  <br />
                  Pour prolonger le plaisir et garder un souvenir de cette édition, nous vous
                  invitons à découvrir dès maintenant la vidéo du Thé Dansant 2026 sur YouTube. ❤️
                </p>

                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Nous serions également ravis de lire vos impressions : laissez-nous tous vos
                  commentaires dans notre{" "}
                  <a href="/livre-or" className="text-primary hover:underline">
                    livre d'or
                  </a>
                  , ce qui nous permettra de travailler dès à présent sur une nouvelle version du
                  Thé Dansant, encore plus proche de vos envies et de vos attentes. C'est important
                  ! 🙏
                </p>
              </div>
            </section>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <section className="mb-12">
              <h3 className="font-['Merriweather_Sans'] text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Nos partenaires
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Cet événement est organisé en partenariat avec la Ville de Sucy-en-Brie, dont le
                soutien et l'engagement rendent possible la tenue de cette belle journée festive.
              </p>
              <div className="flex justify-center mb-8">
                <a href="https://www.ville-sucy.fr/" target="_blank" rel="noopener noreferrer">
                  <img
                    src="/images/logo-sucy.webp"
                    alt="Ville de Sucy-en-Brie"
                    className="h-24 w-auto"
                    width={240}
                    height={96}
                    loading="eager"
                  />
                </a>
              </div>

              <h6 className="font-['Merriweather_Sans'] text-lg font-bold text-primary mb-4">
                Commerçants
              </h6>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
                Nous remercions chaleureusement les entreprises et commerçants Sucyciens, dont la
                participation et la générosité contribuent à faire de cette journée un moment
                unique.
              </p>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-4 mb-4">
                {sponsors.map((sponsor) => (
                  <a
                    key={sponsor.id}
                    href={sponsor.link_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center bg-white dark:bg-gray-800 rounded p-2"
                  >
                    <img
                      src={sponsor.image_url}
                      alt={sponsor.alt_text || ""}
                      className="max-h-16 w-auto object-contain"
                      loading="lazy"
                      width={160}
                      height={64}
                    />
                  </a>
                ))}
              </div>
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                {commercantsText.map((c) => (
                  <a
                    key={c.name}
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    {c.name}
                  </a>
                ))}
              </div>

              <h6 className="font-['Merriweather_Sans'] text-lg font-bold text-primary mb-4">
                Associations
              </h6>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
                Les adhérents des associations partenaires (SLA, Kifekoi?, La Confrérie des Coteaux,
                Le Club Montaleau et tous les clubs de danse) bénéficient d'un tarif préférentiel.
              </p>
              <div className="grid grid-cols-4 gap-4 mb-8">
                {associations.map((a) => (
                  <a
                    key={a.name}
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center bg-white dark:bg-gray-800 rounded p-2"
                  >
                    <img
                      src={a.image}
                      alt={a.name}
                      className="max-h-16 w-auto object-contain"
                      loading="lazy"
                      width={160}
                      height={64}
                    />
                  </a>
                ))}
              </div>
            </section>
          </ScrollReveal>

          <TheDansantClient />

          <section className="mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {galleryImages.map((image, index) => (
                <ScrollReveal key={image.id} delay={index * 80}>
                  <div className="w-full aspect-[3/2] overflow-hidden rounded-lg">
                    <img
                      src={image.image_url}
                      alt={image.alt_text || "Thé Dansant"}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      width={1200}
                      height={800}
                    />
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
