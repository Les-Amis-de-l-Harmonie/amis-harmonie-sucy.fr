import Head from "next/head";
import { useEffect, useState } from "react";
import { AppProps } from "next/app";
// @ts-ignore
import TagManager from "react-gtm-module";
import "../globals.css";

const App: React.FC<AppProps> = ({ Component, pageProps }) => {
  // import google font css
  const pf = "Raleway:wght@400";
  const sf = "Merriweather Sans:wght@400;700";
  const [fontcss, setFontcss] = useState<string | undefined>();
  useEffect(() => {
    fetch(
      `https://fonts.googleapis.com/css2?family=${pf}${
        sf ? "&family=" + sf : ""
      }&display=swap`,
    ).then((res) => res.text().then((css) => setFontcss(css)));
  }, []);

  // google tag manager (gtm)
  const tagManagerArgs = {
    gtmId: "GTM-W6FQL9WS",
  };
  useEffect(() => {
    setTimeout(() => {
      process.env.NODE_ENV === "production" &&
        TagManager.initialize(tagManagerArgs);
    }, 5000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Head>
        {/* google font css */}
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `${fontcss}`,
          }}
        />
        {/* responsive meta */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
      </Head>
      <Component {...pageProps} />
    </>
  );
};

export default App;
