import Base from "@layouts/Baseof";

const Videos = () => {
  return (
    <Base title={`Vidéos`}>
      <div className="section">
        <div className="container">
          <h1 className="h2 mb-8 text-center">
            Vidéos
          </h1>
          <div className="row">
            <div className="col-12 mb-5 sm:col-6">
              <iframe width="560" height="315" src="https://www.youtube.com/embed/gKQQWB8-PvQ" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
            </div>
            <div className="col-12 mb-5 sm:col-6">
              <iframe width="560" height="315" src="https://www.youtube.com/embed/RS7MAwTtdZE" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
            </div>
            <div className="col-12 mb-5 sm:col-6">
              <iframe width="560" height="315" src="https://www.youtube.com/embed/ZzvzJ3wVxgQ" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
            </div>
            <div className="col-12 mb-5 sm:col-6">
              <iframe width="560" height="315" src="https://www.youtube.com/embed/dwMtHfKVsKY" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
            </div>
            <div className="col-12 mb-5 sm:col-6">
              <iframe width="560" height="315" src="https://www.youtube.com/embed/z2hks6eO8WQ" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
            </div>
            <div className="col-12 mb-5 sm:col-6">
              <iframe width="560" height="315" src="https://www.youtube.com/embed/U-SYrUB8kEw" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
            </div>
            <div className="col-12 mb-5 sm:col-6">
              <iframe width="560" height="315" src="https://www.youtube.com/embed/5ouK1KDKNF0" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
            </div>
            <div className="col-12 mb-5 sm:col-6">
              <iframe width="560" height="315" src="https://www.youtube.com/embed/XOiG6ri3xRw" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
            </div>
          </div>
        </div>
      </div>
    </Base>
  );
};

export default Videos;