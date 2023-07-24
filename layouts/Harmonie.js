import { markdownify } from "@lib/utils/textConverter";
import shortcodes from "@shortcodes/all";
import { MDXRemote } from "next-mdx-remote";
import ImageFallback from "@layouts/components/ImageFallback";

const Default = ({ data }) => {
  const { frontmatter, mdxContent } = data;
  const { title, banner1, banner2, banner3, banner4 } = frontmatter;
  return (
    <section className="section">
      <div className="container">
        {markdownify(title, "h1", "h2 mb-8 text-center")}
        <ImageFallback
          className=""
          src={"/images/harmonie.png"}
          width="5000"
          height="1429"
          alt="banner-harmonie"
          priority
        />
        <div className="content">
          <MDXRemote {...mdxContent} components={shortcodes} />
        </div>
        <div className="row rounded-2xl bg-primary mt-16">
          <div className="col-12 md:col-3 my-6 px-16 px-10 md:py-10 border-b-4 md:border-b-0 md:border-r-4">
            <ImageFallback
              className="w-[100px] h-auto md:w-[500px] mx-auto"
              src={"/images/i.png"}
              width="500"
              height="500"
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
