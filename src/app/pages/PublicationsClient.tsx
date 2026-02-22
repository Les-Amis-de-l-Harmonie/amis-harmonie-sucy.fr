"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import type { Publication } from "@/db/types";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

const BATCH_SIZE = 3;

function useColumnCount() {
  const [cols, setCols] = useState(1);

  useEffect(() => {
    function update() {
      if (window.innerWidth >= 1024) setCols(3);
      else if (window.innerWidth >= 768) setCols(2);
      else setCols(1);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return cols;
}

function InstagramPost({ postId }: { postId: string }) {
  return (
    <div className="mb-6">
      <blockquote
        className="instagram-media"
        data-instgrm-captioned
        data-instgrm-permalink={`https://www.instagram.com/p/${postId}/`}
        style={{
          background: "#FFF",
          border: 0,
          borderRadius: "12px",
          boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
          margin: 0,
          maxWidth: "100%",
          minWidth: "100%",
          padding: 0,
          width: "100%",
        }}
      />
    </div>
  );
}

function LoadMoreTrigger({ onLoadMore }: { onLoadMore: () => void }) {
  const { ref, inView } = useInView({ rootMargin: "600px 0px" });

  useEffect(() => {
    if (inView) onLoadMore();
  }, [inView, onLoadMore]);

  return <div ref={ref} className="h-1" />;
}

export function PublicationsClient({ publications }: { publications: Publication[] }) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const columnCount = useColumnCount();

  useEffect(() => {
    if (document.querySelector('script[src*="instagram.com/embed.js"]')) return;
    const script = document.createElement("script");
    script.src = "https://www.instagram.com/embed.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.instgrm) window.instgrm.Embeds.process();
    }, 300);
    return () => clearTimeout(timer);
  }, [visibleCount]);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => (prev >= publications.length ? prev : prev + BATCH_SIZE));
  }, [publications.length]);

  const columns = useMemo(() => {
    const visible = publications.slice(0, visibleCount);
    const cols: Publication[][] = Array.from({ length: columnCount }, () => []);
    visible.forEach((pub, i) => {
      cols[i % columnCount].push(pub);
    });
    return cols;
  }, [publications, visibleCount, columnCount]);

  if (publications.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg mb-4">Aucune publication disponible pour le moment.</p>
        <a
          href="https://www.instagram.com/amisdelharmoniedesucy"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-[#a5b3e2] hover:underline"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
          Suivez-nous sur Instagram
        </a>
      </div>
    );
  }

  const hasMore = visibleCount < publications.length;

  return (
    <>
      <div className="flex gap-6 items-start">
        {columns.map((col, colIndex) => (
          <div key={colIndex} className="flex-1 min-w-0">
            {col.map((pub) => (
              <InstagramPost key={pub.id} postId={pub.instagram_post_id} />
            ))}
          </div>
        ))}
      </div>
      {hasMore && <LoadMoreTrigger onLoadMore={loadMore} />}
    </>
  );
}
