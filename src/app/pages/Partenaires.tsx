export function Partenaires() {
  const partners = [
    { name: "Ville de Sucy-en-Brie", image: "/images/logo-sucy.png" },
    { name: "Grain de Vent", image: "/images/graindevent.png" },
    { name: "Kifékoi?", image: "/images/logo-kifekoi.png" },
    { name: "Confrérie des Côteaux de Sucy", image: "/images/logo-confrerie.jpeg" },
    { name: "Sucy Loisirs Accueil", image: "/images/logo-sla.png" },
    { name: "Le Club Montaleau", image: "/images/logo-clubmontaleau.jpeg" },
    { name: "K à contre moun", image: "/images/logo-k.png" },
    { name: "Confédération Musicale de France", image: "/images/logo-cmf.png" },
    { name: "CMF Val-de-Marne", image: "/images/logo-cmf-vdm.jpeg" },
    { name: "Oiseau", image: "/images/oiseau.jpg" },
    { name: "Be Perfect", image: "/images/beperfect.jpg" },
    { name: "Isabelle", image: "/images/logoisabelle.jpg" },
    { name: "L'Arbre ô jeux", image: "/images/arbre.png" },
  ];

  return (
    <>
      <title>Partenaires | Les Amis de l'Harmonie de Sucy</title>
      <meta name="description" content="Découvrez les partenaires des Amis de l'Harmonie de Sucy-en-Brie. Entreprises, associations et institutions qui soutiennent notre orchestre." />
      <meta property="og:title" content="Partenaires | Les Amis de l'Harmonie de Sucy" />
      <meta property="og:description" content="Découvrez les partenaires des Amis de l'Harmonie de Sucy-en-Brie." />
      <meta property="og:url" content="https://amis-harmonie-sucy.fr/partenaires" />
      <link rel="canonical" href="https://amis-harmonie-sucy.fr/partenaires" />
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-['Merriweather_Sans'] text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8 text-center">
            Partenaires
          </h1>

          <h6 className="font-['Merriweather_Sans'] text-lg font-bold text-primary mb-8 text-center">
            ILS NOUS SOUTIENNENT !
          </h6>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            {partners.map((partner, i) => (
              <div key={i} className="flex items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                <img
                  src={partner.image}
                  alt={partner.name}
                  className="max-h-24 w-auto object-contain"
                  loading="lazy"
                />
              </div>
            ))}
          </div>

          <h6 className="font-['Merriweather_Sans'] text-lg font-bold text-primary mb-4 text-center">
            ET SI, VOUS AUSSI, VOUS NOUS SOUTENIEZ ?
          </h6>

          <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
            L'aboutissement et la réussite de ces nombreux projets reposent aussi sur votre engagement à nos côtés et nous vous en sommes très reconnaissants. Par ce petit geste, vous permettez à nos beaux projets de voir le jour !
          </p>

          <div className="w-full">
            <iframe
              id="haWidget"
              allowTransparency={true}
              src="https://www.helloasso.com/associations/les-amis-de-l-harmonie/formulaires/1/widget"
              className="w-full border-none"
              style={{ height: "900px" }}
              title="Formulaire de don HelloAsso"
            />
          </div>
        </div>
      </div>
    </>
  );
}
