import Base from "@layouts/Baseof";

const Adhesion = () =>
  <Base title={`Billetterie`}>
    <div className="section">
      <div className="container">
        <h1 className="h2 mb-8 text-center">
          Adhésion 2024-2025
        </h1>
        <div className="row">
          <div className="col-12">
            <p>
              Devenez un super fan de l&apos;Harmonie Municipale de Sucy-en-brie ! <br/>
              En adhérant à notre association &quot;Les Amis de l&apos;Harmonie&quot; vous nous aidez à mettre en place de beaux projets et à soutenir l&apos;Harmonie Municipale de Sucy-en-Brie.
              Vous pourrez également bénéficier de tarifs préférentiels sur certains de nos évènements. <br/>
              L&apos;adhésion est valable du 01 août 2024 au 31 juillet 2025. <br/>


              <br/> Une fois le paiement effectué vous receverez une confirmation par email.
            </p>
          </div>
          <div className="col-12 mt-12">
            <iframe
              id="haWidget"
              allowtransparency="true"
              scrolling="auto"
              src="https://www.helloasso.com/associations/les-amis-de-l-harmonie/adhesions/adhesion-2024-2025/widget"
              className="w-full h-[800px] border-none">
            </iframe>
          </div>
        </div>
      </div>
    </div>
  </Base>

export default Adhesion;
