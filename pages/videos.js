import Base from "@layouts/Baseof";
import Youtube from "@shortcodes/Youtube"

const Videos = () => {
  const videos = [
    {id: "gKQQWB8-PvQ", title: "Concert pour la délégation de Para Athlétisme des USA"},
    {id: "RS7MAwTtdZE", title: "Fête de la musique 2023"},
    {id: "ZzvzJ3wVxgQ", title: "Concert au Popott' Truck 2023"},
    {id: "dwMtHfKVsKY", title: "Commémoration du 8 mai 1945"},
    {id: "z2hks6eO8WQ", title: "Thé Dansant 2023"},
    {id: "U-SYrUB8kEw", title: "Fête de la Saint-Vincent 2023"},
    {id: "5ouK1KDKNF0", title: "\"The Best Of Beatles\""},
    {id: "XOiG6ri3xRw", title: "Concert \"Autour de la Méditerranée\""},
  ]

  return (
    <Base title={`Vidéos`}>
      <div className="section">
        <div className="container">
          <h1 className="h2 mb-8 text-center">
            Vidéos
          </h1>
          <div className="row">
            {videos.map((video) =>
              <div key={video.id} className="col-12 mb-5 px-12 sm:col-6 text-center">
                <Youtube id={video.id} title={video.title} />
                <b>{video.title}</b>
              </div>
            )}
          </div>
        </div>
      </div>
    </Base>
  );
};

export default Videos;