import Logo from "./Logo";
import Social from "./Social";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

const Header = () => {
  const main = [
    {
      name: "Évènements",
      url: "/#evenements",
    },
    {
      name: "Billetterie",
      url: "/billetterie",
    },
    {
      name: "À Propos",
      hasChildren: true,
      children: [
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
          name: "Contact",
          url: "/contact",
        },
      ],
    },
    {
      name: "Actualités",
      hasChildren: true,
      children: [
        {
          name: "Vidéos",
          url: "/videos",
        },
        {
          name: "Publications",
          url: "/publications",
        },
      ],
    },
    {
      name: "Livre d'Or",
      url: "/livre-or",
    },
    {
      name: "Adhésion",
      url: "/adhesion",
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

  // states declaration
  const [showMenu, setShowMenu] = useState(false);

  // Router
  const router = useRouter();

  //stop scrolling when nav is open
  useEffect(() => {
    if (showMenu) {
      document.body.classList.add("menu-open");
    } else {
      document.body.classList.remove("menu-open");
    }
  }, [showMenu]);

  return (
    <header className="top-0 z-50 border-b bg-body py-2">
      <nav className="relative flex flex-wrap items-center justify-between mx-auto max-w-[1320px] px-1 sm:px-8">
        <div className="order-0">
          <Logo />
        </div>
        <div className="flex items-center space-x-4 xl:space-x-8">
          <div
            className={`fixed right-0 top-0 z-10 mx-0 h-screen w-full max-w-[400px] items-center border-l border-l-dark bg-body p-6 transition-transform duration-300 ease-in-out lg:static lg:flex lg:h-auto lg:w-auto lg:max-w-full lg:space-x-4 lg:border-l-0 lg:bg-transparent lg:p-0 xl:space-x-8 ${
              !showMenu && "translate-x-full"
            } lg:flex lg:translate-x-0`}
          >
            <button
              className="absolute right-6 top-11 lg:hidden"
              onClick={() => setShowMenu(false)}
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                <title>Menu Close</title>
                <polygon
                  points="11 9 22 9 22 11 11 11 11 22 9 22 9 11 -2 11 -2 9 9 9 9 -2 11 -2"
                  transform="rotate(45 10 10)"
                />
              </svg>
            </button>
            <ul
              id="nav-menu"
              className="mt-16 lg:mt-0 w-full md:w-auto md:space-x-1 lg:flex xl:space-x-2"
            >
              {main.map((menu, i) => (
                <React.Fragment key={`menu-${i}`}>
                  {menu.hasChildren ? (
                    <li className="mb-5 text-left lg:mb-0 mr-0 group relative">
                      <span
                        className={`rounded-[30px] px-6 py-2.5 text-left font-secondary text-[13.5px] capitalize text-dark transition hover:bg-primary hover:text-white md:px-3 md:py-3 lg:text-center xl:px-5 normal-case! ${
                          menu.children
                            .map((c) => c.url)
                            .includes(router.asPath) && "bg-primary text-white"
                        } inline-flex items-center`}
                      >
                        {menu.name}
                        <svg
                          className="h-4 w-4 fill-current"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                      </span>
                      <ul className="pt-1.5 z-10 rounded-lg border border-transparent bg-body shadow-sm hidden transition-all duration-300 group-hover:top-[46px] group-hover:block md:invisible md:absolute md:top-[60px] md:block md:opacity-0 md:group-hover:visible md:group-hover:opacity-100">
                        {menu.children.map((child, i) => (
                          <li className="mb-1.5" key={`children-${i}`}>
                            <Link
                              href={child.url}
                              className={`min-w-[100px] rounded py-2.5 px-3.5 text-[13.5px] font-semibold text-dark transition hover:bg-primary/10 hover:text-primary block ${
                                router.asPath === child.url &&
                                "bg-primary/10 text-primary"
                              }`}
                            >
                              {child.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ) : (
                    <li className="mb-5 text-left lg:mb-0">
                      <Link
                        href={menu.url}
                        className={`rounded-[30px] px-6 py-2.5 text-left font-secondary text-[13.5px] capitalize text-dark transition hover:bg-primary hover:text-white md:px-3 md:py-3 lg:text-center xl:px-5 normal-case! block ${
                          router.asPath === menu.url && "bg-primary text-white"
                        }`}
                      >
                        {menu.name}
                      </Link>
                    </li>
                  )}
                </React.Fragment>
              ))}
            </ul>
            {/* header social */}
            <Social
              source={social}
              className="mx-3 flex items-center justify-center space-x-3 px-4 lg:justify-start lg:border-x 2xl:space-x-4"
            />
          </div>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white lg:hidden"
          >
            {showMenu ? (
              <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                <title>Menu Close</title>
                <polygon
                  points="11 9 22 9 22 11 11 11 11 22 9 22 9 11 -2 11 -2 9 9 9 9 -2 11 -2"
                  transform="rotate(45 10 10)"
                />
              </svg>
            ) : (
              <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                <title>Menu Open</title>
                <path d="M0 3h20v2H0V3z m0 6h20v2H0V9z m0 6h20v2H0V0z" />
              </svg>
            )}
          </button>
        </div>
      </nav>
      {showMenu && (
        <div className="header-backdrop absolute top-0 left-0 h-screen w-full bg-black/50 lg:hidden"></div>
      )}
    </header>
  );
};

export default Header;
