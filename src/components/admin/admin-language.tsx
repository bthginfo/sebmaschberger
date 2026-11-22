"use client";

import { createContext, useContext } from "react";
import { interpolateAdminMessage, type AdminLanguage, type AdminTranslator } from "@/lib/admin-i18n/locale";

type AdminLanguageContextValue = {
  language: AdminLanguage;
  workspaceLanguage: AdminLanguage;
  setLanguage: (language: AdminLanguage) => void;
  setWorkspaceLanguage: (language: AdminLanguage) => void;
  resetLanguage: () => void;
  t: AdminTranslator;
  hasProvider: boolean;
  hasLanguagePreference: boolean;
};

export const AdminLanguageContext = createContext<AdminLanguageContextValue | null>(null);
const ignoreLanguageChange = () => {};

export function useAdminLanguage(fallback: AdminLanguage = "de"): AdminLanguageContextValue {
  const current = useContext(AdminLanguageContext);
  return current ?? {
    language: fallback,
    workspaceLanguage: fallback,
    setLanguage: ignoreLanguageChange,
    setWorkspaceLanguage: ignoreLanguageChange,
    resetLanguage: ignoreLanguageChange,
    t: interpolateAdminMessage,
    hasProvider: false,
    hasLanguagePreference: false,
  };
}

export function AdminLanguageSwitch({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { language, setLanguage, hasProvider } = useAdminLanguage();
  if (!hasProvider) return null;
  return <span role="group" aria-label={language === "en" ? "Interface language" : "Oberflächensprache"} className={["cms-language-switch", compact && "cms-language-switch--compact", className].filter(Boolean).join(" ")}>
    <button type="button" lang="de" aria-label="Deutsch" aria-pressed={language === "de"} onClick={() => setLanguage("de")}>DE</button>
    <button type="button" lang="en" aria-label="English" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button>
  </span>;
}
