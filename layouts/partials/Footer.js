import Social from "@components/Social";
import menu from "@config/menu.json";
import social from "@config/social.json";
import ExportedImage from "next-image-export-optimizer";
import Logo from "@layouts/components/Logo";
import Link from "next/link";

const Footer = () => {
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
          {menu.footer.map((menu) => (
            <li className="inline-block" key={menu.name}>
              <Link
                href={menu.url}
                className="p-2 font-bold text-dark hover:text-primary dark:text-darkmode-light lg:p-4"
              >
                {menu.name}
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
