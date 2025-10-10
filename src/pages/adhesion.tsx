import Layout from "../components/Layout";

const Adhesion = () => (
  <Layout title={`Adhésion`}>
    <div className="py-16">
      <div className="mx-auto max-w-[1320px]">
        <h1 className="font-secondary font-bold leading-tight text-black text-h2-sm md:text-h2 mb-8 text-center">
          Adhésion 2025-2026
        </h1>
        <div className="flex flex-wrap">
          <div className="w-full">
            <p>
              Devenez un super fan de l&apos;Harmonie Municipale de Sucy-en-brie
              ! <br />
              En adhérant à notre association &quot;Les Amis de
              l&apos;Harmonie&quot; vous nous aidez à mettre en place de beaux
              projets et à soutenir l&apos;Harmonie Municipale de Sucy-en-Brie.
              Vous pourrez également bénéficier de tarifs préférentiels sur
              certains de nos évènements. <br />
              L&apos;adhésion est valable du 01 août 2025 au 31 juillet 2026.{" "}
              <br />
              <br /> Une fois le paiement effectué vous receverez une
              confirmation par email.
            </p>
          </div>
          <div className="w-full mt-12">
            <iframe
              id="haWidget"
              allowTransparency={true}
              scrolling="auto"
              src="https://www.helloasso.com/associations/les-amis-de-l-harmonie/adhesions/adhesion-2025-2026/widget"
              className="w-full h-[800px] border-none"
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  </Layout>
);

export default Adhesion;
