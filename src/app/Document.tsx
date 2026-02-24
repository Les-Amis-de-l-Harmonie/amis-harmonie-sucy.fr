import type { DocumentProps } from "rwsdk/router";
import styles from "./styles.css?url";
import {
  SITE_NAME,
  SITE_URL,
  DEFAULT_OG_IMAGE,
  DEFAULT_DESCRIPTION,
  getPageSeo,
  isNoIndexPath,
} from "@/app/seo";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/images/logo.webp`,
  description: DEFAULT_DESCRIPTION,
  address: {
    "@type": "PostalAddress",
    streetAddress: "Maison des Associations - 14 Place du Clos de Pacy",
    addressLocality: "Sucy-en-Brie",
    postalCode: "94370",
    addressCountry: "FR",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+33783511741",
    email: "contact@amis-harmonie-sucy.fr",
    contactType: "customer service",
  },
  sameAs: [
    "https://www.facebook.com/HarmonieMunicipaleDeSucy/",
    "https://www.instagram.com/harmoniemunicipaledesucy/",
    "https://youtube.com/@HarmonieMunicipaledeSucy",
  ],
};

const structuredDataJson = JSON.stringify(structuredData);

export const Document: React.FC<DocumentProps> = ({ children, path = "/" }) => {
  const { title, description } = getPageSeo(path);
  const canonical = `${SITE_URL}${path.replace(/\/+$/, "") || "/"}`;
  const noindex = isNoIndexPath(path);

  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <title>{title}</title>
        <meta name="description" content={description} />

        <link rel="canonical" href={canonical} />

        {noindex ? (
          <meta name="robots" content="noindex, nofollow" />
        ) : (
          <meta name="robots" content="index, follow" />
        )}

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={DEFAULT_OG_IMAGE} />
        <meta property="og:url" content={canonical} />
        <meta property="og:locale" content="fr_FR" />

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={DEFAULT_OG_IMAGE} />

        <meta name="geo.region" content="FR-94" />
        <meta name="geo.placename" content="Sucy-en-Brie" />

        <meta name="theme-color" content="#a5b3e2" />
        <link rel="icon" href="/images/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/images/logo.png" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Clash+Display:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href={styles} />
        <link rel="modulepreload" href="/src/client.tsx" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: structuredDataJson }}
        />
      </head>
      <body className="bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-[Plus Jakarta Sans,sans-serif] transition-colors duration-300">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}})();`,
          }}
        />
        <div id="root">{children}</div>
        <script>import("/src/client.tsx")</script>
      </body>
    </html>
  );
};
