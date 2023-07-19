import { markdownify } from "@lib/utils/textConverter";
import shortcodes from "@shortcodes/all";
import { MDXRemote } from "next-mdx-remote";
import Image from "next/image";

const About = ({ data }) => {
  const { frontmatter, mdxContent } = data;
  const { title, image, education, experience } = frontmatter;

  return (
    <section className="section mt-16">
      <div className="container text-center">
        {image && (
          <div className="mb-8">
            <Image
              src={image}
              width={1298}
              height={616}
              alt={title}
              className="rounded-lg"
              priority={true}
            />
          </div>
        )}
        {markdownify(title, "h1", "h1 text-left lg:text-[55px] mt-12")}

        <div className="content text-left">
          <MDXRemote {...mdxContent} components={shortcodes} />
        </div>
      </div>
    </section>
  );
};

export default About;
