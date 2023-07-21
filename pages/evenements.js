import Base from "@layouts/Baseof";

export const evenements = [
  {title: "Fête des associations", date : "Dimanche 10 septembre 2023", image: "images/evt100923.png", description: " Profitez du concert de l'Harmonie Municipale de Sucy-en-Brie et venez nous rencontrer sur notre stand."},
  {title: "Brocante de Sucy", date : "Dimanche 17 septembre 2023", image: "images/evt170923.png", description: "L'Harmonie Municipale de Sucy-en-Brie déambulera à travers la brocante pour vous faire danser !"},
  {title: "Concert Musiques Traditionnelles", date : "Samedi 25 novembre 2023 15h", image: "images/evt251123.png", description: "C’est par un voyage «insensé» du soleil de mediterranée au soleil levant, en passant par l’Inde, la Chine et quelques contrées américaines où l’on aime le jazz et les big bands que l’harmonie vous convie.",url: "https://www.helloasso.com/associations/les-amis-de-l-harmonie/evenements/concert-du-25-novembre"},
  {title: "Thé Dansant", date : "Dimanche 28 janvier 14h",image: "images/evt280124.png", description: "Nous vous proposons un rendez-vous musical haut en couleur avec 2 orchestres complémentaires dans la grande tradition de la Coupole à Paris. Plus de 4h de musique non-stop !" , url: "https://www.helloasso.com/associations/les-amis-de-l-harmonie/evenements/the-dansant-2024-1"},
]

export const Evenement = ({evenement}) =>
  <div key={evenement.title} className="col-12 mb-5 px-2 sm:col-3 text-center">
    <div class="max-w-sm pb-5 bg-white h-[580px] border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
      <img class="rounded-t-lg" src={evenement.image} alt="" />
      <div class="p-5 h-[350px]">
        <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{evenement.title}</h5>
        <p class="mb-3 font-normal text-gray-700 dark:text-gray-400">{evenement.date}</p>
        <p class="mb-3 font-normal text-gray-700 dark:text-gray-400">{evenement.description}</p>
      </div>
        {evenement.url &&
          <a href={evenement.url} target="_blank" class="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-primary rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
            Réserver
            <svg class="w-3.5 h-3.5 ml-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5h12m0 0L9 1m4 4L9 9"/>
            </svg>
          </a>
        }


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
            <Evenement evenement={evenement} />
          )}
        </div>
      </div>
    </div>
  </Base>

export default Evenements;
