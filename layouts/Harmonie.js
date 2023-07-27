import { markdownify } from "@lib/utils/textConverter";
import shortcodes from "@shortcodes/all";
import { MDXRemote } from "next-mdx-remote";
import harmoniePng from "../public/images/harmonie.png";
import i from "../public/images/i.png";
import ExportedImage from "next-image-export-optimizer";

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
      </div>
    </section>
  );
};

export default Default;
