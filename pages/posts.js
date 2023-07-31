import { useEffect, useRef } from 'react';
import Base from "@layouts/Baseof";
//import { InstagramEmbed } from 'react-social-media-embed';

const Posts = () => {
  /*let [posts, setPosts] = useState([])*/

  const effectRan = useRef(false);

  useEffect(() => {
    /*setPosts([
      "https://www.instagram.com/p/CuT-KbprU3g/",
      "https://www.instagram.com/p/CtXHh52rKQU/",
      "https://www.instagram.com/p/CtM68dDoC6K/",
      "https://www.instagram.com/p/Cs-1hHCLGbW/",
      "https://www.instagram.com/p/CsyGThwI6he/",
      "https://www.instagram.com/p/CsotcQ_Lt-g/",
    ])*/

    if (!effectRan.current) {
      const script = document.createElement("script")
      script.src = "https://widgets.sociablekit.com/instagram-feed/widget.js"
      script.async = true
      document.body.appendChild(script)
      return () => {
        document.body.removeChild(script)
        effectRan.current = true;
      }
    }
  }, [])

  return (
    <Base title={`Posts`}>
      <div className="section">
        <div className="container">
          <h1 className="h2 mb-8 text-center">
            Posts
          </h1>
          <div className="row">
            {/*posts.map((post, index) =>
              <div key={index} className="col-12 mb-5 md:col-6 xl:col-4 text-center overflow-hidden">
                <InstagramEmbed url={post} className="w-full"/>
              </div>
            )*/}
            <div className="col-12">
              <div className='sk-instagram-feed' data-embed-id='173898'></div>
            </div>
          </div>
        </div>
      </div>
    </Base>
  );
};

export default Posts;
