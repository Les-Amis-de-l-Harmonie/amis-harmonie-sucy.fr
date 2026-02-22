import { ScrollReveal } from "@/app/components/ScrollReveal";

export function Adhesion() {
  return (
    <>
      <title>Adhésion 2025-2026 | Les Amis de l'Harmonie de Sucy</title>
      <meta
        name="description"
        content="Rejoignez Les Amis de l'Harmonie de Sucy-en-Brie ! Adhérez à notre association pour soutenir l'Harmonie Municipale et bénéficier de tarifs préférentiels."
      />
      <meta property="og:title" content="Adhésion 2025-2026 | Les Amis de l'Harmonie de Sucy" />
      <meta
        property="og:description"
        content="Rejoignez Les Amis de l'Harmonie de Sucy-en-Brie ! Adhérez à notre association."
      />
      <meta property="og:url" content="https://amis-harmonie-sucy.fr/adhesion" />
      <link rel="canonical" href="https://amis-harmonie-sucy.fr/adhesion" />
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <ScrollReveal>
              <h1 className="font-['Merriweather_Sans'] text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-8 text-center">
                Adhésion 2025-2026
              </h1>
            </ScrollReveal>
            <ScrollReveal
              delay={100}
              className="text-gray-600 dark:text-gray-400 space-y-2 max-w-2xl mx-auto"
            >
              <p className="font-semibold">
                Devenez un super fan de l'Harmonie Municipale de Sucy-en-brie !
              </p>
              <p>
                En adhérant à notre association "Les Amis de l'Harmonie" vous nous aidez à mettre en
                place de beaux projets et à soutenir l'Harmonie Municipale de Sucy-en-Brie. Vous
                pourrez également bénéficier de tarifs préférentiels sur certains de nos évènements.
              </p>
              <p>L'adhésion est valable du 01 août 2025 au 31 juillet 2026.</p>
              <p className="pt-2">
                Une fois le paiement effectué vous receverez une confirmation par email.
              </p>
            </ScrollReveal>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/50 overflow-hidden">
            <iframe
              src="https://www.helloasso.com/associations/les-amis-de-l-harmonie/adhesions/adhesion-2025-2026/widget"
              className="w-full min-h-[800px] border-0"
              title="Formulaire d'adhésion HelloAsso"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </>
  );
}
