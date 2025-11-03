import Layout from "../components/Layout";
import { NextPage } from "next";
import ExportedImage from "next-image-export-optimizer";
import { useRouter } from "next/router";
import { RippleButton } from "../components/ui/shadcn-io/ripple-button";
import { Evenement, evenements } from "./evenements";
import { useState, useEffect } from "react";

import home1 from "../../public/images/home1.jpg";
import home2 from "../../public/images/home2.jpg";
import home3 from "../../public/images/home3.jpg";
import home4 from "../../public/images/home4.jpg";

const images = [home1, home2, home3, home4];

const today = new Date();
today.setHours(0, 0, 0, 0);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const Home: NextPage = () => {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Layout
      title="Les Amis de l'Harmonie de Sucy-en-Brie"
      description="Découvrez l'association Les Amis de l'Harmonie de Sucy-en-Brie : soutenez l'orchestre, consultez les événements musicaux et rejoignez notre communauté passionnée de musique classique."
    >
      {/* Banner */}
      <section className="py-16 relative pb-0 pt-4 lg:pt-0">
        <ExportedImage
          className="absolute bottom-0 left-0 z-[-1] w-full"
          src={"/images/banner-bg-shape.svg"}
          width={1905}
          height={295}
          alt="banner-shape"
          priority
          placeholder="empty"
        />

        <div className="mx-auto max-w-[1320px]">
          <div className="grid grid-cols-1 lg:grid-cols-2 lg:px-8 gap-8">
            <div className="mt-12 text-center lg:mt-0 lg:text-left order-2 lg:order-1 flex flex-col justify-center">
              <div>
                <span className="font-bold text-dark lg:text-[55px]">
                  Les amis de
                </span>
                <h1 className="font-secondary font-bold text-black text-h1-sm md:text-h1 leading-[1] lg:text-[72px]">
                  l&apos;Harmonie de{" "}
                  <span style={{ whiteSpace: "nowrap" }}>Sucy-en-Brie</span>
                </h1>
              </div>
              <p className="mt-4 px-4">
                <i>
                  {
                    "\"Tel qu'il s'est forgé à travers les siècles, l'orchestre représente une des grandes conquêtes du monde civilisé. Il doit être soutenu et développé pour le bien de l'humanité, car la Musique contribue à la communication et à la compréhension entre les peuples.\""
                  }
                </i>
                <span className=""> Riccardo Muti</span>
              </p>
              <div className="py-4">
                <RippleButton onClick={() => router.push("/about")}>
                  En savoir plus
                </RippleButton>
              </div>
            </div>
            <div className="h-[360px] w-full lg:h-[640px] pt-4 order-1 lg:order-2">
              <div className="relative w-[360px] lg:w-full h-full mx-auto overflow-hidden">
                {images.map((image, index) => (
                  <ExportedImage
                    key={index}
                    className="absolute inset-0 object-contain transition-transform duration-1000 ease-in-out rounded-xl"
                    src={image}
                    sizes="50vw"
                    alt=""
                    style={{
                      transform: `translateX(${(index - currentSlide) * 100}%)`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="py-8" id="evenements">
        <div className="mx-auto max-w-[1320px] flex flex-col gap-8">
          <div className="w-full">
            <h2 className="font-secondary font-bold leading-tight text-black text-h2-sm md:text-h2 text-center">
              Évènements à venir
            </h2>
          </div>
          <div className="grid grid-cols-1 px-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {evenements
              .filter((evt) => new Date(Date.parse(evt.d)) >= today)
              .map((evenement) => (
                <Evenement
                  key={`${evenement.d}-${evenement.title}`}
                  evenement={evenement}
                />
              ))}
          </div>
          <div className="w-full">
            <h2 className="font-secondary font-bold leading-tight text-black text-h2-sm md:text-h2 text-center">
              Évènements passés
            </h2>
          </div>
          <div className="grid grid-cols-1 px-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {evenements
              .filter((evt) => new Date(Date.parse(evt.d)) < today)
              .reverse()
              .map((evenement) => (
                <Evenement
                  key={`${evenement.d}-${evenement.title}`}
                  evenement={evenement}
                  button={false}
                />
              ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Home;
