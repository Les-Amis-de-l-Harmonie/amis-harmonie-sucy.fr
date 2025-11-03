import Layout from "../components/Layout";

const notFound = () => {
  return (
    <Layout
      title="Page Introuvable - Les Amis de l'Harmonie de Sucy-en-Brie"
      description="Désolé, la page que vous cherchez n'existe pas sur le site des Amis de l'Harmonie de Sucy-en-Brie. Retournez à l'accueil pour découvrir nos événements musicaux, concerts et actualités de l'orchestre municipal."
    >
      <section className="py-16">
        <div className="mx-auto max-w-[1320px]">
          <div className="flex flex-wrap">
            <div className="w-full">
              <h1 className="font-secondary font-bold leading-tight text-black text-h1-sm md:text-h1 mb-4 text-center">
                404
              </h1>
              <p className="text-center">Page not found</p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default notFound;
