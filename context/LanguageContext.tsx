"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type Lang = "ja" | "en";

type LanguageContextValue = {
  lang: Lang;
  toggle: () => void;
};

const LanguageContext = createContext<LanguageContextValue>({
  lang: "ja",
  toggle: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ja");
  const toggle = () => setLang((l) => (l === "ja" ? "en" : "ja"));
  return (
    <LanguageContext.Provider value={{ lang, toggle }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}

/** Pick the correct string for the active language. */
export function t(text: { ja: string; en: string }, lang: Lang): string {
  return text[lang];
}
