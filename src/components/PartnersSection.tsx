import ExportedImage from "next-image-export-optimizer";
import Link from "next/link";
import { StaticImageData } from "next/image";

interface Partner {
  src: StaticImageData;
  alt: string;
  link: string;
}

interface PartnersSectionProps {
  title: string;
  description: string;
  partners: Partner[];
}

const PartnersSection: React.FC<PartnersSectionProps> = ({ title, description, partners }) => {
  return (
    <>
      <p className="text-lg text-gray-700 text-center max-w-4xl mx-auto">
        {description}
      </p>
      <div className="flex flex-wrap justify-center gap-8">
        {partners.map((partner) => (
          <Link
            href={partner.link}
            key={partner.alt}
            target="_blank"
            className=""
          >
            <ExportedImage
              src={partner.src}
              alt={partner.alt}
              className="h-16 w-auto"
              sizes="100px"
            />
          </Link>
        ))}
      </div>
    </>
  );
};

export default PartnersSection;