import Head from "next/head";
import { useEffect, useState } from "react";
import TagManager from "react-gtm-module";
import "../globals.css";

const App = ({ Component, pageProps }) => {
  // import google font css
  const pf = "Raleway:wght@400";
  const sf = "Merriweather Sans:wght@400;700";
  const [fontcss, setFontcss] = useState();
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
          crossOrigin="true"
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
