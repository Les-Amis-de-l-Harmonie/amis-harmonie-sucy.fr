import { SocialIcons } from "./SocialIcons";

export function Footer() {
  return (
    <footer className="py-16 relative mt-12 pt-3 pb-3">
      <img
        src="/images/footer-bg-shape.svg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-left md:object-top -z-[1] dark:opacity-20"
      />
      <div className="mx-auto max-w-[1320px] text-center">
        <div className="mb-6 inline-flex">
          <a href="/">
            <img
              src="/images/logo.webp"
              alt="Les Amis de l'Harmonie de Sucy"
              className="h-20 w-auto dark:hidden"
            />
            <img
              src="/images/logo-dark.webp"
              alt="Les Amis de l'Harmonie de Sucy"
              className="h-20 w-auto hidden dark:block"
            />
          </a>
        </div>

        <ul className="mb-12 mt-6 flex-wrap space-x-2 lg:space-x-4">
          <li className="inline-block">
            <a href="/" className="p-2 font-bold text-gray-900 dark:text-gray-100 hover:text-primary lg:p-4">
              Accueil
            </a>
          </li>
          <li className="inline-block">
            <a href="/contact" className="p-2 font-bold text-gray-900 dark:text-gray-100 hover:text-primary lg:p-4">
              Contact
            </a>
          </li>
          <li className="inline-block">
            <a href="/legal" className="p-2 font-bold text-gray-900 dark:text-gray-100 hover:text-primary lg:p-4">
              Mentions Légales
            </a>
          </li>
        </ul>

        <div className="inline-flex mb-12">
          <SocialIcons
            className="flex items-center space-x-3 px-4 justify-center lg:border-x lg:border-gray-300 dark:lg:border-gray-600"
            iconSize={24}
          />
        </div>
      </div>
    </footer>
  );
}
