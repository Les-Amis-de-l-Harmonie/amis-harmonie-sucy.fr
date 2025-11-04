import Layout from "../components/Layout";
import ExportedImage from "next-image-export-optimizer";

const partners = [
  { src: "/images/logo-sucy.png", alt: "Ville de Sucy-en-Brie" },
  { src: "/images/graindevent.png", alt: "Grain de Vent" },
  { src: "/images/logo-kifekoi.png", alt: "Kifékoi?" },
  { src: "/images/logo-confrerie.jpeg", alt: "Confrérie des Côteaux de Sucy", px: true },
  { src: "/images/logo-sla.png", alt: "Sucy Loisirs Accueil" },
  { src: "/images/logo-clubmontaleau.jpeg", alt: "Le Club Montaleau" },
  { src: "/images/logo-k.png", alt: "K à contre moun", px: true },
  { src: "/images/logo-cmf.png", alt: "Confédération Musicale de France", px: true },
  { src: "/images/logo-cmf-vdm.jpeg", alt: "CMF Val-de-Marne" },
  { src: "/images/oiseau.jpg", alt: "Oiseau" },
  { src: "/images/beperfect.jpg", alt: "Be Perfect" },
  { src: "/images/logoisabelle.jpg", alt: "Isabelle" },
  { src: "/images/arbre.png", alt: "L'Arbre ô jeux" },

];

const Partenaires = () => (
  <Layout title={`Partenaires`}>
    <div className="py-16">
      <div className="mx-auto max-w-[1320px]">
        <h1 className="font-secondary font-bold leading-tight text-black text-h2-sm md:text-h2 mb-8 text-center ">
          Partenaires
        </h1>
        <div className="flex flex-wrap px-4">
          <div className="w-full ">
            <h6 className="text-primary">ILS NOUS SOUTIENNENT !</h6>
          </div>
          <div className="w-full">
            <div className="flex flex-wrap justify-center gap-4">
              {partners.map((partner, index) => (
                <div key={index} className="flex w-1/2 sm:w-1/3 md:w-1/8 items-center">
                  <ExportedImage
                    className={`mb-3 w-full ${partner.px ? 'px-6' : ''}`}
                    src={partner.src}
                    width={200}
                    height={200}
                    sizes="17vw"
                    alt={partner.alt}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="w-full mt-32">
            <h6 className="text-primary">
              ET SI, VOUS AUSSI, VOUS NOUS SOUTENIEZ ?
            </h6>
            <p>
              {"L’aboutissement et la réussite de ces nombreux projets reposent aussi sur votre engagement à nos côtés et nous vous en sommes très reconnaissants. Par ce petit geste, vous permettez à nos beaux projets de voir le jour !"}
            </p>
          </div>
          <div className="w-full">
            <iframe
              id="haWidget"
              allowTransparency
              src="https://www.helloasso.com/associations/les-amis-de-l-harmonie/formulaires/1/widget"
              className="w-full h-[1300px] border-none"
            />
          </div>
        </div>
      </div>
    </div>
  </Layout>
);

export default Partenaires;
