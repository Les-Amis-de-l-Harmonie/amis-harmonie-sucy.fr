import { useState } from "react";
import Base from "@layouts/Baseof";
import Link from "next/link";
import { Button, Modal } from 'flowbite-react';
import Image from 'next/image';

const EvenementModal = ({evenement}) => {
  const [openModal, setOpenModal] = useState(false);

  return (
    <>
      <b className="cursor-pointer text-primary underline" onClick={() => setOpenModal(true)}>En savoir +</b>
      <Modal dismissible show={openModal === true} onClose={() => setOpenModal(false)}>
        <Modal.Header className="text-center">{evenement.title}</Modal.Header>
        <Modal.Body>
          <img src={evenement.modal.image1} className="mb-3"/>
          <img src={evenement.modal.image2} />
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

export const evenements = [
  {
    title: "Fête des associations",
    date : "Dimanche 10 septembre 2023",
    image: "images/evt100923.png",
    description: "Profitez du concert de l'Harmonie Municipale de Sucy-en-Brie et venez nous rencontrer sur notre stand."
  },
  {
    title: "Brocante de Sucy", 
    date : "Dimanche 17 septembre 2023", 
    image: "images/evt170923.png", 
    description: "L'Harmonie Municipale de Sucy-en-Brie déambulera à travers la brocante pour vous faire danser !"
  },
  {
    title: "Concert Musiques Traditionnelles", 
    date : "Samedi 25 novembre 2023 15h", 
    image: "images/evt251123.png", 
    description: "C’est par un voyage «insensé» du soleil de mediterranée au soleil levant, en passant par l’Inde, la Chine et quelques contrées américaines où l’on aime le jazz et les big bands que l’harmonie vous convie.",
    url: "https://www.helloasso.com/associations/les-amis-de-l-harmonie/evenements/concert-du-25-novembre",
    modal : {
      image1: "images/1123_1.jpg",
      image2: "images/1123_2.jpg"
    }
  },
  {
    title: "Thé Dansant", 
    date : "Dimanche 28 janvier 2024 14h",
    image: "images/evt280124.png", 
    description: "Nous vous proposons un rendez-vous musical haut en couleur avec 2 orchestres complémentaires dans la grande tradition de la Coupole à Paris. Plus de 4h de musique non-stop !" , 
    url: "https://www.helloasso.com/associations/les-amis-de-l-harmonie/evenements/the-dansant-2024-1",
    modal : {
      image1: "images/0124_1.jpg",
      image2: "images/0124_2.jpg"
    }
  },
  {
    title: "Le concert impromptu", 
    date : "Samedi 02 mars 2024 20h30", 
    image: "images/evt020324.png", 
    description: "En première partie du Concert impromptu venez découvrir la restitution du travail de l'Harmonie Municipale après une Master classe, véritable co-création autour d'une approche contemporaine qui met en relief les synergies possibles entre les différents langages artistiques..",
    url: "https://www.vostickets.net/billet?id=SUCY_EN_BRIE#"
  },
  {
    title: "Commémoration du 08 mai 1945", 
    date : "Mercredi 08 mai 2024", 
    image: "images/evt080524.png", 
    description: "Mercredi 8 mai se tiendra la cérémonie du 79e anniversaire de la Victoire du 8 mai 1945."
  },
  {
    title: "Commémoration du 18 juin 1940", 
    date : "Mardi 18 juin 2024", 
    image: "images/evt180624.png", 
    description: "Alors en déplacement à Londres et refusant la défaite de la France, le Général de Gaulle prend la parole sur la radio britannique, la BBC, et lance son célèbre appel à poursuivre le combat pour une France Libre : « Quoi qu’il arrive, la flamme de la résistance ne doit pas s’éteindre et ne s’éteindra pas »"
  },
  {
    title: "Fête de la Musique", 
    date : "Samedi 22 juin 2024", 
    image: "images/evt220624.png", 
    description: "C'est maintenant un incontournable, la Ferme de Grand-Val a le plaisir de vous accueillir pour la Fête de la Musique. L'Harmonie sortira pour l'occasion son répertoire festif ! Venez nombreux !"
  }
]

export const Evenement = ({evenement}) =>
  <div className="col-12 mb-5 px-2 sm:col-6 lg:col-4 xl:col-3 flex text-center">
    <div className="pb-5 bg-white h-full flex flex-auto flex-col justify-between border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
      <div className="">
        <img className="rounded-t-lg" src={evenement.image} alt="" />
        <div className="p-5">
          <h5 className="mb-2 text-2xl font-bold tracking-tight text-primary">{evenement.title}</h5>
          <p className="mb-3 font-bold">{evenement.date}</p>
          <p className="mb-3 font-normal">{evenement.description}</p>
        </div>
      </div>
      <div className="">
        {evenement.modal &&
          <div className="pb-3">
            <EvenementModal evenement={evenement} />
          </div>
        }
        {evenement.url &&
          <Link className="btn btn-primary" href={evenement.url} target="_blank">
            Réserver
          </Link>
        }
      </div>
    </div>
  </div>

const Evenements = () => 
  <Base title={`Évènements`}>
    <div className="section">
      <div className="container">
        <h1 className="h2 mb-8 text-center">
          Évènements
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
