"use client";

import { useEffect, useState } from "react";

/** Scroll offset that clears the sticky two-tier header. */
const HEADER_OFFSET = 150;

export type TocItem = { id: string; text: string };

/**
 * Table-of-contents card, used both above the document (mobile) and in the
 * sticky sidebar (desktop). The active item is the last heading above the
 * reading position; a small pill indicator slides in beside it.
 */
export default function TableOfContents({ items, label }: { items: TocItem[]; label: string }) {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    if (items.length === 0) return;

    const handleScroll = () => {
      const scrollPos = window.scrollY + HEADER_OFFSET + 10;
      let currentId = "";
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY;
          if (top <= scrollPos) currentId = item.id;
          else break;
        }
      }
      setActiveId(currentId);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [items]);

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  if (items.length === 0) return null;

  return (
    <nav
      className="w-full overflow-hidden rounded-2xl border border-border/60 bg-surface"
      aria-label={label}
    >
      <div className="border-b border-border/50 px-5 py-3.5">
        <p className="text-xs font-bold uppercase tracking-wider text-heading">{label}</p>
      </div>
      <ul className="space-y-0.5 p-3">
        {items.map((item) => {
          const isActive = activeId === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => scrollToHeading(item.id)}
                aria-current={isActive ? "location" : undefined}
                className={`group relative flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-all duration-200 ${
                  isActive ? "text-primary" : "text-heading/50 hover:text-heading"
                }`}
              >
                {/* Sliding pill indicator */}
                <span
                  className={`absolute left-0 top-1/2 h-0 w-1 -translate-y-1/2 rounded-full bg-primary transition-all duration-300 ${
                    isActive ? "h-6 opacity-100" : "opacity-0"
                  }`}
                />
                <span
                  className={`text-[13px] leading-snug transition-colors duration-200 ${
                    isActive ? "font-semibold" : "font-normal"
                  }`}
                >
                  {item.text}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
