import Base from "../components/Layout";
import Layout from "../components/Layout";
import { useEffect, useState } from "react";
import { Textarea } from "@layouts/components/ui/textarea";
// @ts-nocheck

import { Input } from "@layouts/components/ui/input";
import { Label } from "@layouts/components/ui/label";
import Script from "next/script";

const capitalizeFirstLetter = (string: string): string => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// const url = "https://amis-harmonie-sucy.fr/api";
const url =
  "https://script.google.com/macros/s/AKfycbxgiXg25rWkddkGXqSgIIbvUzdv9ePKX_3lHKh4NeJNy7NG8xD0HZ7wZNj9WZfXUuI/exec";

const LivreDorForm = ({ callback }) => {
  const [disabled, setDisabled] = useState(false);
  const [thankYou, setThankYou] = useState(false);
  const [addComment, setAddComment] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    // @ts-ignore
    const data = new URLSearchParams(new FormData(e.target));
    setDisabled(true);

    (window as any).grecaptcha.ready(() => {
      (window as any).grecaptcha
        .execute("6LfS9nEpAAAAAD_Ri6UvCBhiNl8ioNLpw7YUf6O2", {
          action: "submit",
        })
        .then(async (token) => {
          data.append("token", token);
          const ret = await fetch(url, {
            method: "POST",
            body: data,
          });

          callback(ret);
          e.target.reset();
          setThankYou(true);
        });
    });
  };

  if (!addComment) {
    return (
      <button
        className="btn btn-primary max-w-2xl m-auto"
        onClick={() => setAddComment(true)}
      >
        Ajouter un commentaire au livre {`d'or`}
      </button>
    );
  } else if (thankYou) {
    return (
      <div className="text-center text-primary font-bold">
        Merci pour votre commentaire !
      </div>
    );
  } else {
    return (
      <>
        <Script src="https://www.google.com/recaptcha/api.js?render=6LfS9nEpAAAAAD_Ri6UvCBhiNl8ioNLpw7YUf6O2" />
        <form
          className="flex w-full max-w-2xl m-auto flex-col gap-4"
          onSubmit={submit}
        >
          <div className="grid grid-flow-col justify-stretch space-x-4">
            <div>
              <Label htmlFor="email">Votre email</Label>
              <Input
                id="email"
                disabled={disabled}
                name="email"
                type="email"
                required
              />
              <p className="text-sm text-muted-foreground">
                Votre email ne sera pas publié.
              </p>
            </div>
            <div>
              <Label htmlFor="lname">Votre nom</Label>
              <Input
                id="lname"
                disabled={disabled}
                name="lname"
                type="text"
                required
              />
            </div>
            <div>
              <Label htmlFor="fname">Votre prénom</Label>
              <Input
                id="fname"
                disabled={disabled}
                name="fname"
                type="text"
                required
              />
            </div>
          </div>
          <div>
            <Textarea
              disabled={disabled}
              rows={5}
              name="comment"
              className="bg-white"
              id="comment"
              placeholder="Votre commentaire..."
              required
            />
          </div>
          <button disabled={disabled} className="btn btn-primary" type="submit">
            Envoyer mon commentaire
          </button>
        </form>
      </>
    );
  }
};

const LivreDorComments = ({ update }) => {
  const [comments, setComments] = useState([]);

  useEffect(() => {
    (async () => {
      const data = await fetch(url).then((res) => res.json());
      setComments(data);
    })();
  }, [update]);

  if (comments.length === 0) {
    return (
      <div className="max-w-2xl m-auto">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  } else {
    return (
      <div className="max-w-2xl m-auto space-y-4">
        {comments
          .sort((a, b) => {
            return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
          })
          .map((comment, i) => (
            <div key={i} className="flex">
              <div className="w-4 h-4 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <div>
                <div className="text-sm text-muted-foreground">
                  {capitalizeFirstLetter(
                    new Date(comment.date).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }),
                  )}
                </div>
                <div className="text-primary font-medium">
                  {capitalizeFirstLetter(comment.fname)}{" "}
                  {capitalizeFirstLetter(comment.lname)}
                </div>
                <div>
                  {comment.comment.split("\n").map((str, i) => (
                    <p key={i}>{str}</p>
                  ))}
                </div>
              </div>
            </div>
          ))}
      </div>
    );
  }
};

const Page = () => {
  const [newRow, setNewRow] = useState(false);

  return (
    <Layout
      title="Livre d'Or - Les Amis de l'Harmonie de Sucy-en-Brie"
      description="Laissez votre commentaire dans notre livre d'or et partagez vos impressions sur les événements musicaux de l'Harmonie Municipale de Sucy-en-Brie. Découvrez les témoignages de notre communauté passionnée par la musique classique et populaire. Votre avis compte pour nous aider à améliorer nos concerts, thé dansant et autres manifestations culturelles à Sucy-en-Brie."
    >
      <div className="py-16">
        <div className="mx-auto max-w-[1320px]">
          <div className="flex flex-col gap-8 px-4">
            <h1 className="font-secondary font-bold leading-tight text-black text-h1-sm md:text-h1 text-center">
              Livre d&apos;Or
            </h1>
            <LivreDorForm callback={setNewRow} />
            <LivreDorComments update={newRow} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Page;
