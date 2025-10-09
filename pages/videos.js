import Base from "../components/Layout";
import Layout from "../components/Layout";
import Youtube from "../components/Youtube";

const Videos = () => {
  const videos = [
    { id: "iZwfSjflbKA", title: "Thé Dansant 2025" },
    { id: "dF3qZQ9EZxw", title: "Passage de la Flamme Paralympique" },
    { id: "LUJZmqu1RhU", title: "Fête de la musique 2024" },
    { id: "BJ6ZsHqiZnQ", title: "Un dimanche en Fauré - Pavane & Pie Jesu" },
    {
      id: "1PtbOEhup-E",
      title: "Cérémonie d'ouverture des Sister Cities Games 2024",
    },
    { id: "L0YjfpQzHXI", title: "Virgule Musicale - Le Concert Impromptu" },
    { id: "ze4b6Br0qCI", title: "Thé Dansant 2024" },
    { id: "JKdJ5Ia9YZk", title: 'Concert "Musiques Traditionnelles"' },
    {
      id: "YbWBx3DkJrU",
      title: "Commémoration de l'Armistice de 1918 - 11 novembre 2023",
    },
    { id: "MJSRTO9_66c", title: "Brocante de Sucy-en-Brie 2023" },
    { id: "jg0jYA1mtq4", title: "Fête des associations de Sucy-en-Brie 2023" },
    {
      id: "gKQQWB8-PvQ",
      title: "Concert pour la délégation de Para Athlétisme des USA",
    },
    { id: "RS7MAwTtdZE", title: "Fête de la musique 2023" },
    { id: "ZzvzJ3wVxgQ", title: "Concert au Popott' Truck 2023" },
    { id: "dwMtHfKVsKY", title: "Commémoration du 8 mai 1945" },
    { id: "z2hks6eO8WQ", title: "Thé Dansant 2023" },
    { id: "U-SYrUB8kEw", title: "Fête de la Saint-Vincent 2023" },
    { id: "5ouK1KDKNF0", title: '"The Best Of Beatles"' },
    { id: "XOiG6ri3xRw", title: 'Concert "Autour de la Méditerranée"' },
  ];

  return (
    <Layout title={`Vidéos`}>
      <div className="section">
        <div className="container">
          <h1 className="h2 mb-8 text-center">Vidéos</h1>
          <div className="row">
            {videos.map((video) => (
              <div
                key={video.id}
                className="col-12 mb-5 px-12 md:col-6 text-center"
              >
                <Youtube id={video.id} title={video.title} />
                <b>{video.title}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Videos;
