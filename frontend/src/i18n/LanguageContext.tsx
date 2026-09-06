import { useQuery } from "@tanstack/react-query";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api } from "@/src/api";
import { Lang, StringKey, strings } from "@/src/i18n/strings";
import { storage } from "@/src/utils/storage";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  audio: boolean;
  setAudio: (v: boolean) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
  /** Picks the Hindi field when available, else English. */
  tr: (en: string, hi?: string | null) => string;
};

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [audio, setAudioState] = useState(true);

  useEffect(() => {
    storage.getItem<string>("routy_lang", "en").then((v) => setLangState(v === "hi" ? "hi" : "en"));
    storage.getItem<boolean>("routy_audio", true).then((v) => setAudioState(v !== false));
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    storage.setItem("routy_lang", l);
  }, []);
  const setAudio = useCallback((v: boolean) => {
    setAudioState(v);
    storage.setItem("routy_audio", v);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang,
      audio,
      setAudio,
      t: (key, vars) => {
        let s: string = strings[lang][key] ?? strings.en[key] ?? key;
        if (vars) Object.entries(vars).forEach(([k, v]) => (s = s.replace(`{${k}}`, String(v))));
        return s;
      },
      tr: (en, hi) => (lang === "hi" && hi ? hi : en),
    }),
    [lang, audio, setLang, setAudio],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage outside LanguageProvider");
  return ctx;
}

/** Live machine translation (free MyMemory API via backend, cached) for dynamic text without a Hindi field. */
export function useTranslated(text: string | null | undefined, hi?: string | null): string {
  const { lang } = useLanguage();
  const needs = lang === "hi" && !!text && !hi;
  const q = useQuery({
    queryKey: ["translate", text, "hi"],
    queryFn: () => api.translate(text as string, "en", "hi"),
    enabled: needs,
    staleTime: Infinity,
    retry: 0,
  });
  if (!text) return "";
  if (lang === "hi" && hi) return hi;
  if (needs && q.data?.translated_text) return q.data.translated_text;
  return text;
}
