import { useState } from "react";
import Base from "@layouts/Baseof";
import Link from "next/link";
import { Modal } from 'flowbite-react';
import ExportedImage from "next-image-export-optimizer";
import { IoTimeOutline, IoLocationOutline, IoCardOutline } from "react-icons/io5";

const EvenementModal = ({evenement}) => {
  const [openModal, setOpenModal] = useState(false);

  return (
    <>
      <b className="cursor-pointer text-primary underline" onClick={() => setOpenModal(true)}>En savoir +</b>
      <Modal dismissible show={openModal === true} onClose={() => setOpenModal(false)}>
        <Modal.Header className="text-center">{evenement.title}</Modal.Header>
        <Modal.Body>
          <ExportedImage sizes="50vw" quality="90" src={evenement.modal.image1} alt="" className="mb-3" />
          { evenement.modal.image2 &&
            <ExportedImage sizes="50vw" quality="90" src={evenement.modal.image2} alt="" className="mb-3" />
          }
        </Modal.Body>
        <Modal.Footer className="text-center">
          {evenement.url &&
            <Link className="btn btn-primary mx-auto" href={evenement.url} target="_blank">
              Réserver
            </Link>
          }
        </Modal.Footer>
      </Modal>
    </>
  )
}

import evt100923 from "../public/images/evt100923.jpg"
import evt170923 from "../public/images/evt170923.jpg"
import evt111123 from "../public/images/evt111123.jpg"
import evt191123 from "../public/images/evt191123.jpg"
import evt251123 from "../public/images/evt251123.jpg"
import evt280124 from "../public/images/evt280124.jpg"
import evt020324 from "../public/images/evt020324.jpg"
import evt080524 from "../public/images/evt080524.jpg"
import evt180624 from "../public/images/evt180624.jpg"
import evt220624 from "../public/images/evt220624.jpg"
import evt210124 from "../public/images/evt210124.jpg"
import evt260124 from "../public/images/evt260124.jpg"
import evt2601241 from "../public/images/evt2601241.jpeg"

import i1123_1 from "../public/images/1123_1.jpg"
import i1123_2 from "../public/images/1123_2.jpg"
import i0124_1 from "../public/images/0124_1.jpg"
import i0124_2 from "../public/images/0124_2.jpg"

export const evenements = [
  {
    d: "2023-09-10",
    title: "Fête des associations",
    date : "Dimanche 10 septembre 2023",
    image: evt100923,
    heure: "10H",
    lieu: "Gymnase Montaleau, Sucy-en-Brie",
    prix: "Gratuit",
    description: "Profitez du concert de l'Harmonie Municipale de Sucy-en-Brie et venez nous rencontrer sur notre stand."
  },
  {
    d: "2023-09-17",
    title: "Brocante de Sucy",
    date : "Dimanche 17 septembre 2023",
    image: evt170923,
    heure: "A définir",
    lieu: "Sucy-en-Brie",
    prix: "Gratuit",
    description: "L'Harmonie Municipale de Sucy-en-Brie déambulera à travers la brocante pour vous faire danser !"
  },
  {
    d: "2023-11-11",
    title: "Cérémonie du 11 novembre",
    date : "11 novembre 2023",
    image: evt111123,
    heure: "11H",
    lieu: "Parvis de l'église Saint-Martin, Sucy-en-Brie",
    prix: "Gratuit",
    description: "Commémoration de l'Armistice de 1918 et de tous les morts pour la France.",
  
  },
  {
    d: "2023-11-26",
    title: "Banquet de l'amitié",
    date : "19, 25 et 26 novembre 2023",
    image: evt191123,
    heure: "12H",
    lieu: "JMP, Sucy-en-Brie",
    prix: "Gratuit",
    description: "Profitez de ce moment convivial agrémenté d'un repas et d'un spectacle, l'Harmonie Municipale sera présente comme chaque année ! Les banquets de l’Amitié, sont organisés pour les seniors de 65 ans et plus. Evènement organisé par la Maison des Seniors de Sucy-en-Brie.",
    url: "https://www.ville-sucy.fr/agenda/banquet-de-lamitie-2023-inscriptions-en-ligne"
  },
  {
    d: "2023-11-25",
    title: "Concert Musiques Traditionnelles",
    date : "Samedi 25 novembre 2023",
    image: evt251123,
    heure: "15H",
    lieu: "La Grange, Sucy-en-Brie",
    prix: "10€",
    description: "C’est par un voyage «insensé» du soleil de mediterranée au soleil levant, en passant par l’Inde, la Chine et quelques contrées américaines où l’on aime le jazz et les big bands que l’harmonie vous convie.",
    url: "https://www.helloasso.com/associations/les-amis-de-l-harmonie/evenements/concert-musiques-traditionnelles",
    modal : {
      image1: i1123_1,
      image2: i1123_2
    }
  },
  {
    d: "2024-01-17",
    title: "Fête de la Saint-Vincent",
    date : "Dimanche 21 janvier 2024",
    image: evt210124,
    heure: "12H15",
    lieu: "Espace JMP, Sucy-en-Brie",
    prix: "Privé",
    description: "Depuis le Moyen-Age, chaque 22 janvier, vignerons, famille, voisins, amis parfois venus de loin, participent aux festivités organisées pour célébrer la Saint-Vincent.",
  },
  {
    d: "2024-01-26",
    title: "Nuit des Conservatoires",
    date : "Vendredi 26 janvier 2024",
    image: evt260124,
    heure: "17H30 - 22H",
    lieu: "Conservatoire, Sucy-en-Brie",
    prix: "Gratuit",
    description: "A partir de 17h30 venez découvrir au conservatoire les différentes pratiques musicales et artistiques ! Et dès 21H assistez à notre répétition." ,
    modal : {
      image1: evt2601241,
    }
  },
  {
    d: "2024-01-28",
    title: "Thé Dansant",
    date : "Dimanche 28 janvier 2024",
    image: evt280124,
    heure: "14H",
    lieu: "Espace JMP, Sucy-en-Brie",
    prix: "10-20€",
    description: "Nous vous proposons un rendez-vous musical haut en couleur avec 2 orchestres complémentaires dans la grande tradition de la Coupole à Paris. Plus de 4h de musique non-stop !" ,
    url: "https://www.helloasso.com/associations/les-amis-de-l-harmonie/evenements/the-dansant-2024-2",
    modal : {
      image1: i0124_1,
      image2: i0124_2
    }
  },
  {
    d: "2024-03-02",
    title: "Le concert impromptu",
    date : "Samedi 02 mars 2024",
    image: evt020324,
    heure: "20H30",
    lieu: "L'Orangerie, Sucy-en-Brie",
    prix: "7-11€",
    description: "En première partie du Concert impromptu venez découvrir la restitution du travail de l'Harmonie Municipale après une Master classe, véritable co-création autour d'une approche contemporaine qui met en relief les synergies possibles entre les différents langages artistiques..",
    url: "https://www.vostickets.net/billet?id=SUCY_EN_BRIE"
  },
  {
    d: "2024-05-08",
    title: "Commémoration du 08 mai 1945",
    date : "Mercredi 08 mai 2024",
    image: evt080524,
    heure: "11H",
    lieu: "Parvis église Saint-Martin, Sucy-en-Brie",
    prix: "Gratuit",
    description: "Mercredi 8 mai se tiendra la cérémonie du 79e anniversaire de la Victoire du 8 mai 1945."
  },
  {
    d: "2024-06-18",
    title: "Commémoration du 18 juin 1940",
    date : "Mardi 18 juin 2024",
    image: evt180624,
    heure: "19H",
    lieu: "Esplanade Château Montaleau, Sucy-en-Brie",
    prix: "Gratuit",
    description: "Alors en déplacement à Londres et refusant la défaite de la France, le Général de Gaulle prend la parole sur la radio britannique, la BBC, et lance son célèbre appel à poursuivre le combat pour une France Libre : « Quoi qu’il arrive, la flamme de la résistance ne doit pas s’éteindre et ne s’éteindra pas »"
  },
  /*{
    d: "2024-06-02",
    title: "Un dimanche en Fauré",
    date : "Dimanche 2 juin 2024",
    image: ,
    heure: "15H",
    lieu: "Espace JMP, Sucy-en-Brie",
    prix: "Gratuit",
    description: "",
  },*/
  {
    d: "2024-06-22",
    title: "Fête de la Musique",
    date : "Samedi 22 juin 2024",
    image: evt220624,
    heure: "A définir",
    lieu: "Centre culturel, Sucy-en-Brie",
    prix: "Gratuit",
    description: "C'est maintenant un incontournable, la Ferme de Grand-Val a le plaisir de vous accueillir pour la Fête de la Musique. L'Harmonie sortira pour l'occasion son répertoire festif ! Venez nombreux !"
  }
]

