import Base from "@layouts/Baseof";
import ImageFallback from "@layouts/components/ImageFallback";
import Link from "next/link";

const Home = () => {
  return (
    <Base>
      {/* Banner */}
      <section className="section banner relative pb-0">
        <ImageFallback
          className="absolute bottom-0 left-0 z-[-1] w-full"
          src={"/images/banner-bg-shape.svg"}
          width={1905}
          height={295}
          alt="banner-shape"
          priority
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
              <ImageFallback
                className="mx-auto object-contain"
                src="/images/1.png"
                width={548}
                height={443}
                priority={true}
                alt="Banner Image"
              />
            </div>
          </div>
        </div>
      </section>
    </Base>
  );
};

export default Home;
