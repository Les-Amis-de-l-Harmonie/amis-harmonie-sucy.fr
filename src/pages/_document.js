import { Head, Html, Main, NextScript } from "next/document";

const Document = () => {
  return (
    <Html lang="fr">
      <Head>
        {/* favicon */}
        <link rel="shortcut icon" href="/images/favicon.png" />
        {/* theme meta */}
        <meta name="theme-name" content="amis-harmonie" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content="#fff"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
};

export default Document;
