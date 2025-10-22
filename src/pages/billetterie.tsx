import Base from "../components/Layout";
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
  <Layout title={`Billetterie`}>
    <div className="py-16">
      <div className="mx-auto max-w-[1320px]">
        <h1 className="font-secondary font-bold leading-tight text-black text-h2-sm md:text-h2 mb-8 text-center">
          Billetterie
        </h1>
        <div className="flex flex-wrap px-2 gap-4 justify-center">
          {evenements.filter(isBilletterie).map((evenement) => (
            <div className="basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
              <Evenement key={evenement.title} evenement={evenement} />
            </div>
          ))}
        </div>
      </div>
    </div>
  </Layout>
);

export default Videos;
