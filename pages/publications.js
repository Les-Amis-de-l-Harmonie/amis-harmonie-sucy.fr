import dynamic from "next/dynamic";
import { useEffect, useRef, useState, memo } from "react";
import Base from "@layouts/Baseof";
import { InstagramEmbed } from "react-social-media-embed";
import VirtualScroller from "virtual-scroller/react";

const getColumnsCount = (container) => {
  if (container.getWidth() >= 1280) {
    return 3;
  }
  if (container.getWidth() >= 768) {
    return 2;
  }
  return 1;
};

const Post = ({ item: post }) => (
  <div className="col-12 mb-5 md:col-6 xl:col-4 text-center overflow-hidden">
    <InstagramEmbed url={post} className="w-full" />
  </div>
);

const MemoPost = memo(Post);

const Posts = () => {
  let [posts, setPosts] = useState([]);

  const effectRan = useRef(false);

  useEffect(() => {
    setPosts([
      "https://www.instagram.com/p/C94bxq_vLeZ/",
      "https://www.instagram.com/p/C92vicRsK55/",
      "https://www.instagram.com/p/C9rfaBtuQOR/",
      "https://www.instagram.com/p/C9mTSQQBo8A/",
      "https://www.instagram.com/p/C9ZUgVRBRyT/",
      "https://www.instagram.com/p/C81uJAFIGuj/?img_index=1",
      "https://www.instagram.com/p/C8y0bdlP5PX/",
      "https://www.instagram.com/p/C8iaRIHIznX/?img_index=1",
      "https://www.instagram.com/p/C8cCkU4iE0Y/?img_index=1",
      "https://www.instagram.com/p/C8aXZBPCNT-/?img_index=1",
      "https://www.instagram.com/p/C8Y9mCzNFBh/",
      "https://www.instagram.com/p/C8XOvP6KJw-/",
      "https://www.instagram.com/p/C8FNNmePT1z/",
      "https://www.instagram.com/p/C8FNJ4Fv66i/",
      "https://www.instagram.com/p/C8Cr7X5ImwR/",
      "https://www.instagram.com/p/C8ASHHqiGiM/?img_index=1",
      "https://www.instagram.com/p/C79lqUPCXx0/",
      "https://www.instagram.com/p/C7zpKZyO1Rl/",
      "https://www.instagram.com/p/C7vtE05ig93/",
      "https://www.instagram.com/p/C7lu7g2Ckli/",
      "https://www.instagram.com/p/C7e44UAin7h/",
      "https://www.instagram.com/p/C7blTd-idPJ/",
      "https://www.instagram.com/p/C7CTIlGi3oq/",
      "https://www.instagram.com/p/C6t7gQvLlMc/",
      "https://www.instagram.com/p/C6YyT2bCAtG/",
      "https://www.instagram.com/p/C45jz3zoXau/",
      "https://www.instagram.com/p/C4pR8nEovq0/",
      "https://www.instagram.com/p/C4DdSGcrT32/",
      "https://www.instagram.com/p/C4ANOisLacM/",
      "https://www.instagram.com/p/C33KonorsV9/",
      "https://www.instagram.com/p/C32-mdGrlig/",
      "https://www.instagram.com/p/C3UwbYNNznX/",
      "https://www.instagram.com/p/C299_jhIYBg/",
      "https://www.instagram.com/p/C298OeJIpGS/",
      "https://www.instagram.com/p/C2zBjmArIfJ/?img_index=1",
      "https://www.instagram.com/p/C2r94ZboHEu/?img_index=1",
      "https://www.instagram.com/p/C2hR_ckLVNq/",
      "https://www.instagram.com/p/C2chL8ENre4/",
      "https://www.instagram.com/p/C2Zb_cPrl9U/?img_index=1",
      "https://www.instagram.com/p/C2R5lfGrOFW/",
      "https://www.instagram.com/p/C0mj0ShrL8j/",
      "https://www.instagram.com/p/C2K6iqfr_M5/",
      "https://www.instagram.com/reel/C2NieG7LoQ9/",
      "https://www.instagram.com/p/C0HtGvRLBDA/?img_index=1",
      "https://www.instagram.com/p/CxYrqbDLrHR/",
      "https://www.instagram.com/p/CxAh25SLN0V/",
      "https://www.instagram.com/p/CyS-dq-rop-/?img_index=1",
      "https://www.instagram.com/p/CwXH8OtL5d4/",
      "https://www.instagram.com/p/CwQNzZOIF0N/",
      "https://www.instagram.com/p/Cvz36rbIq34/",
      "https://www.instagram.com/p/Cvz3FOyI2O2/",
      "https://www.instagram.com/p/Cvy9JNgI-wX/",
      "https://www.instagram.com/p/CuT-KbprU3g/",
      "https://www.instagram.com/p/CtXHh52rKQU/?img_index=1",
      "https://www.instagram.com/p/CtM68dDoC6K/",
      "https://www.instagram.com/p/Cs-1hHCLGbW/",
      "https://www.instagram.com/p/CsyGThwI6he/",
      "https://www.instagram.com/p/CsotcQ_Lt-g/",
      "https://www.instagram.com/p/CsJEkyttntD/",
      "https://www.instagram.com/p/CqQx6ShDqbY/?img_index=1",
      "https://www.instagram.com/p/Cpu4l89jH7E/",
      "https://www.instagram.com/p/CpRxTXhDtr1/",
      "https://www.instagram.com/p/Co4nNY2jnuP/?img_index=1",
      "https://www.instagram.com/p/CnwpeDcIOO4/",
      "https://www.instagram.com/p/CnfBMjGLPGR/",
      "https://www.instagram.com/p/CmXNSGaL9o9/?img_index=1",
      "https://www.instagram.com/p/Clbqh6CDez1/",
      "https://www.instagram.com/p/ClL31YBDfcb/",
      "https://www.instagram.com/p/ClLL0qcjfgR/",
      "https://www.instagram.com/p/ClI1CWKIHkV/",
      "https://www.instagram.com/p/Ck2xpAEjARo/",
      "https://www.instagram.com/p/Ck0_-ngjgbT/",
      "https://www.instagram.com/p/Ck0_ZnfDq_j/",
      "https://www.instagram.com/p/Ck0gSF0DB-e/",
      "https://www.instagram.com/p/CkiUf1njKMx/",
      "https://www.instagram.com/p/CkOG4bYDYB8/",
      "https://www.instagram.com/p/Cj3J2u5DGk_/",
      "https://www.instagram.com/p/Ci7U0DajErk/",
      "https://www.instagram.com/p/CivXQGara_e/?img_index=1",
      "https://www.instagram.com/p/Cf_EWL9j2li/",
      "https://www.instagram.com/p/CfyoaOjDuXa/",
      "https://www.instagram.com/p/CfmghsvIrij/",
      "https://www.instagram.com/p/CfiiG5YjEJk/?img_index=1",
      "https://www.instagram.com/p/Cfa2hFzjMfl/",
      "https://www.instagram.com/p/CfYRwZPjN3m/",
      "https://www.instagram.com/p/CfUAL5UDK7l/",
      "https://www.instagram.com/p/CfTH9hWj-3F/",
      "https://www.instagram.com/p/CfSWRfKjxJv/?img_index=1",
      "https://www.instagram.com/p/CfN7tnYjZgS/",
      "https://www.instagram.com/p/CfMMbKNDm6Z/",
      "https://www.instagram.com/p/Ce_-devoSR8/",
      "https://www.instagram.com/p/Ce_zbz0LO0y/?img_index=1",
      "https://www.instagram.com/p/Ce9aYeIqreX/",
      "https://www.instagram.com/p/CexiktkjU_8/",
      "https://www.instagram.com/p/CevTAUaLUVt/?img_index=1",
      "https://www.instagram.com/p/Cean5LVDwvU/",
      "https://www.instagram.com/p/CeWngjIrvii/",
      "https://www.instagram.com/p/CdVeUNLjhGX/",
      "https://www.instagram.com/p/CYLfCDBDdh1/",
      "https://www.instagram.com/p/CXdrXX1Ieve/",
      "https://www.instagram.com/p/CXNw1QEIp_Z/",
      "https://www.instagram.com/p/CXF6S5ioOSg/",
      "https://www.instagram.com/p/CW0jlU1IKYC/",
      "https://www.instagram.com/p/CW0ec_Eobv2/",
      "https://www.instagram.com/p/CW0S_CSoOMl/",
      "https://www.instagram.com/p/CW0LJLOolL2/",
      "https://www.instagram.com/p/CWyZIBvIMWn/",
      "https://www.instagram.com/p/CWyYSvAoP5u/",
    ]);

    /*if (!effectRan.current) {
      const script = document.createElement("script")
      script.src = "https://widgets.sociablekit.com/instagram-feed/widget.js"
      script.async = true
      document.body.appendChild(script)
      return () => {
        document.body.removeChild(script)
        effectRan.current = true;
      }
    }*/
  }, []);

  return (
    <Base title={`Publications`}>
      <div className="section">
        <div className="container">
          <h1 className="h2 mb-8 text-center">Publications</h1>
          <div id="posts-row">
            <VirtualScroller
              items={posts}
              itemComponent={MemoPost}
              getColumnsCount={getColumnsCount}
            />
            {/*<div className="col-12">
              <div className='sk-instagram-feed' data-embed-id='173898'></div>
            </div>*/}
          </div>
        </div>
      </div>
    </Base>
  );
};

const PostsWithoutSSR = dynamic(() => Promise.resolve(Posts), {
  ssr: false,
});

export default PostsWithoutSSR;
