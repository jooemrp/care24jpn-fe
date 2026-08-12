"use client";

import { useEffect, useState, type ReactNode } from "react";
import Section from "@/components/ui/Section";
import type { LegalBlock, LegalDoc } from "@/constants/legal";
import { useLangStore } from "@/features/lang/store";

/** Scroll offset that clears the sticky two-tier header. */
const HEADER_OFFSET = 150;

type TocItem = { id: string; text: string };

/**
 * Table-of-contents card, used both above the document (mobile) and in the
 * sticky sidebar (desktop). The active item is the last heading above the
 * reading position; a small pill indicator slides in beside it.
 */
function TableOfContents({ items, label }: { items: TocItem[]; label: string }) {
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
      className="w-full overflow-hidden rounded-2xl border border-border/60 bg-white"
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

/**
 * Renders the block list, folding consecutive `li` blocks of the same kind
 * into a single <ul>/<ol> and wrapping tables for horizontal overflow.
 * Anchors use the block's index within the list so the TOC stays in sync.
 */
function renderBlocks(blocks: LegalBlock[]): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];

    if (block.type === "li") {
      const kind = block.list;
      const items: string[] = [];
      while (i < blocks.length) {
        const next = blocks[i];
        if (next.type !== "li" || next.list !== kind) break;
        items.push(next.text);
        i++;
      }
      const ListTag = kind;
      out.push(
        <ListTag key={out.length}>
          {items.map((text, n) => (
            <li key={n}>{text}</li>
          ))}
        </ListTag>,
      );
      continue;
    }

    if (block.type === "table") {
      out.push(
        <div key={out.length} className="table-wrap" tabIndex={0}>
          <table>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) =>
                    ri === 0 ? <th key={ci}>{cell}</th> : <td key={ci}>{cell}</td>,
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      i++;
      continue;
    }

    if (block.type === "h2") {
      out.push(
        <h2 key={out.length} id={`sec-${i}`}>
          {block.text}
        </h2>,
      );
    } else if (block.type === "h3") {
      out.push(<h3 key={out.length}>{block.text}</h3>);
    } else {
      out.push(<p key={out.length}>{block.text}</p>);
    }
    i++;
  }

  return out;
}

/**
 * Renders a client-provided legal document (privacy policy, terms, etc.) in a
 * long-form reading layout: pure typography (no boxes around the text) with a
 * table-of-contents card — above the document on mobile, sticky beside it on
 * desktop. Body styles live in `.legal-body` (globals.css) because they are
 * relational (heading after paragraph, first child, ...).
 *
 * The JA and EN bodies are separate full texts, so the active language picks
 * the whole block list rather than translating block by block.
 */
export default function LegalDocPage({ doc }: { doc: LegalDoc }) {
  const { lang } = useLangStore();
  const blocks = doc.body[lang];

  const tocItems: TocItem[] = blocks.flatMap((block, i) =>
    block.type === "h2" ? [{ id: `sec-${i}`, text: block.text }] : [],
  );
  const tocLabel = lang === "ja" ? "目次" : "Table of Contents";
  const showToc = tocItems.length > 2;

  return (
    <Section heading={doc.heading}>
      <div className="lg:flex lg:items-start lg:gap-12">
        <div className="max-w-[42rem] lg:flex-1">
          {showToc && (
            <div className="mb-10 animate-fade-up lg:hidden">
              <TableOfContents items={tocItems} label={tocLabel} />
            </div>
          )}

          <div className="legal-body animate-fade-up">{renderBlocks(blocks)}</div>
        </div>

        {showToc && (
          <aside className="hidden w-72 shrink-0 lg:block">
            <div className="sticky top-40 max-h-[calc(100vh-12rem)] overflow-y-auto">
              <TableOfContents items={tocItems} label={tocLabel} />
            </div>
          </aside>
        )}
      </div>
    </Section>
  );
}