export const Evenement = ({evenement, button=true}) =>
  <div className="col-12 sm:col-6 lg:col-4 xl:col-3 mb-6">
    <div className="h-full flex flex-auto flex-col justify-between rounded-lg border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800">
      <div className="">
        <ExportedImage className="rounded-t-lg" sizes="50vw" src={evenement.image} alt={evenement.title} />
        <h5 className="text-xl text-center tracking-tight text-gray-900 dark:text-white pt-6 pb-1 py-3">
          {evenement.title}
        </h5>
        <div className="text-center text-xs text-primary">
          <IoLocationOutline size="1em" className="inline mb-1 mr-1" />
          {evenement.lieu}
        </div>
        <p className="font-normal text-center text-sm text-gray-700 dark:text-gray-400 pt-4 px-6">
          {evenement.description}
        </p>
        {typeof evenement.modal !== "undefined" &&
          <p className="font-normal text-center text-sm text-gray-700 dark:text-gray-400 mt-3">
            <EvenementModal evenement={evenement} />
          </p>
        }
      </div>
      <div>
        <div className="relative my-4">
          <div className="border-b-2 mt-3 absolute w-full"></div>
          <div className="text-center text-primary font-bold text-md relative bg-white dark:bg-gray-800 w-fit mx-auto px-1">
            {evenement.date}
          </div>
          <div className="row px-12 pt-3 text-xs">
            <div className="col-6 text-center">
              <IoTimeOutline size="2em" className="mx-auto" />
              {evenement.heure}
            </div>
            <div className="col-6 text-center">
              <IoCardOutline size="2em" className="mx-auto" />
              {evenement.prix}
            </div>
          </div>
        </div>
        {evenement.url && button ?
          <Link className="btn btn-primary w-full rounded-b-lg rounded-t-none before:rounded-b-lg before:rounded-t-none text-center overflow-visible" href={evenement.url} target="_blank">
            Réserver
          </Link> :
          <div className="h-[3rem]"></div>
        }
      </div>
    </div>
  </div>

const Evenements = () =>
  <Base title={`Évènements`}>
    <div className="section">
      <div className="container">
        <h1 className="h2 mb-8 text-center">
          Évènements à venir
        </h1>
        <div className="row">
          {evenements.map((evenement) =>
            <Evenement key={evenement.title} evenement={evenement} />
          )}
        </div>
      </div>
    </div>
  </Base>

export default Evenements;
