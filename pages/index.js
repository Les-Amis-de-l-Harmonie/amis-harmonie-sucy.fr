import Base from "@layouts/Baseof";
import ExportedImage from "next-image-export-optimizer";
import Link from "next/link";
import {Evenement, evenements} from "./evenements"

import i7 from "../public/images/7.png"

const today = new Date()
today.setHours(0,0,0,0)
const tomorrow = new Date(today)
tomorrow.setDate(tomorrow.getDate() + 1)

const Home = () => {
  return (
    <Base>
      {/* Banner */}
      <section className="section banner relative pb-0">
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
                <h1>Association</h1>
                <span>Les Amis de l&apos;Harmonie</span>
              </div>
              <p className="mt-4">
                Bienvenue sur le site officiel de l&apos;association
                <br />
                <b>Les Amis de l&apos;Harmonie</b> de Sucy-en-Brie !
              </p>
              <Link
                className="btn btn-primary mt-6"
                href="/about"
              >
                En savoir plus
              </Link>
            </div>
            <div className="col-9 lg:col-6">
              <ExportedImage
                className="mx-auto object-contain"
                src={i7}
                sizes="50vw"
                alt=""
              />
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
              <Evenement key={evenement.title} evenement={evenement} />
            )}
          </div>
          <div className="row">
            <div className="col-12">
              <h2 className="h2 mb-8 text-center">
                Évènements passés
              </h2>
            </div>
            {evenements.filter((evt) => new Date(Date.parse(evt.d)) < today).reverse().map((evenement) =>
              <Evenement key={evenement.title} evenement={evenement} button={false}/>
            )}
          </div>
        </div>
      </section>
    </Base>
  );
};

export default Home;