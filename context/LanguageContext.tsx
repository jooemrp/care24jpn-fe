"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type Lang = "jp" | "en";

type LanguageContextValue = {
  lang: Lang;
  toggle: () => void;
};

const LanguageContext = createContext<LanguageContextValue>({
  lang: "jp",
  toggle: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("jp");
  const toggle = () => setLang((l) => (l === "jp" ? "en" : "jp"));
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
export function t(text: { jp: string; en: string }, lang: Lang): string {
  return text[lang];
}
