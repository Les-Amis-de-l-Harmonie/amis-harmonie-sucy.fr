import Base from "@layouts/Baseof";

const Evenements = () => {
  const evenements = [
    {title: "XXX", image: "images/1.png", description: "bla bla bla", url: "xxx"},
    {title: "YYY", image: "images/2.png", description: "bla bla bla"},
    {title: "ZZZ", image: "images/3.png", description: "bla bla bla"},
    {title: "AAA", image: "images/4.png", description: "bla bla bla"},
    {title: "BBB", image: "images/5.png", description: "bla bla bla", url: "yyy"},
    {title: "CCC", image: "images/6.png", description: "bla bla bla"},
  ]

  return (
    <Base title={`Évènements`}>
      <div className="section">
        <div className="container">
          <h1 className="h2 mb-8 text-center">
            Évènements
          </h1>
          <div className="row">
            {evenements.map((evenement) =>
              <div key={evenement.title} className="col-12 mb-5 px-12 sm:col-4 text-center">
                <div class="max-w-sm bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
                  <img class="rounded-t-lg" src={evenement.image} alt="" />
                  <div class="p-5">
                    <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{evenement.title}</h5>
                    <p class="mb-3 font-normal text-gray-700 dark:text-gray-400">{evenement.description}</p>
                    {evenement.url &&
                      <a href="#" class="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                        Réserver
                        <svg class="w-3.5 h-3.5 ml-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5h12m0 0L9 1m4 4L9 9"/>
                        </svg>
                      </a>
                    }
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Base>
  );
};

export default Evenements;
