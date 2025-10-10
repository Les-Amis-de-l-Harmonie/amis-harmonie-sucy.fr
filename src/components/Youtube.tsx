import React from "react";
import LiteYouTubeEmbed from "react-lite-youtube-embed";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";

interface YoutubeProps {
  id: string;
  title: string;
  [key: string]: any;
}

const Youtube: React.FC<YoutubeProps> = ({ id, title, ...rest }) => {
  return (
    <div className="overflow-hidden rounded-sm">
      <LiteYouTubeEmbed id={id} title={title} {...rest} />
    </div>
  );
};

export default Youtube;
