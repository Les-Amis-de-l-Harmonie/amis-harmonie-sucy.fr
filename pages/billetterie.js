import Base from "@layouts/Baseof";
import {Evenement, evenements} from "./evenements"

export const hasBilletterie = () => {
  return Boolean(evenements.filter(isBilletterie).length)
}

const today = new Date()
today.setHours(0,0,0,0)

const isBilletterie = (evt) => {
  return new Date(Date.parse(evt.d)) >= today && typeof evt.url !== "undefined" && evt.url !== ""
}

const Videos = () =>
<Base title={`Billetterie`}>
  <div className="section">
    <div className="container">
      <h1 className="h2 mb-8 text-center">
        Billetterie
      </h1>
      <div className="row justify-center">
        {evenements
          .filter(isBilletterie)
          .map((evenement) =>
          <Evenement key={evenement.title} evenement={evenement} />
        )}
      </div>
    </div>
  </div>
</Base>

export default Videos;
