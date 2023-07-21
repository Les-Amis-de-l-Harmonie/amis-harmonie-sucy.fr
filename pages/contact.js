import { markdownify } from "@lib/utils/textConverter";
import Link from "next/link";
import { FaEnvelope, FaMapMarkerAlt, FaUserAlt } from "react-icons/fa";
import ImageFallback from "@layouts/components/ImageFallback";
import Base from "@layouts/Baseof";

const Contact = () => {
  const title = "Contactez-nous"
  const description = "Contactez-nous"
  const phone = ""
  const mail = "contact@amis-harmonie-sucy.fr"
  const location = "Maison des associations - 14 Rue du Clos de Pacy, 94370 Sucy-en-Brie"

  return (
    <Base
      title={title}
      description={description}
      meta_title={title}
    >
      <section className="section">
        <div className="container">
          <div className="row relative">
            <ImageFallback
              className="-z-[1] object-cover object-top"
              src={"/images/map.svg"}
              fill="true"
              alt="map bg"
              priority={true}
            />
            {markdownify(
              title,
              "h1",
              "h2 mb-8 text-center"
            )}
          </div>
          <div className="row">
            {phone && (
              <div className="md:col-6 lg:col-4">
                <Link
                  href={`tel:${phone}`}
                  className="my-4 flex h-[100px] items-center justify-center
               rounded border border-border p-4 text-primary dark:border-darkmode-border"
                >
                  <FaUserAlt />
                  <p className="ml-1.5 text-lg font-bold text-dark dark:text-darkmode-light">
                    {phone}
                  </p>
                </Link>
              </div>
            )}
            {mail && (
              <div className="md:col-6 lg:col-6">
                <Link
                  href={`mailto:${mail}`}
                  className="my-4 flex h-[100px] items-center justify-center
               rounded border border-border p-4 text-primary dark:border-darkmode-border"
                >
                  <FaEnvelope />
                  <p className="ml-1.5 text-lg font-bold text-dark dark:text-darkmode-light">
                    {mail}
                  </p>
                </Link>
              </div>
            )}
            {location && (
              <div className="md:col-6 lg:col-6">
                <span
                  className="my-4 flex h-[100px] items-center justify-center
               rounded border border-border p-4 text-primary dark:border-darkmode-border"
                >
                  <FaMapMarkerAlt />
                  <p className="ml-1.5 text-lg font-bold text-dark dark:text-darkmode-light">
                    {location}
                  </p>
                </span>
              </div>
            )}
          </div>
        </div>
      </section>
    </Base>
  );
};

export default Contact;
