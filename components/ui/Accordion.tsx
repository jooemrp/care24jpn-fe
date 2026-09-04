"use client";

/**
 * Accordion — a single collapsible item with a question/trigger and an
 * answer/content panel.
 *
 * Design tokens used:
 *   bg-surface       — panel background
 *   border-border    — divider colour
 *   text-heading     — question text colour
 *   text-body        — answer text colour
 *
 * Responsive: full-width on mobile, max-width constrained by parent container.
 * Uses the light semantic tokens defined in globals.css.
 */

import { useState, useId, type ReactNode } from "react";
import { IconChevronDown } from "@tabler/icons-react";

export type AccordionItemProps = {
  /** The question / trigger label */
  question: string;
  /** The answer / panel content (plain text or CMS inline markup nodes) */
  answer: ReactNode;
  /** Whether the item starts open. Defaults to false. */
  defaultOpen?: boolean;
};

export function AccordionItem({
  question,
  answer,
  defaultOpen = false,
}: AccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
        className={[
          "w-full flex items-center justify-between gap-4",
          "px-5 py-4 md:px-6 md:py-5",
          "text-left text-base md:text-lg font-semibold text-heading",
          "bg-surface hover:bg-primary-light transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
        ].join(" ")}
      >
        <span className="flex-1">{question}</span>
        {/* Chevron icon — rotates 180° when open */}
        <span
          aria-hidden="true"
          className={`shrink-0 text-primary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <IconChevronDown size={20} stroke={1.75} />
        </span>
      </button>

      {/* Answer panel — CSS grid trick for smooth expand/collapse with no JS height calculation */}
      <div
        id={panelId}
        role="region"
        aria-labelledby={undefined}
        className={[
          "grid transition-all duration-200 ease-in-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        ].join(" ")}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-1 md:px-6 md:pb-6 text-base leading-relaxed text-body">
            {answer}
          </div>
        </div>
      </div>
    </div>
  );
}
