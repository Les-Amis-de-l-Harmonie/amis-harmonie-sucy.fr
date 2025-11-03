import React from "react";
import Header from "./Header";
import Footer from "./Footer";
import Head from "next/head";

interface LayoutProps {
  title?: string;
  meta_title?: string;
  description?: string;
  image?: string;
  noindex?: boolean;
  canonical?: string;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({
  title,
  meta_title,
  description,
  image,
  noindex,
  canonical,
  children,
}) => {
  const meta_author = "Les Amis de l'Harmonie de Sucy-en-Brie";
  const meta_description =
    "Site officiel de l'association Les Amis de l'Harmonie de Sucy-en-Brie.";
  const base_url = "/";
  const meta_image = "/images/logo.png";

  return (
    <>
      <Head>
        {/* title */}
        <title>
          {meta_title
            ? meta_title
            : title
              ? title
              : "Les Amis de l'Harmonie de Sucy-en-Brie"}
        </title>

        {/* canonical url */}
        {canonical && <link rel="canonical" href={canonical} itemProp="url" />}

        {/* noindex robots */}
        {noindex && <meta name="robots" content="noindex,nofollow" />}

        {/* meta-description */}
        <meta
          name="description"
          content={description ? description : meta_description}
        />

        {/* author from config.json */}
        <meta name="author" content={meta_author} />

        {/* og-title */}
        <meta
          property="og:title"
          content={
            meta_title
              ? meta_title
              : title
                ? title
                : "Les Amis de l'Harmonie de Sucy"
          }
        />

        {/* og-description */}
        <meta
          property="og:description"
          content={description ? description : meta_description}
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${base_url}`} />

        {/* twitter-title */}
        <meta
          name="twitter:title"
          content={
            meta_title
              ? meta_title
              : title
                ? title
                : "Les Amis de l'Harmonie de Sucy"
          }
        />

        {/* twitter-description */}
        <meta
          name="twitter:description"
          content={description ? description : meta_description}
        />

        {/* og-image */}
        <meta
          property="og:image"
          content={`${base_url}${image ? image : meta_image}`}
        />

        {/* twitter-image */}
        <meta
          name="twitter:image"
          content={`${base_url}${image ? image : meta_image}`}
        />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      <Header />
      {/* main site */}
      <main>{children}</main>
      <Footer />
    </>
  );
};

export default Layout;
