import { markdownify } from "@lib/utils/textConverter";
import shortcodes from "@shortcodes/all";
import { MDXRemote } from "next-mdx-remote";
import harmoniePng from "../public/images/harmonie.png";
import i from "../public/images/i.png";
import ExportedImage from "next-image-export-optimizer";
import { Carousel } from 'flowbite-react';

/*import harmonie1 from "../public/images/harmonie1.jpg"
import harmonie2 from "../public/images/harmonie2.jpg"
import harmonie3 from "../public/images/harmonie3.jpg"
import harmonie4 from "../public/images/harmonie4.jpg"
import harmonie5 from "../public/images/harmonie5.jpg"
import harmonie6 from "../public/images/harmonie6.jpg"
import harmonie7 from "../public/images/harmonie7.jpg"
import harmonie8 from "../public/images/harmonie8.jpg"

const Carousell = () => {
  const images = [
    harmonie1,
    harmonie2,
    harmonie3,
    harmonie4,
    //harmonie5,
    harmonie6,
    harmonie7,
    harmonie8,
  ]

  return (
    <Carousel slideInterval={2000} /*indicators={false}>
      { images.map((image, index) =>
        <ExportedImage
          key={index}
          className=""
          src={image}
          sizes="100vw"
          alt="carousel-harmonie"
        />
      )}
    </Carousel>
  )
}*/

import photo1 from "../public/images/harmonie/1.jpg"
import photo2 from "../public/images/harmonie/2.jpg"
import photo3 from "../public/images/harmonie/3.jpg"
import photo4 from "../public/images/harmonie/4.jpg"
import photo5 from "../public/images/harmonie/5.jpg"
import photo6 from "../public/images/harmonie/6.jpg"
import photo7 from "../public/images/harmonie/7.jpg"
import photo8 from "../public/images/harmonie/8.jpg"
import photo9 from "../public/images/harmonie/9.jpg"
import photo10 from "../public/images/harmonie/10.jpg"
import photo11 from "../public/images/harmonie/11.jpg"
import photo12 from "../public/images/harmonie/12.jpg"
import photo13 from "../public/images/harmonie/13.jpg"
import photo14 from "../public/images/harmonie/14.jpg"
import photo15 from "../public/images/harmonie/15.jpg"
import photo16 from "../public/images/harmonie/16.jpg"
import photo17 from "../public/images/harmonie/17.jpg"
import photo18 from "../public/images/harmonie/18.jpg"

const Default = ({ data }) => {
  const { frontmatter, mdxContent } = data;
  const { title, banner1, banner2, banner3, banner4 } = frontmatter;

  const musiciens = {
    "Chef": ["David Brunet"],
    "Chef Adjoint": ["Marcel Hamon"],
    "Flûte": ["Rayan Merkitou", "Marie Henri"],
    "Clarinette": ["Théotime Coutanson-Géhin", "Stéphane Carcenac", "Evelyne Cupidon", "Fabienne Fostier", "Claire Khidas", "Caroline Liang"],
    "Clarinette Basse": ["Arnaud Laigret", "Xavier Schoenlaub"],
    "Saxophone Soprano": ["Brigitte Lemoine"],
    "Saxophone Alto": ["Jean-Philippe Albert", "Maxime Leduc", "Carole Siméone", "Brigitte Bourcier", "Damien Henri", "Marc-Paul Couton", "Serge Jakubowicz"],
    "Saxophone Ténor": ["Catherine Suel"],
    "Trompette/Cornet": ["André Duez", "Ludmila Pudysz", "Patrick Baudoin", "Christophe Bernard", "Philippe Grumeau", "Alexis Schoenlaub"],
    "Trombone": ["Philémon Coutanson-Géhin"],
    "Euphonium": ["Yves Millemann"],
    "Contrebasse": ["Anne-Marie Garnier"],
    "Batterie/Percussions": ["Marcel Hamon", "Philippe Bontemps", "Andréa Rebelo", "Remi Mallet", "Estelle Debache", "Aurélie Sureau"],
  }

  const photos = [
    photo1,
    photo2,
    photo3,
    photo4,
    photo5,
    photo6,
    photo7,
    photo8,
    photo9,
    photo10,
    photo11,
    photo12,
    photo13,
    photo14,
    photo15,
    photo16,
    photo17,
    photo18,
  ]

  return (
    <section className="section">
      <div className="container">
        {markdownify(title, "h1", "h2 mb-8 text-center")}
        <ExportedImage
          className=""
          src={harmoniePng}
          sizes="100vw"
          alt="banner-harmonie"
          priority
          placeholder="empty"
        />
        <div className="content">
          <MDXRemote {...mdxContent} components={shortcodes} />
        </div>
        {/*<div className="row h-[50vw] xl:h-[635px]">
          <Carousell />
        </div>*/}
        <div className="row rounded-2xl bg-primary mt-16">
          <div className="col-12 md:col-3 md:my-6 px-16 px-10 py-6 md:py-10 border-b-4 md:border-b-0 md:border-r-4">
            <ExportedImage
              className="w-[100px] h-auto md:w-[500px] mx-auto"
              src={i}
              sizes="10vw"
              alt="i"
              priority
            />
          </div>

          <div className="col-12 md:col-9 text-center md:text-left text-white md:pl-16 py-6 md:py-10">
            {markdownify(banner1, "p", "pb-6")}
            {markdownify(banner2, "p", "pb-6")}
            {markdownify(banner3, "p", "")}
          </div>
        </div>
        {/* <div className="row text-center mt-12">
          <h3>Les Musiciens</h3>
          {Object.keys(musiciens).map((pupitre, i) =>
            <div key={i} className="my-3">
              <h5 className="text-primary">{pupitre}</h5>
              <span className="">{musiciens[pupitre].sort().join(", ")}</span>
            </div>
          )}
        </div> */}
        <div className="row mt-12">
          {photos.map((photo, i) =>
            <div key="i" className="col-12 md:col-4 xl:col-2 mb-6">
              <ExportedImage
                className=""
                src={photo}
                sizes="20vw"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Default;
