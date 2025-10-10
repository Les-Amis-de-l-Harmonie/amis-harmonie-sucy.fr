import Layout from "../components/Layout";
import ExportedImage from "next-image-export-optimizer";
import Link from "next/link";
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

const Home = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Layout>
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
          <div className="flex items-center justify-center lg:flex-row gap-8">
            <div className="mt-12 text-center lg:mt-0 lg:text-left lg:basis-1/2">
              <div>
                <span className="font-bold text-dark lg:text-[55px]">
                  Les amis de
                </span>
                <h1 className="font-secondary font-bold text-black text-h1-sm md:text-h1 leading-[1] lg:text-[72px]">
                  l&apos;Harmonie de <nobr>Sucy-en-Brie</nobr>
                </h1>
              </div>
              <p className="mt-4">
                <i>
                  {
                    "\"Tel qu'il s'est forgé à travers les siècles, l'orchestre représente une des grandes conquêtes du monde civilisé. Il doit être soutenu et développé pour le bien de l'humanité, car la Musique contribue à la communication et à la compréhension entre les peuples.\""
                  }
                </i>
                <span className=""> Riccardo Muti</span>
              </p>
              <Link
                className="font-secondary inline-block border px-8 py-2.5 font-bold transition bg-primary text-white rounded-[50px] relative border-0 overflow-hidden h-12 mt-6"
                href="/about"
              >
                En savoir plus
              </Link>
            </div>
            <div className="h-[360px] w-[360px] lg:w-none lg:h-[640px] lg:basis-1/2 pt-4">
              <div className="relative w-[360px] lg:w-full h-full overflow-hidden">
                {images.map((image, index) => (
                  <ExportedImage
                    key={index}
                    className="absolute inset-0 object-contain transition-transform duration-1000 ease-in-out"
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
      <section className="py-16" id="evenements">
        <div className="mx-auto max-w-[1320px]">
          <div className="flex flex-wrap gap-4">
            <div className="w-full">
              <h2 className="font-secondary font-bold leading-tight text-black text-h2-sm md:text-h2 mb-8 text-center">
                Évènements à venir
              </h2>
            </div>
            {evenements
              .filter((evt) => new Date(Date.parse(evt.d)) >= today)
              .map((evenement) => (
                <Evenement
                  key={`${evenement.d}-${evenement.title}`}
                  evenement={evenement}
                />
              ))}
          </div>
          <div className="flex flex-wrap">
            <div className="w-full">
              <h2 className="font-secondary font-bold leading-tight text-black text-h2-sm md:text-h2 mb-8 text-center">
                Évènements passés
              </h2>
            </div>
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
