"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ADMIN_LANGUAGE_COOKIE, adminPageTitle, interpolateAdminMessage, type AdminLanguage, type AdminMessageValues } from "@/lib/admin-i18n/locale";
import { adminCoreEnglish } from "@/lib/admin-i18n/core.en";
import { adminModuleEnglish } from "@/lib/admin-i18n/modules.en";
import { AdminLanguageContext } from "./admin-language";

export function AdminLanguageProvider({ initialWorkspaceLanguage, initialPreferredLanguage, children, scope = "admin" }: {
  initialWorkspaceLanguage: AdminLanguage;
  initialPreferredLanguage?: AdminLanguage;
  children: ReactNode;
  scope?: "admin" | "members";
}) {
  const [workspaceLanguage, setWorkspaceLanguage] = useState(initialWorkspaceLanguage);
  const [preferredLanguage, setPreferredLanguage] = useState(initialPreferredLanguage);
  const language = preferredLanguage ?? workspaceLanguage;
  const updatePreference = useCallback((nextLanguage?: AdminLanguage) => {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${ADMIN_LANGUAGE_COOKIE}=${nextLanguage ?? ""}; Path=/${scope}; Max-Age=${nextLanguage ? 31536000 : 0}; SameSite=Lax${secure}`;
    setPreferredLanguage(nextLanguage);
  }, [scope]);
  const resetLanguage = useCallback(() => updatePreference(), [updatePreference]);

  useEffect(() => {
    document.documentElement.lang = language;
    if (scope === "admin") document.title = adminPageTitle(window.location.pathname, language);
  }, [language, scope]);

  const t = useCallback((message: string, values?: AdminMessageValues) => {
    let text = message;
    if (language === "en") {
      if (Object.hasOwn(adminCoreEnglish, message)) text = adminCoreEnglish[message];
      else if (Object.hasOwn(adminModuleEnglish, message)) text = adminModuleEnglish[message];
    }
    return interpolateAdminMessage(text, values);
  }, [language]);
  const context = useMemo(() => ({
    language,
    workspaceLanguage,
    setLanguage: updatePreference,
    setWorkspaceLanguage,
    resetLanguage,
    t,
    hasProvider: true,
    hasLanguagePreference: preferredLanguage !== undefined,
  }), [language, workspaceLanguage, updatePreference, resetLanguage, t, preferredLanguage]);

  return <AdminLanguageContext.Provider value={context}>{children}</AdminLanguageContext.Provider>;
}
