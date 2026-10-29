"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Reading shell for one article. It wraps the server-rendered article column
 * (`children`, which must contain an element with id `article-body`) and adds a
 * thin top progress bar. With JS off the article is still a plain, fully
 * readable page.
 */
export default function ArticleReader({
  progressLabel,
  children,
}: {
  progressLabel: string;
  children: ReactNode;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const body = document.getElementById("article-body");
    if (!body) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = body.getBoundingClientRect();
      const vh = window.innerHeight;
      const span = Math.max(1, rect.height - vh * 0.5);
      const p = Math.min(1, Math.max(0, (vh * 0.3 - rect.top) / span));
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      setPercent(Math.round(p * 100));
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="article-reader">
      {/* Progress bar — above the sticky header. */}
      <div
        role="progressbar"
        aria-label={progressLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-1 bg-transparent"
      >
        <div
          ref={barRef}
          className="h-full origin-left bg-linear-to-r from-primary via-primary-mid to-accent"
          style={{ transform: "scaleX(0)" }}
        />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
