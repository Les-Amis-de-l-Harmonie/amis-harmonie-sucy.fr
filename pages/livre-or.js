import Base from "../components/Layout";
import Layout from "../components/Layout";
import { useEffect, useState } from "react";
import { Textarea, FloatingLabel, Spinner, Timeline } from "flowbite-react";
import Script from "next/script";

const capitalizeFirstLetter = (string) => {
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
    const data = new URLSearchParams(new FormData(e.target));
    setDisabled(true);

    grecaptcha.ready(() => {
      grecaptcha
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
            <FloatingLabel
              disabled={disabled}
              name="email"
              variant="outlined"
              required
              label="Votre email"
              type="email"
              helperText="Votre email ne sera pas publié."
            />
            <FloatingLabel
              disabled={disabled}
              name="lname"
              variant="outlined"
              required
              label="Votre nom"
            />
            <FloatingLabel
              disabled={disabled}
              name="fname"
              variant="outlined"
              required
              label="Votre prénom"
            />
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
        <Spinner />
      </div>
    );
  } else {
    return (
      <Timeline className="max-w-2xl m-auto">
        {comments
          .sort((a, b) => {
            return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
          })
          .map((comment, i) => (
            <Timeline.Item key={i}>
              <Timeline.Point />
              <Timeline.Content>
                <Timeline.Time>
                  {capitalizeFirstLetter(
                    new Date(comment.date).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }),
                  )}
                </Timeline.Time>
                <Timeline.Title className="text-primary font-medium">
                  {capitalizeFirstLetter(comment.fname)}{" "}
                  {capitalizeFirstLetter(comment.lname)}
                </Timeline.Title>
                <Timeline.Body>
                  {comment.comment.split("\n").map((str, i) => (
                    <p key={i}>{str}</p>
                  ))}
                </Timeline.Body>
              </Timeline.Content>
            </Timeline.Item>
          ))}
      </Timeline>
    );
  }
};

const Page = () => {
  const [newRow, setNewRow] = useState(false);

  return (
    <Layout title={`Livre d'Or`}>
      <div className="section">
        <div className="container">
          <div className="flex flex-col gap-8">
            <h1 className="text-center">Livre d&apos;Or</h1>
            <LivreDorForm callback={setNewRow} />
            <LivreDorComments update={newRow} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Page;
