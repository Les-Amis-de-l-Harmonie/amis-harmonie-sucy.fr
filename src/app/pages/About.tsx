export function About() {
  const pageTitle = "L'Association | Les Amis de l'Harmonie de Sucy";
  const pageDescription = "Découvrez Les Amis de l'Harmonie de Sucy-en-Brie, notre bureau et notre mission : soutenir l'Harmonie Municipale et promouvoir la musique.";

  const teamMembers = [
    { name: "Maxime Leduc", role: "Président", description: "Saxophoniste de l'Harmonie", image: "/images/team/maxime.png" },
    { name: "Andréa", role: "Vice-Présidente", description: "Percussionniste de l'Harmonie", image: "/images/team/andrea.png" },
    { name: "David Brunet", role: "Directeur musical", description: "Chef d'orchestre de l'Harmonie", image: "/images/team/david.png" },
    { name: "Carole Siméone", role: "Trésorière", description: "Saxophoniste de l'Harmonie", image: "/images/team/carole.png" },
    { name: "Mario Nunes", role: "Trésorier adjoint", description: "Parent d'un musicien de l'Harmonie", image: "/images/team/mario.png" },
    { name: "Estelle Debache", role: "Responsable communication", description: "Percussionniste de l'Harmonie", image: "/images/team/estelle.png" },
    { name: "Marcel Hamon", role: "Membre", description: "Chef adjoint et percussionniste de l'Harmonie", image: "/images/team/marcel.png" },
  ];

  return (
    <>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content="https://amis-harmonie-sucy.fr/about" />
      <link rel="canonical" href="https://amis-harmonie-sucy.fr/about" />
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-['Merriweather_Sans'] text-3xl font-bold text-[#101828] mb-8 text-center">
            L'Association
          </h2>

        <div className="prose prose-gray max-w-none mb-12">
          <p className="text-gray-600 mb-4">
            Chez "Les Amis de l'Harmonie", la passion pour la musique et la vie associative s'entrelacent pour créer une expérience musicale enrichissante et conviviale.
          </p>
          <p className="text-gray-600 mb-4">
            Notre association se consacre avant tout à épauler l'Harmonie Municipale dans ses activités quotidiennes et lors de ses prestations publiques. Que ce soit lors des fêtes locales, des cérémonies patriotiques, ou encore des concerts que nous organisons, l'agenda de l'orchestre est toujours bien rempli. Cependant, notre soutien ne se limite pas à la scène; nous sommes également impliqués dans la logistique, la communication, la gestion administrative, et d'autres tâches essentielles qui facilitent le bon déroulement et l'évolution de l'orchestre.
          </p>
          <p className="text-gray-600 mb-4">
            Grâce à un bureau dynamique, un site internet interactif, et une présence active sur les réseaux sociaux, nous offrons une fenêtre ouverte sur l'Harmonie. Nous proposons également une variété d'événements exclusifs et d'avantages pour nos membres, tous tournés autour de la musique et de la culture, renforçant ainsi les liens.
          </p>
          <p className="text-gray-600 mb-4">
            Adhérer à notre association, c'est rejoindre une famille musicale ! Vous pouvez dès maintenant devenir membre en ligne via notre site internet, où vous trouverez également l'agenda complet et toutes les informations pertinentes concernant l'Harmonie Municipale et les Amis de l'Harmonie.
          </p>
          <p className="text-gray-600 mb-8">
            Venez, participez, et laissez la musique de l'Harmonie de Sucy-en-Brie vous inspirer et vous réunir!
          </p>

          <div className="mb-12">
            <a href="https://drive.google.com/file/d/1rVXEI46FWbo0NTyN9MzTsuIL0zYR1HGp/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="text-[#a5b3e2] hover:underline block">
              Plaquette de présentation de l'association
            </a>
            <a href="https://drive.google.com/file/d/1hG9ppax_pNDczalp60psIq7C070SKsgk/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="text-[#a5b3e2] hover:underline block">
              Statuts de l'association
            </a>
            <a href="https://drive.google.com/file/d/1tVo5Wgq7rWl2-KrCjhxo3E6SUfO_8qRM/view?usp=drive_link" target="_blank" rel="noopener noreferrer" className="text-[#a5b3e2] hover:underline block">
              Réglement intérieur de l'association
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {teamMembers.map((member, i) => (
            <div key={i} className="text-center">
              <div className="w-32 h-32 mx-auto mb-3 overflow-hidden rounded-full">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <h5 className="font-['Merriweather_Sans'] font-bold text-[#101828]">
                {member.name}
              </h5>
              <p className="text-[#a5b3e2] text-sm">{member.role}</p>
              <p className="text-gray-500 text-xs">{member.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
    </>
  );
}
