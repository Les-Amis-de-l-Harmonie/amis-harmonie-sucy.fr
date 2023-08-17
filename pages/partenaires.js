import Base from "@layouts/Baseof";
import sucy from "../public/images/logo-sucy.jpeg";
import sla from "../public/images/logo-sla.png";
import cmontaleau from "../public/images/logo-clubmontaleau.jpeg";
import kifekoi from "../public/images/logo-kifekoi.png";
import cmf from "../public/images/logo-cmf.png";
import confrerie from "../public/images/logo-confrerie.jpeg";
import ExportedImage from "next-image-export-optimizer";

const p1 = "L'association \"Les Amis de l'Harmonie\" a la chance d'être soutenue par la Ville de Sucy-en-Brie, l'association \"Kifékoi?\", la Confrérie des Côteaux de Sucy, l'association \"Sucy Loisirs Accueil\", l'association \"Le Club Montaleau\" et la confédération musicale de France.";

const p2 = "L’aboutissement et la réussite de ces nombreux projets reposent aussi sur votre engagement à nos côtés et nous vous en sommes très reconnaissants. Par ce petit geste, vous permettez à nos beaux projets de voir le jour !";

const Partenaires = () =>
  <Base title={`Partenaires`}>
    <div className="section">
      <div className="container">
        <h1 className="h2 mb-8 text-center ">
          Partenaires
        </h1>
        <div className="row">
          <div className="col-12 ">
            <h6 className="text-primary">ILS NOUS SOUTIENNENT !</h6>
            <p>{p1}</p>

          </div>
          <div className="col-12">
            <div className="row">
              <div className="flex col-6 sm:col-4 md:col-2 items-center">
                <ExportedImage
                  className="mb-3 w-full"
                  src={sucy}
                  sizes="17vw"
                  alt="sucy"
                />
              </div>
              <div className="flex col-6 sm:col-4 md:col-2 items-center">
                <ExportedImage
                  className="mb-3 w-full"
                  src={kifekoi}
                  sizes="17vw"
                  alt="kifekoi"
                />
              </div>
              <div className="flex col-6 sm:col-4 md:col-2 items-center">
                <ExportedImage
                  className="mb-3 w-full"
                  src={confrerie}
                  sizes="17vw"
                  alt="confrerie"
                />
              </div>
              <div className="flex col-6 sm:col-4 md:col-2 items-center">
                <ExportedImage
                  className="mb-3 w-full"
                  src={sla}
                  sizes="17vw"
                  alt="sla"
                />
              </div>
              <div className="flex col-6 sm:col-4 md:col-2 items-center">
                <ExportedImage
                  className="mb-3 w-full"
                  src={cmontaleau}
                  sizes="17vw"
                  alt="montaleau"
                />
              </div>
              <div className="flex col-6 sm:col-4 md:col-2 items-center">
                <ExportedImage
                  className="mb-3 w-full"
                  src={cmf}
                  sizes="17vw"
                  alt="cmf"
                />
              </div>
            </div>
          </div>
          <div className="col-12 mt-32">
            <h6 className="text-primary">ET SI, VOUS AUSSI, VOUS NOUS SOUTENIEZ ?</h6>
            <p>{p2}</p>
          </div>
          <div className="col-12">
            <iframe id="haWidget" allowtransparency="true" src="https://www.helloasso.com/associations/les-amis-de-l-harmonie/formulaires/1/widget" className="w-full h-[1300px] b-none" />
          </div>
        </div>
      </div>
    </div>
  </Base>

export default Partenaires;
