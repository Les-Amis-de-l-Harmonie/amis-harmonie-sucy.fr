import React from "react";
import {
  IoLogoFacebook,
  IoLogoInstagram,
  IoLogoYoutube,
  IoMail,
  IoHeart,
} from "react-icons/io5";

interface SocialLinks {
  facebook?: string;
  instagram?: string;
  youtube?: string;
  email?: string;
  don?: string;
}

interface SocialProps {
  source: SocialLinks;
  className?: string;
}

const Social: React.FC<SocialProps> = ({ source, className }) => {
  const { facebook, instagram, youtube, email, don } = source;
  return (
    <ul className={className}>
      {facebook && (
        <li className="inline-block">
          <a
            aria-label="facebook"
            href={facebook}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-block px-2 py-1 text-lg text-dark hover:text-primary"
          >
            <IoLogoFacebook />
          </a>
        </li>
      )}
      {instagram && (
        <li className="inline-block">
          <a
            aria-label="instagram"
            href={instagram}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-block px-2 py-1 text-lg text-dark hover:text-primary"
          >
            <IoLogoInstagram />
          </a>
        </li>
      )}
      {youtube && (
        <li className="inline-block">
          <a
            aria-label="youtube"
            href={youtube}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-block px-2 py-1 text-lg text-dark hover:text-primary"
          >
            <IoLogoYoutube />
          </a>
        </li>
      )}
      {email && (
        <li className="inline-block">
          <a
            aria-label="email"
            href={`mailto:${email}`}
            className="inline-block px-2 py-1 text-lg text-dark hover:text-primary"
          >
            <IoMail />
          </a>
        </li>
      )}
      {don && (
        <li className="inline-block">
          <a
            aria-label="don"
            href={don}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-block px-2 py-1 text-lg text-dark hover:text-primary"
          >
            <IoHeart />
          </a>
        </li>
      )}
    </ul>
  );
};

export default Social;
