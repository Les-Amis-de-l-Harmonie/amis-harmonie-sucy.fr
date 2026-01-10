import styles from "./styles.css?url";

export interface PageMeta {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article";
  noindex?: boolean;
}

interface DocumentProps {
  children: React.ReactNode;
  meta?: PageMeta;
}

const SITE_NAME = "Les Amis de l'Harmonie de Sucy";
const SITE_URL = "https://amis-harmonie-sucy.fr";
const DEFAULT_IMAGE = `${SITE_URL}/images/og-image.jpg`;
const DEFAULT_DESCRIPTION = "Association Les Amis de l'Harmonie de Sucy-en-Brie - Soutenez l'Harmonie Municipale, participez à nos événements musicaux et rejoignez notre communauté passionnée de musique.";

export const Document: React.FC<DocumentProps> = ({ children, meta = {} }) => {
  const title = meta.title ? `${meta.title} | ${SITE_NAME}` : SITE_NAME;
  const description = meta.description || DEFAULT_DESCRIPTION;
  const image = meta.image || DEFAULT_IMAGE;
  const url = meta.url ? `${SITE_URL}${meta.url}` : SITE_URL;
  const type = meta.type || "website";

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": SITE_NAME,
    "url": SITE_URL,
    "logo": `${SITE_URL}/images/logo.png`,
    "description": DEFAULT_DESCRIPTION,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Maison des Associations - 14 Place du Clos de Pacy",
      "addressLocality": "Sucy-en-Brie",
      "postalCode": "94370",
      "addressCountry": "FR"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+33783511741",
      "email": "contact@amis-harmonie-sucy.fr",
      "contactType": "customer service"
    },
    "sameAs": [
      "https://www.facebook.com/HarmonieMunicipaleDeSucy/",
      "https://www.instagram.com/harmoniemunicipaledesucy/",
      "https://youtube.com/@HarmonieMunicipaledeSucy"
    ]
  };

  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        <title>{title}</title>
        <meta name="description" content={description} />
        
        <link rel="canonical" href={url} />
        
        {meta.noindex && <meta name="robots" content="noindex, nofollow" />}
        
        <meta property="og:type" content={type} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={image} />
        <meta property="og:url" content={url} />
        <meta property="og:locale" content="fr_FR" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={image} />
        
        <meta name="theme-color" content="#a5b3e2" />
        <link rel="icon" href="/images/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/images/logo.png" />
        
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Merriweather+Sans:wght@400;500;600;700&family=Raleway:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href={styles} />
        <link rel="modulepreload" href="/src/client.tsx" />
        
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="bg-bg text-text font-[Raleway,sans-serif] transition-colors duration-300">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}})();`,
          }}
        />
        <div id="root">{children}</div>
        <script>import("/src/client.tsx")</script>
      </body>
    </html>
  );
};
