import { TheDansantClient } from "./TheDansantClient";
import { getGalleryImages } from "@/app/shared/gallery";

export async function TheDansant() {
  const pageTitle = "Thé Dansant 2026 | Les Amis de l'Harmonie de Sucy";
  const pageDescription = "Thé Dansant 2026 à Sucy-en-Brie - Journée de danse et musique avec l'Harmonie Municipale et Picotango Orquesta. Réservez vos places !";

  const [flyers, sponsors, galleryImages] = await Promise.all([
    getGalleryImages('thedansant_flyers'),
    getGalleryImages('thedansant_sponsors'),
    getGalleryImages('thedansant_gallery')
  ]);

  const commercantsText = [
    { name: "Les Petits Plats de Chloé", url: "https://www.facebook.com/p/Les-Petits-Plats-de-Chlo%C3%A9-0650082824-100077768149167/" },
    { name: "Les produits de Mathilde", url: "https://lesproduitsdemathilde.fr/" },
    { name: "Cordonnerie Sucy", url: "https://cordonnerie-leperreux.fr/fr/page/cordonnerie-de-sucy" },
    { name: "Le Petit Verdot", url: "https://cavepetitverdot.fr/" },
    { name: "Le Quercy", url: "https://www.facebook.com/p/Le-Quercy-Bar-Brasserie-Restaurant-100063781620749/?locale=fr_FR" },
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
    { name: "La Station", url: "https://www.facebook.com/p/La-Station-Sucy-100093120762211/?locale=fr_FR" },
    { name: "C'est Bien", url: "https://www.naturopathevaldemarne.com/" },
  ];

  const associations = [
    { name: "Kifékoi?", url: "https://kifekoisucy.fr/", image: "/images/logo-kifekoi.webp" },
    { name: "Confrérie des Côteaux de Sucy", url: "https://confrerie-sucy.fr/", image: "/images/logo-confrerie.webp" },
    { name: "Sucy Loisirs Accueil", url: "https://sla-sucy.fr/", image: "/images/logo-sla.webp" },
    { name: "Le Club Montaleau", url: "http://www.club-montaleau.fr/", image: "/images/logo-clubmontaleau.webp" },
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
          <h1 className="font-['Merriweather_Sans'] text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
            Thé Dansant 2026
          </h1>

        <div className="text-center mb-8">
          <a
            href="https://www.helloasso.com/associations/les-amis-de-l-harmonie/evenements/the-dansant-2026-sucy-en-brie"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-3 bg-gradient-to-r from-primary to-[#e8b4c8] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Réservation
          </a>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-12">
          {flyers.map((flyer) => (
            <img 
              key={flyer.id} 
              src={flyer.image_url} 
              alt={flyer.alt_text || "Flyer Thé Dansant"} 
              className="w-full rounded-lg shadow-lg" 
            />
          ))}
        </div>

        <section className="mb-12">
          <h3 className="font-['Merriweather_Sans'] text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            À propos de l'événement
          </h3>
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Plongez dans une journée inoubliable de danse et de musique au cœur de Sucy-en-Brie ! Organisé en partenariat avec la ville, ce Thé Dansant emblématique réunit deux orchestres exceptionnels pour plus de 4 heures de rythmes enivrants. L'Harmonie Municipale, avec ses 30 talentueux musiciens, vous emportera dans un répertoire festif et varié, tandis que le Picotango Orquesta, maître du tango argentin passionné, fera vibrer vos pas de danse avec élégance et sensualité. Que vous soyez amateur de valses traditionnelles ou de tangos enflammés, cette fusion unique de styles vous ravira et créera une atmosphère magique, parfaite pour partager des moments de joie en famille ou entre amis. Ne manquez pas cet événement incontournable d'Île-de-France, où la musique célèbre la vie !
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Sous le charme du tango, un couple de danseurs professionnels vous guidera, pas à pas, lors d'une initiation, dans l'apprentissage de cette danse aussi exigeante qu'élégante.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Verre de pétillant, pâtisserie et un fruit offert. 🥂🍰🍊
            </p>
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              NOUVEAU : buvette sur place et tombola (2€/ticket, 4 achetés = 1 offert)
            </p>
          </div>
        </section>

        <div className="text-center mb-12">
          <a
            href="https://www.helloasso.com/associations/les-amis-de-l-harmonie/evenements/the-dansant-2026-sucy-en-brie"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-3 bg-gradient-to-r from-primary to-[#e8b4c8] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Réservation
          </a>
        </div>

        <section className="mb-12">
          <h3 className="font-['Merriweather_Sans'] text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Nos partenaires
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Cet événement est organisé en partenariat avec la Ville de Sucy-en-Brie, dont le soutien et l'engagement rendent possible la tenue de cette belle journée festive.
          </p>
          <div className="flex justify-center mb-8">
            <a href="https://www.ville-sucy.fr/" target="_blank" rel="noopener noreferrer">
              <img src="/images/logo-sucy.webp" alt="Ville de Sucy-en-Brie" className="h-24" />
            </a>
          </div>

          <h6 className="font-['Merriweather_Sans'] font-bold text-primary mb-4">Commerçants</h6>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
            Nous remercions chaleureusement les entreprises et commerçants Sucyciens, dont la participation et la générosité contribuent à faire de cette journée un moment unique.
          </p>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-4 mb-4">
            {sponsors.map((sponsor) => (
              <a key={sponsor.id} href={sponsor.link_url || "#"} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center bg-white dark:bg-gray-800 rounded p-2">
                <img src={sponsor.image_url} alt={sponsor.alt_text || ""} className="max-h-16 w-auto object-contain" loading="lazy" />
              </a>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {commercantsText.map((c, i) => (
              <a key={i} href={c.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                {c.name}
              </a>
            ))}
          </div>

          <h6 className="font-['Merriweather_Sans'] font-bold text-primary mb-4">Associations</h6>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
            Les adhérents des associations partenaires (SLA, Kifekoi?, La Confrérie des Coteaux, Le Club Montaleau et tous les clubs de danse) bénéficient d'un tarif préférentiel.
          </p>
          <div className="grid grid-cols-4 gap-4 mb-8">
            {associations.map((a, i) => (
              <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center bg-white dark:bg-gray-800 rounded p-2">
                <img src={a.image} alt={a.name} className="max-h-16 w-auto object-contain" loading="lazy" />
              </a>
            ))}
          </div>
        </section>

        <TheDansantClient />

        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {galleryImages.map((image) => (
              <div key={image.id} className="w-full aspect-[3/2] overflow-hidden rounded-lg">
                <img
                  src={image.image_url}
                  alt={image.alt_text || "Thé Dansant"}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </section>

        <div className="text-center">
          <a
            href="https://www.helloasso.com/associations/les-amis-de-l-harmonie/evenements/the-dansant-2026-sucy-en-brie"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-3 bg-gradient-to-r from-primary to-[#e8b4c8] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Réservation
          </a>
        </div>
      </div>
    </div>
    </>
  );
}
