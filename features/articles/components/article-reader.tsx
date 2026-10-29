"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  IconCheck,
  IconList,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerStop,
  IconTextSize,
  IconVolume,
  IconX,
} from "@tabler/icons-react";
import { PhraseText } from "@/components/PhraseText";
import { fillTemplate } from "@/lib/fill-template";

export type ReaderLabels = {
  tocTitle: string;
  tocOpen: string;
  tocClose: string;
  progress: string;
  timeLeft: string;
  finished: string;
  readerTools: string;
  textSize: string;
  sizeSmall: string;
  sizeMedium: string;
  sizeLarge: string;
  listenStart: string;
  listenPause: string;
  listenResume: string;
  listenStop: string;
  listenSpeed: string;
  listenUnsupported: string;
};

type TocItem = { id: string; label: string; level: 2 | 3 };
type Size = "s" | "m" | "l";
type Speech = "idle" | "playing" | "paused";

const SIZE_KEY = "care24:reader-size";
const SPEEDS = [0.85, 1, 1.25] as const;
const RING = 2 * Math.PI * 15;

const SIZE_EVENT = "care24:reader-size";
let memorySize: Size = "m";

function readStoredSize(): Size {
  try {
    const stored = window.localStorage.getItem(SIZE_KEY);
    if (stored === "s" || stored === "m" || stored === "l") return stored;
  } catch {
    // Private mode / blocked storage: keep the in-memory choice.
  }
  return memorySize;
}

