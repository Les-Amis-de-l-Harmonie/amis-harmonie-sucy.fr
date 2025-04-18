import { useState } from "react";
import Base from "@layouts/Baseof";
import Link from "next/link";
import { Modal } from "flowbite-react";
import ExportedImage from "next-image-export-optimizer";
import {
  IoTimeOutline,
  IoLocationOutline,
  IoCardOutline,
} from "react-icons/io5";

const EvenementModal = ({ evenement }) => {
  const [openModal, setOpenModal] = useState(false);

  return (
    <>
      <b
        className="cursor-pointer text-primary underline"
        onClick={() => setOpenModal(true)}
      >
        En savoir +
      </b>
      <Modal
        dismissible
        show={openModal === true}
        onClose={() => setOpenModal(false)}
      >
        <Modal.Header className="text-center">{evenement.title}</Modal.Header>
        <Modal.Body>
          <ExportedImage
            sizes="50vw"
            quality="90"
            src={evenement.modal.image1}
            alt=""
            className="mb-3"
          />
          {evenement.modal.image2 && (
            <ExportedImage
              sizes="50vw"
              quality="90"
              src={evenement.modal.image2}
              alt=""
              className="mb-3"
            />
          )}
        </Modal.Body>
        <Modal.Footer className="text-center">
          {evenement.url && (
            <Link
              className="btn btn-primary mx-auto"
              href={evenement.url}
              target="_blank"
            >
              Réserver
            </Link>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
};

import evt100923 from "../public/images/evt100923.jpg";
import evt170923 from "../public/images/evt170923.jpg";
import evt111123 from "../public/images/evt111123.jpg";
import evt191123 from "../public/images/evt191123.jpg";
import evt251123 from "../public/images/evt251123.jpg";
import evt280124 from "../public/images/evt280124.jpg";
import evt020324 from "../public/images/evt020324.jpg";
import evt080524 from "../public/images/evt080524.jpg";
import evt180624 from "../public/images/evt180624.jpg";
import evt220624 from "../public/images/evt220624.jpg";
import evt210124 from "../public/images/evt210124.jpg";
import evt260124 from "../public/images/evt260124.jpg";
import evt2601241 from "../public/images/evt2601241.jpeg";
import evt190324 from "../public/images/evt190324.jpg";
import evt230324 from "../public/images/evt230324.jpg";
import evt2303241 from "../public/images/evt2303241.jpg";
import evt070424 from "../public/images/evt070424.jpg";
import evt240424 from "../public/images/evt240424.jpg";
import evt010524 from "../public/images/evt010524.jpg";
import evt020624 from "../public/images/evt020624.jpg";
import evtblanc from "../public/images/evtblanc.jpg";
import evt290624 from "../public/images/evt290624.jpg";
import evt060724 from "../public/images/evt060724.jpg";
import evt150624 from "../public/images/evt150624.jpg";
import evt090624 from "../public/images/evt090624.png";
import museemusique from "../public/images/museemusique.jpg";
import evt091124 from "../public/images/evt091124.jpg";
import evt080924 from "../public/images/evt080924.png";
import evt260125 from "../public/images/evt260125.png";
import evt270824 from "../public/images/evt270824.png";
import evt260316 from "../public/images/evt260316.png";
import ennio from "../public/images/ennio.png";
import i1123_1 from "../public/images/1123_1.jpg";
import i1123_2 from "../public/images/1123_2.jpg";
import i0124_1 from "../public/images/0124_1.jpg";
import rencontreharmonies1 from "../public/images/rencontreharmonies1.png";
import rencontreharmonies2 from "../public/images/rencontreharmonies2.png";
import i0124_2 from "../public/images/0124_2.jpg";
import thedansant20251 from "../public/images/thedansant20251.png";
import thedansant20252 from "../public/images/thedansant20252.png";
import evt211224 from "../public/images/evt211224.png";
import evt290325 from "../public/images/evt290325.png";
import evt2903252 from "../public/images/evt2903252.png";
import evt110425 from "../public/images/evt110425.png";
import evt2809251 from "../public/images/evt2809251.jpg";
import evt280925 from "../public/images/evt280925.png";
import evt150625 from "../public/images/evt150625.png";
import evt280625 from "../public/images/evt280625.png";
import evt280625 from "../public/images/evt280625.png";



export const evenements = [
  {
    d: "2023-09-10",
    title: "Fête des associations",
    date: "Dimanche 10 septembre 2023",
    image: evt100923,
    heure: "10H",
    lieu: "Gymnase Montaleau, Sucy-en-Brie",
    prix: "Gratuit",
    description:
      "Profitez du concert de l'Harmonie Municipale de Sucy-en-Brie et venez nous rencontrer sur notre stand.",
  },
  {
    d: "2023-09-17",
    title: "Brocante de Sucy",
    date: "Dimanche 17 septembre 2023",
    image: evt170923,
    heure: "A définir",
    lieu: "Sucy-en-Brie",
    prix: "Gratuit",
    description:
      "L'Harmonie Municipale de Sucy-en-Brie déambulera à travers la brocante pour vous faire danser !",
  },
  {
    d: "2023-11-11",
    title: "Cérémonie du 11 novembre",
    date: "11 novembre 2023",
    image: evt111123,
    heure: "11H",
    lieu: "Parvis de l'église Saint-Martin, Sucy-en-Brie",
    prix: "Gratuit",
    description:
      "Commémoration de l'Armistice de 1918 et de tous les morts pour la France.",
  },
  {
    d: "2023-11-26",
    title: "Banquet de l'amitié",
    date: "19, 25 et 26 novembre 2023",
    image: evt191123,
    heure: "12H",
    lieu: "JMP, Sucy-en-Brie",
    prix: "Gratuit",
    description:
      "Profitez de ce moment convivial agrémenté d'un repas et d'un spectacle, l'Harmonie Municipale sera présente comme chaque année ! Les banquets de l’Amitié, sont organisés pour les seniors de 65 ans et plus. Evènement organisé par la Maison des Seniors de Sucy-en-Brie.",
    url: "https://www.ville-sucy.fr/agenda/banquet-de-lamitie-2023-inscriptions-en-ligne",
  },
  {
    d: "2023-11-25",
    title: "Concert Musiques Traditionnelles",
    date: "Samedi 25 novembre 2023",
    image: evt251123,
    heure: "15H",
    lieu: "La Grange, Sucy-en-Brie",
    prix: "10€",
    description:
      "C’est par un voyage «insensé» du soleil de mediterranée au soleil levant, en passant par l’Inde, la Chine et quelques contrées américaines où l’on aime le jazz et les big bands que l’harmonie vous convie.",
    url: "https://www.helloasso.com/associations/les-amis-de-l-harmonie/evenements/concert-musiques-traditionnelles",
    modal: {
      image1: i1123_1,
      image2: i1123_2,
    },
  },
  {
    d: "2024-01-17",
    title: "Fête de la Saint-Vincent",
    date: "Dimanche 21 janvier 2024",
    image: evt210124,
    heure: "12H15",
    lieu: "Espace JMP, Sucy-en-Brie",
    prix: "Privé",
    description:
      "Depuis le Moyen-Age, chaque 22 janvier, vignerons, famille, voisins, amis parfois venus de loin, participent aux festivités organisées pour célébrer la Saint-Vincent.",
  },
  {
    d: "2024-01-26",
    title: "Nuit des Conservatoires",
    date: "Vendredi 26 janvier 2024",
    image: evt260124,
    heure: "17H30 - 22H",
    lieu: "Conservatoire, Sucy-en-Brie",
    prix: "Gratuit",
    description:
      "A partir de 17h30 venez découvrir au conservatoire les différentes pratiques musicales et artistiques ! Et dès 21H assistez à notre répétition.",
    modal: {
      image1: evt2601241,
    },
  },
  {
    d: "2024-01-28",
    title: "Thé Dansant",
    date: "Dimanche 28 janvier 2024",
    image: evt280124,
    heure: "14H",
    lieu: "Espace JMP, Sucy-en-Brie",
    prix: "10-20€",
    description:
      "Nous vous proposons un rendez-vous musical haut en couleur avec 2 orchestres complémentaires dans la grande tradition de la Coupole à Paris. Plus de 4h de musique non-stop !",
    url: "https://www.helloasso.com/associations/les-amis-de-l-harmonie/evenements/the-dansant-2024-2",
    modal: {
      image1: i0124_1,
      image2: i0124_2,
    },
  },
  {
    d: "2024-03-02",
    title: "Le concert impromptu",
    date: "Samedi 02 mars 2024",
    image: evt020324,
    heure: "20H30",
    lieu: "L'Orangerie, Sucy-en-Brie",
    prix: "7-11€",
    description:
      "En première partie du Concert impromptu venez découvrir la restitution du travail de l'Harmonie Municipale après une Master classe, véritable co-création autour d'une approche contemporaine qui met en relief les synergies possibles entre les différents langages artistiques..",
    url: "https://www.vostickets.net/billet?id=SUCY_EN_BRIE",
  },
  {
    d: "2024-03-19",
    title: "Cérémonie des accords d'évian",
    date: "Mardi 19 mars 2024",
    image: evt190324,
    heure: "A définir",
    lieu: "Sucy-en-Brie",
    prix: "Gratuit",
    description:
      "La journée nationale du souvenir et de recueillement à la mémoire des victimes civiles et militaires de la guerre d’Algérie et des combats en Tunisie et au Maroc a lieu le 19 mars.",
    url: "",
  },
  {
    d: "2024-03-23",
    title: "Concert au Rond d'or",
    date: "Samedi 23 mars 2024",
    image: evt230324,
    heure: "A définir",
    lieu: "Rond d'or, Sucy-en-Brie",
    prix: "Gratuit",
    description:
      "Déambulation musicale au Rond d'or de la Cité Verte de Sucy-en-Brie. Rejoignez-nous pour un moment festif !",
    url: "",
  },
  {
    d: "2024-03-23",
    title: "Concert à la Résidence de la Cité Verte",
    date: "Samedi 23 mars 2024",
    image: evt2303241,
    heure: "A définir",
    lieu: "Maison de retraite de la Cité Verte, Sucy-en-Brie",
    prix: "Gratuit",
    description:
      "C'est aussi cela la mission de l'Harmonie Municipale, faire plaisir à tous les publics !",
    url: "",
  },
  // {
  //   d: "2024-04-07",
  //   title: "Concert Club de rugby Sucy",
  //   date : "Dimanche 7 avril 2024",
  //   image: evt070424,
  //   heure: "A définir",
  //   lieu: "Stade de rugby, Sucy-en-Brie",
  //   prix: "Gratuit",
  //   description: "Nous serons auprès du club de rugby de Sucy-en-Brie afin de les soutenir en musique !",
  //   url: ""
  // },
  {
    d: "2024-04-24",
    title: "Cérémonie de la déportation",
    date: "Dimanche 28 avril 2024",
    image: evt240424,
    heure: "12H",
    lieu: "Place de l’Église, Sucy-en-Brie",
    prix: "Gratuit",
    description:
      "Le dernier dimanche d'avril est chaque année dédié à la célébration de la mémoire des victimes de la déportation dans les camps de concentration et d'extermination nazis lors la seconde guerre mondiale.",
    url: "",
  },
  {
    d: "2024-05-01",
    title: "Concert ouverture des Sister Cities Games",
    date: "Mercredi 1er mai 2024",
    image: evt010524,
    heure: "17H",
    lieu: "Stade C.Arron, Sucy-en-brie",
    prix: "Gratuit",
    description:
      "Sur la vague des JO Paris 2024, la Ville de Sucy-en-Brie organise les Sister Cities Games. Une rencontre sportive internationale entre les jeunes de Sucy et ceux de ses villes jumelles et villes amies autour de 4 sports olympiques.",
    url: "",
  },
  {
    d: "2024-05-05",
    title: "Concert fermeture des Sister Cities Games",
    date: "Dimanche 5 mai 2024",
    image: evt010524,
    heure: "17H",
    lieu: "Stade C.Arron, Sucy-en-brie",
    prix: "Gratuit",
    description:
      "Sur la vague des JO Paris 2024, la Ville de Sucy-en-Brie organise les Sister Cities Games. Une rencontre sportive internationale entre les jeunes de Sucy et ceux de ses villes jumelles et villes amies autour de 4 sports olympiques.",
    url: "",
  },
  {
    d: "2024-05-08",
    title: "Commémoration du 8 mai 1945",
    date: "Mercredi 8 mai 2024",
    image: evt080524,
    heure: "11H",
    lieu: "Parvis église Saint-Martin, Sucy-en-Brie",
    prix: "Gratuit",
    description:
      "Mercredi 8 mai se tiendra la cérémonie du 79e anniversaire de la Victoire du 8 mai 1945.",
  },
  {
    d: "2024-06-02",
    title: "Un dimanche en Fauré",
    date: "Dimanche 2 juin 2024",
    image: evt020624,
    heure: "15H",
    lieu: "Espace JMP, Sucy-en-Brie",
    prix: "Gratuit",
    description:
      " Une journée pour célébrer la musique française de Gabriel Fauré aux couleurs subtiles et fascinantes, empreinte de poésie et de spiritualité. ",
  },
  {
    d: "2024-06-09",
    title: "Les trésors insolites du Musée",
    date: "Dimanche 9 juin 2024",
    image: evt090624,
    heure: "13H",
    lieu: "Musée de la Musique, Philarmonie de Paris",
    prix: "10€",
    description:
      " Nous vous proposons une sortie au Musée de la Musique (Philarmonie de Paris). Durant la visite (environ 1h30), un conférencier-musicologue vous guidera parmi une sélection de ses chefs-d’œuvre favoris. Il vous fera (re)découvrir les détails insolites d’instruments connus ou moins connus et vous révèlera leurs savoureux secrets. ",
    url: "https://www.helloasso.com/associations/les-amis-de-l-harmonie/evenements/musee-de-la-musique-09-juin-2024",
    modal: {
      image1: museemusique,
    },
  },
  {
    d: "2024-06-15",
    title: "Concert sport et musique",
    date: "Dimanche 16 juin 2024",
    image: evt150624,
    heure: "14H30",
    lieu: "Parc Omnisport, Sucy-en-Brie",
    prix: "Gratuit",
    description:
      'Animation musicale dans le cadre de la manifestation "Je cours pour la culture" ',
    url: "",
  },
  {
    d: "2024-06-18",
    title: "Commémoration du 18 juin 1940",
    date: "Mardi 18 juin 2024",
    image: evt180624,
    heure: "19H",
    lieu: "Esplanade Château Montaleau, Sucy-en-Brie",
    prix: "Gratuit",
    description:
      "Alors en déplacement à Londres et refusant la défaite de la France, le Général de Gaulle prend la parole sur la radio britannique, la BBC, et lance son célèbre appel à poursuivre le combat pour une France Libre : « Quoi qu’il arrive, la flamme de la résistance ne doit pas s’éteindre et ne s’éteindra pas »",
  },
  {
    d: "2024-06-22",
    title: "Fête de la Musique",
    date: "Samedi 22 juin 2024",
    image: evt220624,
    heure: "19h30",
    lieu: "Centre culturel, Sucy-en-Brie",
    prix: "Gratuit",
    description:
      "C'est maintenant un incontournable, la Ferme de Grand-Val a le plaisir de vous accueillir pour la Fête de la Musique. L'Harmonie sortira pour l'occasion son répertoire festif ! Venez nombreux !",
  },
  {
    d: "2024-08-27",
    title: "Passage de la flamme Paralympique",
    date: "Mardi 27 août 2024",
    image: evt270824,
    heure: "9H",
    lieu: "Château de Sucy-en-Brie",
    prix: "Gratuit",
    description:
      "Du 25 au 28 août, la Flamme Paralympique, portée par près de 1000 éclaireurs, traversera une cinquantaine de villes dont deux dans le Val-de-Marne : Sucy et Valenton. Juste avant de finir son aventure à Paris pour la cérémonie d’ouverture des premiers jeux paralympiques d’été en France, le 28 août.",
  },
  {
    d: "2024-09-08",
    title: "Fête des associations",
    date: "Dimanche 08 septembre 2024",
    image: evt080924,
    heure: "09H",
    lieu: "Gymnase Montaleau, Sucy-en-Brie",
    prix: "Gratuit",
    description:
      "Profitez du concert de l'Harmonie Municipale de Sucy-en-Brie et venez nous rencontrer sur notre stand.",
  },
  {
    d: "2024-09-15",
    title: "Brocante de Sucy",
    date: "Dimanche 15 septembre 2024",
    image: evt170923,
    heure: "10H",
    lieu: "Centre ville, Sucy-en-Brie",
    prix: "Gratuit",
    description:
      "Un incontournable de notre rentrée : la brocante de Sucy-en-Brie ! Nous déambulerons dans les allées du Centre Ville, sur des rythmes festifs !",
  },

  {
    d: "2024-11-09",
    title: "Concert Rencontre d'Harmonies",
    date: "Samedi 09 novembre 2024",
    image: evt091124,
    heure: "14H",
    lieu: "Espace JMP, Sucy-en-Brie",
    prix: "Gratuit",
    description:
      "Les  Amis de l'Harmonie en partenariat avec la Confédération Musicale de France (94) et la Ville de Sucy-en-Brie vous proposent une journée musicale dédiée aux orchestres d'harmonie. Pour l'occasion l'Harmonie Municipale de Sucy-en-Brie qui fêtera en 2027 ses 160 ans, accueillent l'Espérance Brévannaise et l'Harmonie du Conservatoire de Neuilly-sur-Marne. Au programme, 3 heures de musique et un final regroupant les 100 musiciens sur scène. ",
    url: "",
    modal: {
      image1: rencontreharmonies1,
      image2: rencontreharmonies2,
    },
  },
  {
    d: "2024-11-11",
    title: "Cérémonie du 11 novembre",
    date: "Lundi 11 novembre 2023",
    image: evt111123,
    heure: "11H",
    lieu: "Parvis de l'église Saint-Martin, Sucy-en-Brie",
    prix: "Gratuit",
    description:
      "Commémoration de l'Armistice de 1918 et de tous les morts pour la France.",
  },
  {
    d: "2024-12-01",
    title: "Banquet de l'amitié",
    date: "24-30 novembre et 01 décembre",
    image: evt191123,
    heure: "11H30",
    lieu: "Espace JMP",
    prix: "Gratuit",
    description:
      "Profitez de ce moment convivial agrémenté d'un repas et d'un spectacle, l'Harmonie Municipale sera présente comme chaque année ! Les banquets de l’Amitié, sont organisés pour les seniors de 65 ans et plus. Evènement organisé par la Maison des Seniors de Sucy-en-Brie.",
    url: "https://www.ville-sucy.fr/banquet2024",
  },
  {
    d: "2024-12-21",
    title: "Cinéma 'En Fanfare'",
    date: "Samedi 21 décembre",
    image: evt211224,
    heure: "21H",
    lieu: "Cinéma, Sucy-en-Brie",
    prix: "2€",
    description:
      "Thibaut est un chef d’orchestre de renommée internationale qui parcourt le monde. Lorsqu’il apprend qu’il a été adopté, il découvre l’existence d’un frère, Jimmy, employé de cantine scolaire et qui joue du trombone dans une fanfare du nord de la France. En apparence tout les sépare, sauf l’amour de la musique. ",
  },
  {
    d: "2025-01-26",
    title: "Thé Dansant 2025",
    date: "Dimanche 26 janvier 2025",
    image: evt260125,
    heure: "14H",
    lieu: "Espace JMP, Sucy-en-Brie",
    prix: "15-25€",
    description:
      "Organisé en partenariat avec la ville de Sucy-en-Brie pour un moment dansant et festif avec toujours 2 orchestres aux styles différents et complémentaires pour mieux vous ravir. Au programme, l’Harmonie et ses 30 musiciens ainsi que le Picotango Orquesta, spécialisé dans le tango argentin.",
    url: "https://www.helloasso.com/associations/les-amis-de-l-harmonie/evenements/the-dansant-2025-sucy",
    modal: {
      image1: thedansant20251,
      image2: thedansant20252,
    },
  },
  {
    d: "2025-02-09",
    title: "Fête de la Saint-Vincent",
    date: "Dimanche 09 février 2025",
    image: evt210124,
    heure: "12H15",
    lieu: "Espace JMP, Sucy-en-Brie",
    prix: "Privé",
    description:
      "Depuis le Moyen-Age, chaque 22 janvier, vignerons, famille, voisins, amis parfois venus de loin, participent aux festivités organisées pour célébrer la Saint-Vincent.",
  },
  {
    d: "2025-03-16",
    title: "Sortie 'Ennio Morricone et le cinéma Italien'",
    date: "Dimanche 16 mars 2025",
    image: evt260316,
    heure: "16H",
    lieu: "La Seine Musicale, Boulogne",
    prix: "30€",
    description:
      "Nous vous proposons d'aller ensemble à la Seine Musicale pour un concert fantastique autour d'Ennio Morricone et du cinéma Italien. 'Il était une fois dans l’Ouest', 'Le Bon, la Brute et le Truand' , 'Pour une poignée de dollars', 'Le Parrain', 'Le Clan des Siciliens'... Inscription en ligne jusqu’au 27 septembre. Réservé aux adhérents 2024-2025. Plus d'infos ci-dessous. ",
    modal: {
      image1: ennio,
    },
  },
  {
    d: "2025-03-29",
    title: "Carnaval",
    date: "Samedi 29 mars 2024",
    image: evt290325,
    heure: "15h",
    lieu: "Parvis de l'école de la Cité Verte, Sucy-en-Brie",
    prix: "Gratuit",
    description:
      "Déambulation musicale, avec la Batucada de l'Harmonie Municipale + concert de l'orchestre. Rejoignez-nous pour un moment festif !",
    url: "",
  },
  {
    d: "2025-03-29",
    title: "Concert Résidence de la Cité Verte",
    date: "Samedi 29 mars 2024",
    image: evt2903252,
    heure: "16h",
    lieu: "Résidence de la Cité Verte, Sucy-en-Brie",
    prix: "Gratuit",
    description:
      "Comme chaque année nous viendrons animer le goûter de nos ainés, avec un petit concert festif.",
    url: "",
  },
  {
    d: "2025-04-06",
    title: "Concert Club de rugby Sucy",
    date : "Dimanche 6 avril 2025",
    image: evt070424,
    heure: "A définir",
    lieu: "Stade de rugby, Sucy-en-Brie",
    prix: "Gratuit",
    description: "Nous serons auprès du club de rugby de Sucy-en-Brie afin de les soutenir en musique !",
    url: ""
  },
  {
    d: "2025-04-11",
    title: "Répétition ouverte",
    date : "Vendredi 11 avril 2025",
    image: evt110425,
    heure: "20h",
    lieu: "Conservatoire, Sucy-en-Brie",
    prix: "Gratuit",
    description: "🎶 Plongez dans les coulisses de la musique ! 🎶 L’Harmonie Municipale de Sucy-en-Brie vous ouvre les portes de sa répétition ! Venez vivre un moment unique et découvrir comment se prépare un concert, dans une ambiance conviviale et passionnée.",
    url: ""
  },
  {
    d: "2025-05-08",
    title: "Commémoration du 8 mai 1945",
    date: "Jeudi 8 mai 2025",
    image: evt080524,
    heure: "11H",
    lieu: "Parvis église Saint-Martin, Sucy-en-Brie",
    prix: "Gratuit",
    description:
      "Mercredi 8 mai se tiendra la cérémonie du 80e anniversaire de la Victoire du 8 mai 1945.",
  },
  {
    d: "2025-06-15",
    title: "Bal traditionnel",
    date: "Dimanche 15 juin 2025",
    image: evt150625,
    heure: "15h30",
    lieu: "Gloriette, Parc des Sports, Sucy-en-Brie",
    prix: "Gratuit",
    description:
      "Venez danser ! 3 orchestres rien que pour vous, dont l'Harmonie Municipale de Sucy-en-Brie, dans un joli cadre verdoyant !",
  },
  {
    d: "2025-06-18",
    title: "Commémoration du 18 juin 1940",
    date: "Mercredi 18 juin 2025",
    image: evt180624,
    heure: "19H",
    lieu: "Esplanade Château Montaleau, Sucy-en-Brie",
    prix: "Gratuit",
    description:
      "Alors en déplacement à Londres et refusant la défaite de la France, le Général de Gaulle prend la parole sur la radio britannique, la BBC, et lance son célèbre appel à poursuivre le combat pour une France Libre : « Quoi qu’il arrive, la flamme de la résistance ne doit pas s’éteindre et ne s’éteindra pas »",
  },
  {
    d: "2025-06-21",
    title: "Fête de la Musique",
    date: "Samedi 21 juin 2025",
    image: evt220624,
    heure: "A venir",
    lieu: "A venir",
    prix: "Gratuit",
    description:
      "L'Harmonie sortira pour l'occasion son répertoire festif ! Venez nombreux !",
  },
  {
    d: "2025-06-28",
    title: "Concert Résidence des Cèdres",
    date: "Samedi 28 juin 2025",
    image: evt280625,
    heure: "A venir",
    lieu: "Résidence des Cèdres, Sucy-en-Brie",
    prix: "Gratuit",
    description:
      "Comme chaque année nous viendrons animer le goûter de nos ainés, avec un petit concert festif pour clôturer cette belle saison musicale.",
    url: "",
  },
  {
    d: "2025-06-28",
    title: "Barbecue de fin d'année",
    date: "Samedi 28 juin 2025",
    image: evt2806251,
    heure: "18H",
    lieu: "Salle de la tête de cheval, Sucy-en-Brie",
    prix: "Gratuit",
    description:
      "Réservé aux adhérents et aux musiciens. On clôture l'année musicale par notre traditionnel BBQ ! Venez nombreux pour ce moment de partage ! Chacun apporte ce qu'il souhaite. ",
    url: "",
  },
  
  {
    d: "2025-09-28",
    title: "Sortie 'John Williams, du classique au cinéma'",
    date: "Dimanche 28 septembre 2025",
    image: evt280925,
    heure: "16H",
    lieu: "La Seine Musicale, Boulogne",
    prix: "38€",
    description:
      "Nous vous proposons d'aller ensemble à la Seine Musicale pour un concert fantastique autour de John Williams. De Star Wars à E.T. en passant par les mélodies ensorcelantes d’Harry Potter, John Williams a transformé la musique de film en une véritable symphonie, puisant son inspiration chez les grands compositeurs classiques.  Inscription en ligne jusqu’au 15 juin. Réservé aux adhérents 2025-2026. Plus d'infos ci-dessous. ",
    modal: {
      image1: evt2809251,
    },
    url: "https://www.helloasso.com/associations/les-amis-de-l-harmonie/evenements/concert-john-williams-du-classique-au-cinema"
  },
];

export const Evenement = ({ evenement, button = true }) => (
  <div className="col-12 sm:col-6 lg:col-4 xl:col-3 mb-6">
    <div className="h-full flex flex-auto flex-col justify-between rounded-lg border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800">
      <div className="">
        <ExportedImage
          className="rounded-t-lg"
          sizes="50vw"
          src={evenement.image}
          alt={evenement.title}
        />
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
        {typeof evenement.modal !== "undefined" && (
          <p className="font-normal text-center text-sm text-gray-700 dark:text-gray-400 mt-3">
            <EvenementModal evenement={evenement} />
          </p>
        )}
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
        {evenement.url && button ? (
          <Link
            className="btn btn-primary w-full rounded-b-lg rounded-t-none before:rounded-b-lg before:rounded-t-none text-center overflow-visible"
            href={evenement.url}
            target="_blank"
          >
            Réserver
          </Link>
        ) : (
          <div className="h-[3rem]"></div>
        )}
      </div>
    </div>
  </div>
);

const Evenements = () => (
  <Base title={`Évènements`}>
    <div className="section">
      <div className="container">
        <h1 className="h2 mb-8 text-center">Évènements à venir</h1>
        <div className="row">
          {evenements.map((evenement) => (
            <Evenement key={evenement.title} evenement={evenement} />
          ))}
        </div>
      </div>
    </div>
  </Base>
);

export default Evenements;
