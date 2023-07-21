import Base from "@layouts/Baseof";
import Youtube from "@shortcodes/Youtube"

const Videos = () => {
  const billetteries = [
    {title: "Concert du 25 Novembre 2023", src: "https://www.helloasso.com/associations/les-amis-de-l-harmonie/evenements/concert-du-25-novembre/widget-vignette"},
    {title: "Thé Dansant 2024", src: "https://www.helloasso.com/associations/les-amis-de-l-harmonie/evenements/the-dansant-2024-1/widget-vignette"},
  ]

  return (
    <Base title={`Billetterie`}>
      <div className="section">
        <div className="container">
          <h1 className="h2 mb-8 text-center">
            Billetterie
          </h1>
          <div className="row">
            {billetteries.map((billetterie) =>
              <div key={billetterie.title} className="col-12 mb-5 px-12 sm:col-6 text-center">
                <iframe id="haWidget" allowtransparency="true" src={billetterie.src} className="w-[350px] h-[650px] border-none mx-auto"></iframe>
              </div>
            )}
          </div>
        </div>
      </div>
    </Base>
  );
};

export default Videos;
