import { SocialIcons } from "./SocialIcons";

export function Footer() {
  return (
    <footer className="relative mt-auto">
      <div className="relative">
        <img
          src="/images/footer-bg-shape.svg"
          alt=""
          className="absolute top-0 left-0 w-full h-auto pointer-events-none"
          style={{ transform: "translateY(-99%)" }}
        />
      </div>

      <div className="relative bg-[#f5f5f5] pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <a href="/">
              <img
                src="/images/logo.png"
                alt="Les Amis de l'Harmonie de Sucy"
                className="h-20 w-auto mb-6"
              />
            </a>

            <nav className="flex flex-wrap justify-center gap-6 mb-8">
              <a href="/" className="text-[#333] hover:text-[#a5b3e2] transition-colors">
                Accueil
              </a>
              <a href="/contact" className="text-[#333] hover:text-[#a5b3e2] transition-colors">
                Contact
              </a>
              <a href="/legal" className="text-[#333] hover:text-[#a5b3e2] transition-colors">
                Mentions Légales
              </a>
            </nav>

            <div className="mb-8">
              <SocialIcons className="[&_a]:text-[#333] [&_a:hover]:text-[#a5b3e2]" iconSize={24} />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
