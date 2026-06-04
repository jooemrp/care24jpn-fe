"use client";

import { create } from "zustand";

export type Lang = "ja" | "en";

interface LangState {
  lang: Lang;
  toggle: () => void;
}

export const useLangStore = create<LangState>((set) => ({
  lang: "ja",
  toggle: () => set((state) => ({ lang: state.lang === "ja" ? "en" : "ja" })),
}));

export function t(text: { ja: string; en: string }, lang: Lang): string {
  return text[lang];
}