function subscribeSize(onChange: () => void): () => void {
  window.addEventListener(SIZE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SIZE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function storeSize(next: Size): void {
  memorySize = next;
  try {
    window.localStorage.setItem(SIZE_KEY, next);
  } catch {
    // Persistence is a convenience only.
  }
  window.dispatchEvent(new Event(SIZE_EVENT));
}

const noopSubscribe = () => () => {};
const detectSpeech = () => "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

/**
 * Reading shell for one article. It wraps the server-rendered article column
 * (`children`, which must contain an element with id `article-body`) and adds:
 *
 *  - a thin top progress bar and a live "N min left" estimate,
 *  - a sticky contents rail (desktop) / contents sheet (phone) with the
 *    section being read highlighted,
 *  - a text-size control (S / M / L), remembered per browser,
 *  - read-aloud: the browser's own speech synthesis walks the article block by
 *    block, highlighting and scrolling to the block being spoken.
 *
 * Everything is progressive enhancement: with JS off the article is still a
 * plain, fully readable page.
 */
export default function ArticleReader({
  toc,
  totalMinutes,
  labels,
  speechLang,
  children,
}: {
  toc: TocItem[];
  totalMinutes: number;
  labels: ReaderLabels;
  speechLang: string;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);

  const [percent, setPercent] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const size = useSyncExternalStore<Size>(subscribeSize, readStoredSize, () => "m");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);

  const [speech, setSpeech] = useState<Speech>("idle");
  const speechSupported = useSyncExternalStore(noopSubscribe, detectSpeech, () => true);
  const [speedIndex, setSpeedIndex] = useState(1);
  const speechRef = useRef({ token: 0, index: 0, rate: 1 });

  const chooseSize = storeSize;

  // Progress bar + current section, from a single rAF-throttled scroll handler.
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
      progressRef.current = p;
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      setPercent((prev) => {
        const next = Math.round(p * 100);
        return prev === next ? prev : next;
      });

      let current: string | null = null;
      for (const item of toc) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= vh * 0.32) current = item.id;
      }
      setActiveId((prev) => (prev === current ? prev : current));
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
  }, [toc, size]);

  // Escape closes whichever overlay is open.
  useEffect(() => {
    if (!sheetOpen && !sizeOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSheetOpen(false);
        setSizeOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen, sizeOpen]);

  // ---- read-aloud ---------------------------------------------------------

  const clearHighlight = useCallback(() => {
    rootRef.current
      ?.querySelectorAll(".is-reading")
      .forEach((el) => el.classList.remove("is-reading"));
  }, []);

  const stopSpeech = useCallback(() => {
    speechRef.current.token += 1;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    clearHighlight();
    setSpeech("idle");
  }, [clearHighlight]);

  const speakAt = useCallback(
    (start: number) => {
      const body = document.getElementById("article-body");
      if (!body) return;
      const blocks = Array.from(body.querySelectorAll<HTMLElement>("[data-reader-block]"));
      const state = speechRef.current;
      state.token += 1;
      const token = state.token;

      const run = (index: number) => {
        if (index >= blocks.length) {
          stopSpeech();
          return;
        }
        state.index = index;
        window.speechSynthesis.cancel();
        clearHighlight();

        const el = blocks[index];
        el.classList.add("is-reading");
        const rect = el.getBoundingClientRect();
        if (rect.top < 140 || rect.bottom > window.innerHeight - 160) {
          el.scrollIntoView({
            block: "center",
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "auto"
              : "smooth",
          });
        }

        const text = (el.innerText || "").replace(/\s+/g, " ").trim();
        if (!text) {
          run(index + 1);
          return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = speechLang;
        utterance.rate = state.rate;
        utterance.onend = () => {
          if (speechRef.current.token === token) run(index + 1);
        };
        utterance.onerror = () => {
          if (speechRef.current.token === token) stopSpeech();
        };
        window.speechSynthesis.speak(utterance);
        setSpeech("playing");
      };

      run(start);
    },
    [clearHighlight, speechLang, stopSpeech],
  );

  const startOrToggleSpeech = () => {
    if (!speechSupported) return;
    if (speech === "idle") {
      // Start from the first block that is on screen, so "listen" begins
      // where the reader is rather than at the top of the page.
      const body = document.getElementById("article-body");
      const blocks = body
        ? Array.from(body.querySelectorAll<HTMLElement>("[data-reader-block]"))
        : [];
      const first = blocks.findIndex((el) => el.getBoundingClientRect().bottom > 140);
      speakAt(Math.max(0, first));
    } else if (speech === "playing") {
      window.speechSynthesis.pause();
      setSpeech("paused");
    } else {
      window.speechSynthesis.resume();
      setSpeech("playing");
    }
  };

  const cycleSpeed = () => {
    const next = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(next);
    speechRef.current.rate = SPEEDS[next];
    if (speech !== "idle") speakAt(speechRef.current.index);
  };

  useEffect(() => {
    const state = speechRef.current;
    const stopOnLeave = () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
    window.addEventListener("pagehide", stopOnLeave);
    return () => {
      window.removeEventListener("pagehide", stopOnLeave);
      state.token += 1;
      stopOnLeave();
    };
  }, []);

  const minutesLeft = Math.max(0, Math.ceil(totalMinutes * (1 - percent / 100)));
  const done = percent >= 98;
  const activeItem = toc.find((item) => item.id === activeId);
  const timeLabel = done
    ? labels.finished
    : fillTemplate(labels.timeLeft, { minutes: Math.max(1, minutesLeft) });

  return (
    <div ref={rootRef} className="article-reader" data-size={size}>
      {/* Progress bar — above the sticky header. */}
      <div
        role="progressbar"
        aria-label={labels.progress}
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

      <div className="mx-auto grid max-w-6xl gap-x-12 px-6 lg:grid-cols-[14.5rem_minmax(0,1fr)]">
        {/* Contents rail (desktop) */}
        <aside className="hidden lg:block">
          <nav
            aria-label={labels.tocTitle}
            className="sticky top-40 max-h-[calc(100vh-13rem)] overflow-y-auto pb-6 pr-2"
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-muted">
              {labels.tocTitle}
            </p>
            <TocList toc={toc} activeId={activeId} />
          </nav>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>

      {/* Reader dock — sits above the site's sticky CTA bar. */}
      <div
        role="toolbar"
        aria-label={labels.readerTools}
        className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[65] flex justify-center px-3 md:bottom-24"
      >
        <div className="pointer-events-auto relative flex w-full max-w-md items-center gap-1 rounded-full border border-border bg-surface/95 p-1.5 shadow-[0_10px_30px_-8px_rgba(27,31,94,0.35)] backdrop-blur">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label={labels.tocOpen}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full py-1 pl-1 pr-3 text-left transition hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="relative grid h-10 w-10 shrink-0 place-items-center">
              <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden="true">
                <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" className="stroke-border" />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="stroke-primary transition-[stroke-dashoffset] duration-150"
                  strokeDasharray={RING}
                  strokeDashoffset={RING * (1 - percent / 100)}
                />
              </svg>
              {done ? (
                <IconCheck size={16} className="text-primary" aria-hidden="true" />
              ) : (
                <span className="text-[0.6875rem] font-bold tabular-nums text-heading">{percent}</span>
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[0.8125rem] font-bold leading-tight text-heading">
                {activeItem?.label ?? labels.tocTitle}
              </span>
              <span className="block truncate text-xs leading-tight text-muted">{timeLabel}</span>
            </span>
            <IconList size={18} className="ml-auto shrink-0 text-primary" aria-hidden="true" />
          </button>

          <span aria-hidden="true" className="h-6 w-px bg-border" />

          <button
            type="button"
            onClick={() => setSizeOpen((open) => !open)}
            aria-expanded={sizeOpen}
            aria-label={labels.textSize}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-heading transition hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <IconTextSize size={22} aria-hidden="true" />
          </button>

          {speechSupported ? (
            <div className="flex shrink-0 items-center">
              <button
                type="button"
                onClick={startOrToggleSpeech}
                aria-label={
                  speech === "idle"
                    ? labels.listenStart
                    : speech === "playing"
                      ? labels.listenPause
                      : labels.listenResume
                }
                aria-pressed={speech === "playing"}
                className={`grid h-11 shrink-0 place-items-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  speech === "idle"
                    ? "w-11 text-heading hover:bg-primary-light"
                    : "w-11 bg-primary text-white hover:bg-primary-deep"
                }`}
              >
                {speech === "idle" ? (
                  <IconVolume size={22} aria-hidden="true" />
                ) : speech === "playing" ? (
                  <IconPlayerPause size={20} aria-hidden="true" />
                ) : (
                  <IconPlayerPlay size={20} aria-hidden="true" />
                )}
              </button>
              {speech !== "idle" && (
                <>
                  <button
                    type="button"
                    onClick={cycleSpeed}
                    aria-label={`${labels.listenSpeed} ${SPEEDS[speedIndex]}x`}
                    className="h-11 min-w-11 rounded-full px-1 text-xs font-bold tabular-nums text-heading transition hover:bg-primary-light"
                  >
                    {SPEEDS[speedIndex]}x
                  </button>
                  <button
                    type="button"
                    onClick={stopSpeech}
                    aria-label={labels.listenStop}
                    className="grid h-11 w-11 place-items-center rounded-full text-heading transition hover:bg-primary-light"
                  >
                    <IconPlayerStop size={20} aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          ) : (
            <span className="sr-only">{labels.listenUnsupported}</span>
          )}

          {sizeOpen && (
            <div
              role="group"
              aria-label={labels.textSize}
              className="absolute bottom-full right-2 mb-3 flex items-center gap-1 rounded-2xl border border-border bg-surface p-1.5 shadow-[0_10px_30px_-8px_rgba(27,31,94,0.35)]"
            >
              {(
                [
                  ["s", labels.sizeSmall, "text-sm"],
                  ["m", labels.sizeMedium, "text-base"],
                  ["l", labels.sizeLarge, "text-xl"],
                ] as const
              ).map(([value, label, glyph]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={size === value}
                  onClick={() => chooseSize(value)}
                  className={`grid h-11 min-w-14 place-items-center rounded-xl px-3 font-bold transition ${glyph} ${
                    size === value
                      ? "bg-primary text-white"
                      : "text-heading hover:bg-primary-light"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contents sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center md:items-center">
          <button
            type="button"
            aria-label={labels.tocClose}
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 bg-heading/40 backdrop-blur-[2px]"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={labels.tocTitle}
            className="relative flex max-h-[78vh] w-full max-w-lg flex-col rounded-t-3xl bg-surface shadow-2xl md:rounded-3xl"
          >
            <div className="flex items-center justify-between px-6 pb-2 pt-5">
              <p className="text-base font-bold text-heading">{labels.tocTitle}</p>
              <button
                type="button"
                autoFocus
                onClick={() => setSheetOpen(false)}
                aria-label={labels.tocClose}
                className="grid h-11 w-11 place-items-center rounded-full text-heading transition hover:bg-primary-light"
              >
                <IconX size={22} aria-hidden="true" />
              </button>
            </div>
            <nav aria-label={labels.tocTitle} className="overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <TocList toc={toc} activeId={activeId} onNavigate={() => setSheetOpen(false)} large />
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}

function TocList({
  toc,
  activeId,
  onNavigate,
  large = false,
}: {
  toc: TocItem[];
  activeId: string | null;
  onNavigate?: () => void;
  large?: boolean;
}) {
  return (
    <ol className="relative space-y-0.5 border-l border-border">
      {toc.map((item) => {
        const active = item.id === activeId;
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={onNavigate}
              aria-current={active ? "location" : undefined}
              className={`-ml-px block border-l-2 py-1.5 leading-snug transition-colors ${
                item.level === 3 ? "pl-7" : "pl-4"
              } ${large ? "py-2.5 text-base" : "text-[0.8125rem]"} ${
                active
                  ? "border-accent font-bold text-heading"
                  : "border-transparent text-body hover:border-primary hover:text-primary"
              }`}
            >
              <PhraseText text={item.label} />
            </a>
          </li>
        );
      })}
    </ol>
  );
}
