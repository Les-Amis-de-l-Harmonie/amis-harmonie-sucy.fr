import Base from "@layouts/Baseof";
import {Evenement, evenements} from "./evenements"

const Videos = () => 
<Base title={`Billetterie`}>
  <div className="section">
    <div className="container">
      <h1 className="h2 mb-8 text-center">
        Billetterie
      </h1>
      <div className="row justify-center">
        {evenements
          .filter((evenement) => typeof evenement.url !== "undefined")
          .map((evenement) =>
          <Evenement key={evenement.title} evenement={evenement} />
        )}
      </div>
    </div>
  </div>
</Base>

export default Videos;
