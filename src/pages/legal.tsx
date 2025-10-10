/* eslint-disable react/no-unescaped-entities */
import Layout from "../components/Layout";

const Legal = () => {
  return (
    <Layout title="Mentions Légales" description="Mentions Légales">
      <section className="py-16">
        <div className="mx-auto max-w-[1320px]">
          <h2 className="font-secondary font-bold leading-tight text-black text-h2-sm md:text-h2 mb-8 text-center">
            Mentions Légales
          </h2>
          <div className="prose max-w-none">
            <p>
              Conformément aux dispositions de la loi n° 2004-575 du 21 juin
              2004 pour la confiance en l'économie numérique, il est précisé aux
              utilisateurs du site{" "}
              <strong>Les Amis de l'Harmonie de Sucy-en-Brie</strong> l'identité
              des différents intervenants dans le cadre de sa réalisation et de
              son suivi.
            </p>
            <h3>Edition du site</h3>
            <p>
              Le présent site, accessible à l’URL{" "}
              <strong>amis-harmonie-sucy.fr</strong> (le « Site »), est édité
              par :
            </p>
            <p>
              L’association{" "}
              <strong>Les Amis de l'Harmonie de Sucy-en-Brie</strong>,
              enregistrée auprès de la préfecture/sous-préfecture de 94 -
              Préfecture Créteil sous le numéro W941006153, ayant son siège
              situé à la Maison des Associations - 14 Place du Clos de Pacy,
              94370 Sucy-en-Brie, représentée par Maxime Leduc dûment habilité.
            </p>
            <h3>Hébergement</h3>
            <p>
              Le Site est hébergé par la société GITHUB B.H. via le service
              Github Pages, situé 95 RUE LA BOETIE 75008 PARIS, (contact
              téléphonique ou email : support@github.com).
            </p>
            <h3>Directeur de publication</h3>
            <p>Le Directeur de la publication du Site est Maxime Leduc.</p>
            <h3>Nous contacter</h3>
            <p>
              Par téléphone : 07 83 51 17 41
              <br />
              Par email : contact@amis-harmonie-sucy.fr
              <br />
              Par courrier : Maison des associations - 14 Place du Clos de Pacy,
              94370 Sucy-en-Brie
            </p>
            <h3>Données personnelles</h3>
            <p>
              Le traitement de vos données à caractère personnel est régi par
              notre Charte du respect de la vie privée, disponible depuis la
              section "Charte de Protection des Données Personnelles",
              conformément au Règlement Général sur la Protection des Données
              2016/679 du 27 avril 2016 («RGPD»).
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Legal;
