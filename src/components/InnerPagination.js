import { sortByDate } from "@lib/utils/sortFunctions";
import Link from "next/link";

const InnerPagination = ({ posts, date }) => {
  const orderedPosts = sortByDate(posts);
  const lastIndex = orderedPosts.length - 1;
  const postIndex = orderedPosts.findIndex(
    (post) => post.frontmatter.date == date,
  );
  const next = postIndex == 0 ? undefined : orderedPosts[postIndex - 1].slug;
  const prev =
    postIndex == lastIndex ? undefined : orderedPosts[postIndex + 1].slug;
  const prevButton = prev && (
    <Link href={prev} className={"btn btn-primary"}>
      Prev
    </Link>
  );
  const nextButton = next && (
    <Link href={next} className={"btn btn-primary"}>
      Next
    </Link>
  );

  return (
    <div className="flex flex-wrap">
      <span className="flex-1">{prevButton}</span>
      <span className="w-2/3" />
      <span className="flex-1">{nextButton}</span>
    </div>
  );
};

export default InnerPagination;
