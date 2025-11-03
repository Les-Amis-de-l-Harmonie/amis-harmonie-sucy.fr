import Layout from "../components/Layout";
import { Evenement, evenements } from "./evenements";

export const hasBilletterie = () => {
  return Boolean(evenements.filter(isBilletterie).length);
};

const today = new Date();
today.setHours(0, 0, 0, 0);

interface EventItem {
  d: string;
  url?: string;
}

const isBilletterie = (evt: EventItem): boolean => {
  return (
    new Date(Date.parse(evt.d)) >= today &&
    typeof evt.url !== "undefined" &&
    evt.url !== ""
  );
};

const Videos = () => (
  <Layout
    title="Billetterie - Événements de l'Harmonie de Sucy-en-Brie"
    description="Réservez vos places pour les événements musicaux de l'Harmonie Municipale de Sucy-en-Brie. Découvrez notre billetterie en ligne pour concerts, thé dansant, spectacles et autres manifestations culturelles. Profitez de tarifs préférentiels pour les adhérents et vivez des moments uniques de musique classique et populaire dans une ambiance conviviale à Sucy-en-Brie."
  >
    <div className="py-16">
      <div className="mx-auto max-w-[1320px]">
        <h1 className="font-secondary font-bold leading-tight text-black text-h2-sm md:text-h2 mb-8 text-center">
          Billetterie
        </h1>
        <div className="flex flex-wrap px-2 gap-4 justify-center">
          {evenements.filter(isBilletterie).map((evenement) => (
            <div
              key={evenement.title}
              className="basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
            >
              <Evenement evenement={evenement} />
            </div>
          ))}
        </div>
      </div>
    </div>
  </Layout>
);

export default Videos;
