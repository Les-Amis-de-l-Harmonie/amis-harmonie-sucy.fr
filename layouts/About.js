import { markdownify } from "@lib/utils/textConverter";
import shortcodes from "@shortcodes/all";
import { MDXRemote } from "next-mdx-remote";
import estelle from "../public/images/estelle.png";
import maxime from "../public/images/maxime.png";
import david from "../public/images/david.png";
import stephane from "../public/images/stephane.png";
import brigitte from "../public/images/brigitte.png";
import josette from "../public/images/josette.png";
import ExportedImage from "next-image-export-optimizer";

const Default = ({ data }) => {
  const { frontmatter, mdxContent } = data;
  const { title } = frontmatter;
  return (
    <section className="section">
      <div className="container">
        {markdownify(title, "h1", "h2 mb-8 text-center")}
        <div className="content">
          <MDXRemote {...mdxContent} components={shortcodes} />
        </div>
        <div className="row text-center md:max-w-[1000px] md:m-auto justify-center">
          <div className="col-12 sm:col-6 md:col-4 md:max-w-[275px] mb-3">
            <ExportedImage
              className="mb-3"
              src={stephane}
              sizes="33vw"
              alt="stephane"
              priority
            />
            <h5 className="text-primary">Stéphane Carcenac</h5>
            <p>Président</p>
          </div>
          <div className="col-12 sm:col-6 md:col-4 md:max-w-[275px] mb-3">
            <ExportedImage
              className="mb-3"
              src={brigitte}
              sizes="33vw"
              alt="brigitte"
              priority
            />
            <h5 className="text-primary">Brigitte Lemoine</h5>
            <p>Vice-présidente et secrétaire</p>
          </div>
          <div className="col-12 sm:col-6 md:col-4 md:max-w-[275px] mb-3">
            <ExportedImage
              className="mb-3"
              src={david}
              sizes="33vw"
              alt="david"
              priority
            />
            <h5 className="text-primary">David Brunet</h5>
            <p>Directeur musical</p>
          </div>
          <div className="col-12 sm:col-6 md:col-4 md:max-w-[275px] mb-3">
            <ExportedImage
              className="mb-3"
              src={maxime}
              sizes="33vw"
              alt="maxime"
              priority
            />
            <h5 className="text-primary">Maxime Leduc</h5>
            <p>Trésorier</p>
          </div>
          <div className="col-12 sm:col-6 md:col-4 md:max-w-[275px] mb-3">
            <ExportedImage
              className="mb-3"
              src={josette}
              sizes="33vw"
              alt="josette"
              priority
            />
            <h5 className="text-primary">Josette Collomb</h5>
            <p>Secrétaire adjointe</p>
          </div>
          <div className="col-12 sm:col-6 md:col-4 md:max-w-[275px] mb-3">
            <ExportedImage
              className="mb-3"
              src={estelle}
              sizes="33vw"
              alt="estelle"
              priority
            />
            <h5 className="text-primary">Estelle Debache</h5>
            <p>Chargée de communication</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Default;
