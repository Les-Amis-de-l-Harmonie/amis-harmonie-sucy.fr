import { ScrollReveal } from "@/app/components/ScrollReveal";

export function Legal() {
  return (
    <>
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <ScrollReveal>
              <h1 className="font-['Merriweather_Sans'] text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-8 text-center">
                Mentions Légales
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Conformément aux dispositions de la loi n° 2004-575 du 21 juin 2004 pour la
                confiance en l'économie numérique, il est précisé aux utilisateurs du site{" "}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  Les Amis de l'Harmonie de Sucy-en-Brie
                </span>{" "}
                l'identité des différents intervenants dans le cadre de sa réalisation et de son
                suivi.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={150}>
              <section className="mb-8">
                <h3 className="font-['Merriweather_Sans'] text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Edition du site
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Le présent site, accessible à l'URL{" "}
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    amis-harmonie-sucy.fr
                  </span>{" "}
                  (le « Site »), est édité par :
                </p>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  L'association{" "}
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    Les Amis de l'Harmonie de Sucy-en-Brie
                  </span>
                  , enregistrée auprès de la préfecture/sous-préfecture de 94 - Préfecture Créteil
                  sous le numéro W941006153, ayant son siège situé à la Maison des Associations - 14
                  Place du Clos de Pacy, 94370 Sucy-en-Brie, représentée par Maxime Leduc dûment
                  habilité.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <section className="mb-8">
                <h3 className="font-['Merriweather_Sans'] text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Hébergement
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Le Site est hébergé par Cloudflare, Inc., situé 101 Townsend St, San Francisco, CA
                  94107, USA.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal delay={250}>
              <section className="mb-8">
                <h3 className="font-['Merriweather_Sans'] text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Directeur de publication
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Le Directeur de la publication du Site est Maxime Leduc.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <section className="mb-8">
                <h3 className="font-['Merriweather_Sans'] text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Nous contacter
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Par téléphone : 07 83 51 17 41
                  <br />
                  Par email : contact@amis-harmonie-sucy.fr
                  <br />
                  Par courrier : Maison des associations - 14 Place du Clos de Pacy, 94370
                  Sucy-en-Brie
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal delay={350}>
              <section className="mb-8">
                <h3 className="font-['Merriweather_Sans'] text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Données personnelles
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Le traitement de vos données à caractère personnel est régi par notre Charte du
                  respect de la vie privée, disponible depuis la section "Charte de Protection des
                  Données Personnelles", conformément au Règlement Général sur la Protection des
                  Données 2016/679 du 27 avril 2016 («RGPD»).
                </p>
                <p className="text-gray-600 dark:text-gray-400 mt-4">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    Réservations gratuites (Rencontre d'Harmonies du 14 novembre 2026).
                  </span>{" "}
                  Les nom, prénom, adresse e-mail et nombre de places saisis dans le formulaire de
                  réservation sont traités par l'association pour gérer votre réservation :
                  confirmation, rappel et message de remerciement après le concert. Seuls les
                  membres du Bureau y ont accès ; elles ne sont transmises à personne.
                  Ces données sont supprimées au plus
                  tard le 31 décembre 2026, sauf si vous avez demandé à recevoir nos prochaines
                  dates : dans ce cas, nous conservons votre nom, votre prénom et votre adresse
                  e-mail jusqu'à votre désinscription, possible à tout moment. Les e-mails sont
                  envoyés par nos prestataires d'envoi (Resend, Mailchimp). Vous pouvez accéder à
                  vos données, les faire corriger ou supprimer en écrivant à
                  contact@amis-harmonie-sucy.fr.
                </p>
              </section>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </>
  );
}
