import { useState, useRef } from "react";
import { markdownify } from "@lib/utils/textConverter";
import Link from "next/link";
import { FaEnvelope, FaMapMarkerAlt, FaUserAlt } from "react-icons/fa";
import Base from "@layouts/Baseof";
import { Label, TextInput, Button, Textarea } from 'flowbite-react';

const InnerForm = () => 
  <div className="flex max-w-md flex-col gap-4 mx-auto">
    <div>
      <div className="mb-2 block">
        <Label
          htmlFor="small"
          value="Nom"
        />
      </div>
      <TextInput
        sizing="sm"
        type="text"
        name="nom"
        required
      />
    </div>
    <div>
      <div className="mb-2 block">
        <Label
          htmlFor="small"
          value="Prénom"
        />
      </div>
      <TextInput
        sizing="sm"
        type="text"
        name="prénom"
        required
      />
    </div>
    <div>
      <div className="mb-2 block">
        <Label
          htmlFor="small"
          value="Email"
        />
      </div>
      <TextInput
        sizing="sm"
        type="email"
        name="email"
        required
      />
    </div>
    <div>
      <div className="mb-2 block">
        <Label
          htmlFor="large"
          value="Votre Message"
        />
      </div>
      <Textarea
        sizing="sm"
        type="text"
        name="message"
        required
      />
    </div>
    <div class="h-captcha" data-captcha="true"></div>
    <Button type="submit" className="bg-primary">
      Envoyer mon message
    </Button>
  </div>

const ContactForm = () => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const form = useRef();

  async function handleSubmit(event) {
      event.preventDefault();
      const formData = new FormData(event.target);

      formData.append("access_key", "62e852e9-5271-4d0e-bcf1-5af0abc0b750");

      const object = Object.fromEntries(formData);
      const json = JSON.stringify(object);

      const response = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: json
      });
      const result = await response.json();
      if (result.success) {
          setShowConfirmation(true);
          form.current.reset();
      }
  }

return (
    <>
      <form ref={form} onSubmit={handleSubmit}>
        <InnerForm />
      </form>
      {showConfirmation &&
        <div className="text-center">
          <span>Votre message a bien été envoyé.</span>
        </div>
      }
    </>
  );
}

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
          <div className="row">
            <div className="col-12">
              {markdownify(
                title,
                "h1",
                "h2 mb-8 text-center"
              )}
            </div>
            <div className="col-12">
              <ContactForm />
            </div>
          
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
