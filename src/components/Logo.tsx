import React from "react";
import ExportedImage from "next-image-export-optimizer";
import Link from "next/link";

interface LogoProps {
  src?: string;
}

const Logo: React.FC<LogoProps> = ({ src }) => {
  const logo = "/images/logo.png";
  const logo_width = "100";
  const logo_height = "100";
  const logo_text = "Les Amis de l'Harmonie";
  const title = "Les Amis de l'Harmonie de Sucy";

  return (
    <Link href="/" className="navbar-brand">
      {src || logo ? (
        <ExportedImage
          width={parseInt(logo_width) * 2}
          height={parseInt(logo_height) * 2}
          src={logo}
          alt={title}
          style={{
            height: logo_height + "px",
            width: logo_width + "px",
          }}
          className={"m-auto"}
        />
      ) : logo_text ? (
        logo_text
      ) : (
        title
      )}
    </Link>
  );
};

export default Logo;
