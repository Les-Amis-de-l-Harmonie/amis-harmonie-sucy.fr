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

const Default = ({ data }) => {
  const { frontmatter, mdxContent } = data;
  const { title, banner1, banner2, banner3, banner4 } = frontmatter;
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
          <div className="col-12 md:col-3 my-6 px-16 px-10 md:py-10 border-b-4 md:border-b-0 md:border-r-4">
            <ExportedImage
              className="w-[100px] h-auto md:w-[500px] mx-auto"
              src={i}
              sizes="10vw"
              alt="i"
              priority
            />
          </div>
      
          <div className="col-12 md:col-9 text-white pl-16 py-10">
            {markdownify(banner1, "p", "pb-6")}
            {markdownify(banner2, "p", "pb-6")}
            {markdownify(banner3, "p", "pb-6")}
            {markdownify(banner4, "p", "")}
          </div>
      
        </div>
      </div>
    </section>
  );
};

export default Default;
