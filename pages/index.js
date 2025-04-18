import Base from "@layouts/Baseof";
import ExportedImage from "next-image-export-optimizer";
import Link from "next/link";
import {Evenement, evenements} from "./evenements"
import { Carousel } from "flowbite-react";

import home1 from "../public/images/home1.jpg"
import home2 from "../public/images/home2.jpg"
import home3 from "../public/images/home3.jpg"
import home4 from "../public/images/home4.jpg"

const today = new Date()
today.setHours(0,0,0,0)
const tomorrow = new Date(today)
tomorrow.setDate(tomorrow.getDate() + 1)

const Home = () => {
  return (
    <Base>
      {/* Banner */}
      <section className="section banner relative pb-0 pt-4 lg:pt-0">
        <ExportedImage
          className="absolute bottom-0 left-0 z-[-1] w-full"
          src={"/images/banner-bg-shape.svg"}
          width={1905}
          height={295}
          alt="banner-shape"
          priority
          placeholder="empty"
        />

        <div className="container">
          <div className="row flex-wrap-reverse items-center justify-center lg:flex-row">
            <div className="mt-12 text-center lg:mt-0 lg:text-left lg:col-6">
              <div className="banner-title">
              <span>Les amis de</span>
                <h1>l&apos;Harmonie de <nobr>Sucy-en-Brie</nobr></h1>

              </div>
              <p className="mt-4">
              <i>{"\"Tel qu'il s'est forgé à travers les siècles, l'orchestre représente une des grandes conquêtes du monde civilisé. Il doit être soutenu et développé pour le bien de l'humanité, car la Musique contribue à la communication et à la compréhension entre les peuples.\""}</i>
              <span className=""> Riccardo Muti</span>
              </p>
              <Link
                className="btn btn-primary mt-6"
                href="/about"
              >
                En savoir plus
              </Link>
            </div>
            <div className="h-[360px] w-[360px] lg:w-none lg:h-[640px] lg:col-6">
              <div className="w-[360px] lg:w-full h-full">
                <Carousel slideInterval={1000} indicators={false} leftControl=" " rightControl=" ">
                  {[home1, home2, home3, home4].map((image, i) =>
                    <ExportedImage
                      className="mx-auto object-contain"
                      src={image}
                      sizes="50vw"
                      key="i"
                      alt=""
                    />
                  )}
                </Carousel>
              </div>
            </div>
          </div>

        </div>
      </section>
      <section className="section" id="evenements">
        <div className="container">
          <div className="row">
            <div className="col-12">
              <h2 className="h2 mb-8 text-center">
                Évènements à venir
              </h2>
            </div>
            {evenements.filter((evt) => new Date(Date.parse(evt.d)) >= today).map((evenement) =>
              <Evenement key={`${evenement.d}-${evenement.title}`} evenement={evenement} />
            )}
          </div>
          <div className="row">
            <div className="col-12">
              <h2 className="h2 mb-8 text-center">
                Évènements passés
              </h2>
            </div>
            {evenements.filter((evt) => new Date(Date.parse(evt.d)) < today).reverse().map((evenement) =>
              <Evenement key={`${evenement.d}-${evenement.title}`} evenement={evenement} button={false}/>
            )}
          </div>
        </div>
      </section>
    </Base>
  );
};

export default Home;
