"use client";

import { useId, useState, type ReactNode } from "react";
import { ui, type Bilingual } from "@/constants/copy";
import { t } from "@/features/lang/i18n";
import type { Lang } from "@/features/lang/i18n";

/**
 * Accessible tabbed interface. The only interactive component in the app.
 *
 * Each tab supplies a bilingual label and rendered content. The active tab is
 * tracked in local state; arrow keys move focus per the WAI-ARIA tabs pattern.
 */
export type Tab = {
  key: string;
  label: Bilingual;
  content: ReactNode;
};

type TabPanelProps = {
  tabs: Tab[];
  lang: Lang;
};

export default function TabPanel({ tabs, lang }: TabPanelProps) {
  const [active, setActive] = useState(0);
  const baseId = useId();

  if (tabs.length === 0) return null;

  function focusTab(index: number) {
    const next = (index + tabs.length) % tabs.length;
    setActive(next);
    const el = document.getElementById(`${baseId}-tab-${next}`);
    el?.focus();
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={t(ui.tabSwitchLabel, lang)}
        className="flex flex-wrap gap-2 border-b border-border"
      >
        {tabs.map((tab, i) => {
          const selected = i === active;
          return (
            <button
              key={tab.key}
              id={`${baseId}-tab-${i}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${i}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  focusTab(active + 1);
                } else if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  focusTab(active - 1);
                }
              }}
              className={`-mb-px border-b-2 px-5 py-3 text-sm transition ${
                selected
                  ? "border-primary text-primary"
                  : "border-transparent text-heading hover:text-primary"
              }`}
            >
              <span className="block" lang="ja">
                {tab.label.ja}
              </span>
              <span className="block text-[0.65rem] uppercase tracking-widest text-muted" lang="en">
                {tab.label.en}
              </span>
            </button>
          );
        })}
      </div>

      {tabs.map((tab, i) => (
        <div
          key={tab.key}
          id={`${baseId}-panel-${i}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${i}`}
          hidden={i !== active}
          className="pt-8"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
