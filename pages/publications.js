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
      "https://www.instagram.com/p/DL17lk0InOI//",
      "https://www.instagram.com/p/DLj6Dtqobsj/",
      "https://www.instagram.com/p/DLef4ewIw4h/?img_index=1",
      "https://www.instagram.com/p/DLQJQaFor9-/",
      "https://www.instagram.com/p/DLNfeudI_Y_/",
      "https://www.instagram.com/p/DLMnhu0IRzA/",
      "https://www.instagram.com/p/DLFBnxwIFEQ/",
      "https://www.instagram.com/p/DLC1t5Bolw8/",
      "https://www.instagram.com/p/DLApCbqo0cd/",
      "https://www.instagram.com/p/DKhras1Iamo/",
      "https://www.instagram.com/p/DKbUo12IrTy/",
      "https://www.instagram.com/p/DKWmMkYoEYN/",
      "https://www.instagram.com/p/DJoU8XqiBJn/",
      "https://www.instagram.com/p/DJhGqdHixkb/",
      "https://www.instagram.com/p/DJZzruGChTB/",
      "https://www.instagram.com/p/DJPPg15C8Ip/",
      "https://www.instagram.com/p/DIoS3tniJ03/?img_index=1",
      "https://www.instagram.com/p/DIiuyQgi7FW/",
      "https://www.instagram.com/p/DIY8sC3CSMC/?img_index=1",
      "https://www.instagram.com/p/DIQ3_ZSi9DF/",
      "https://www.instagram.com/p/DIJ0_IoCMHy/",
      "https://www.instagram.com/p/DH3w6hsiqbn/",
      "https://www.instagram.com/p/DH3wKxPi-jV/",
      "https://www.instagram.com/p/DHt1gEMubJB/",
      "https://www.instagram.com/p/DHrPf_tuFA4/",
      "https://www.instagram.com/p/DHRZejHuWTS/?img_index=1",
      "https://www.instagram.com/p/DDNB5DwIOmc/",
      "https://www.instagram.com/p/DG51a8_CpCP/",
      "https://www.instagram.com/p/DFUsidOOmRR/?img_index=1",
      "https://www.instagram.com/p/FTjKnutWgF/",
      "https://www.instagram.com/p/DErd0nAuQ0A/",
      "https://www.instagram.com/p/DDPkRzIIXyT/?img_index=1",
      "https://www.instagram.com/p/DDNB5DwIOmc/",
      "https://www.instagram.com/p/DCoXzw7u4Ok/?img_index=1",
      "https://www.instagram.com/p/DDIaZruOlRC/",
      "https://www.instagram.com/p/DDC6vidO9Jl/",
      "https://www.instagram.com/p/DCymb5quVNP/",
      "https://www.instagram.com/p/DCwyIgRO8tS/",
      "https://www.instagram.com/p/DDAea2cOJVK/",
      "https://www.instagram.com/p/DCPMijrNYGC/",
      "https://www.instagram.com/p/DCMh2Yool8c/?img_index=1",
      "https://www.instagram.com/p/DBtkB55CTgH/",
      "https://www.instagram.com/p/DBjeEN6CdZJ/",
      "https://www.instagram.com/p/DAx2qhwukjR/",
      "https://www.instagram.com/p/DAT0M6Ju41I/",
      "https://www.instagram.com/p/DAJQzEZoPV2//",
      "https://www.instagram.com/p/DAB5n8oOz3I/",
      "https://www.instagram.com/p/C_950S0twSG/",
      "https://www.instagram.com/p/C_8nrX3OYuh/",
      "https://www.instagram.com/p/C_sOgCmo0wr/?img_index=1",
      "https://www.instagram.com/p/C_aXVWFo-xd/?img_index=1",
      "https://www.instagram.com/p/C_OCFVMCpu0/",
      "https://www.instagram.com/p/C_M9MD3twXh/?img_index=1",
      "https://www.instagram.com/p/C-gFiFYOix9",
      "https://www.instagram.com/p/C-c23t5iUmN/?img_index=1",
      "https://www.instagram.com/p/C-SwMc6Iwla/",
      "https://www.instagram.com/p/C-F85vghGoH/",
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
