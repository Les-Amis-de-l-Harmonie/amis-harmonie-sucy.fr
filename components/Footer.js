import Social from "./Social";
import ExportedImage from "next-image-export-optimizer";
import Logo from "./Logo";
import Link from "next/link";

const Footer = () => {
  const footer = [
    {
      name: "Accueil",
      url: "/",
    },
    {
      name: "L'Association",
      url: "/about",
    },
    {
      name: "L'Harmonie",
      url: "/harmonie",
    },
    {
      name: "Partenaires",
      url: "/partenaires",
    },
    {
      name: "Vidéos",
      url: "/videos",
    },
    {
      name: "Publications",
      url: "/publications",
    },
    {
      name: "Évènements",
      url: "/#evenements",
    },
    {
      name: "Billetterie",
      url: "/billetterie",
    },
    {
      name: "Adhésion",
      url: "/adhesion",
    },
    {
      name: "Contact",
      url: "/contact",
    },
    {
      name: "Mentions Légales",
      url: "/legal",
    },
  ];

  const social = {
    facebook: "https://www.facebook.com/HarmonieMunicipaleDeSucy/",
    stackoverflow: "",
    twitter: "",
    instagram: "https://www.instagram.com/harmoniemunicipaledesucy/",
    youtube: "https://youtube.com/@HarmonieMunicipaledeSucy",
    linkedin: "",
    github: "",
    gitlab: "",
    discord: "",
    slack: "",
    medium: "",
    codepen: "",
    bitbucket: "",
    dribbble: "",
    behance: "",
    pinterest: "",
    soundcloud: "",
    tumblr: "",
    reddit: "",
    vk: "",
    whatsapp: "",
    snapchat: "",
    vimeo: "",
    tiktok: "",
    foursquare: "",
    rss: "",
    email: "contact@amis-harmonie-sucy.fr",
    don: "https://www.helloasso.com/associations/les-amis-de-l-harmonie/formulaires/1",
    phone: "",
    address: "",
    skype: "",
    website: "",
  };
  return (
    <footer className="section relative mt-12 pt-3 pb-3">
      <ExportedImage
        className="-z-[1] object-cover object-left md:object-top"
        src="/images/footer-bg-shape.svg"
        alt="footer background"
        fill={true}
      />
      <div className="container text-center">
        <div className="mb-6 inline-flex">
          <Logo />
        </div>

        {/* footer menu */}
        <ul className="mb-12 mt-6 flex-wrap space-x-2 lg:space-x-4">
          {footer.map((item) => (
            <li className="inline-block" key={item.name}>
              <Link
                href={item.url}
                className="p-2 font-bold text-dark hover:text-primary dark:text-darkmode-light lg:p-4"
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
        {/* social icons */}
        <div className="inline-flex">
          <Social source={social} className="socials mb-12 justify-center" />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
