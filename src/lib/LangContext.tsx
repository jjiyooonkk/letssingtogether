"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { SiteLang } from "./i18n";
import { t as translate } from "./i18n";

interface LangContextType {
  lang: SiteLang;
  setLang: (lang: SiteLang) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextType>({
  lang: "ko",
  setLang: () => {},
  t: (key) => key,
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<SiteLang>("ko");

  useEffect(() => {
    const saved = localStorage.getItem("siteLang") as SiteLang | null;
    if (saved) setLangState(saved);
  }, []);

  const setLang = useCallback((l: SiteLang) => {
    setLangState(l);
    localStorage.setItem("siteLang", l);
  }, []);

  const tFn = useCallback((key: string) => translate(key, lang), [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, t: tFn }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
