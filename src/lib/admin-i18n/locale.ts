export type AdminLanguage = "de" | "en";
export type AdminMessageValues = Readonly<Record<string, string | number>>;
export type AdminMessage = { message: string; values?: AdminMessageValues };
export type AdminTranslator = (message: string, values?: AdminMessageValues) => string;

export const ADMIN_LANGUAGE_COOKIE = "ws_admin_language";
export const REQUEST_LANGUAGE_HEADER = "x-ws-language";
export const DEFAULT_ADMIN_LANGUAGE: AdminLanguage = "en";

export function parseAdminLanguage(value: unknown): AdminLanguage | undefined {
  return value === "de" || value === "en" ? value : undefined;
}

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function interpolateAdminMessage(message: string, values?: AdminMessageValues): string {
  if (!values) return message;
  return message.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : placeholder);
}

const baseTitles = {
  de: "Website-Verwaltung",
  en: "Website administration",
} as const;

const adminRouteTitles = {
  "/admin/login": { de: "Anmelden", en: "Sign in" },
  "/admin/analytics": { de: "Webanalyse", en: "Web analytics" },
  "/admin/agents": { de: "KI & Agenten", en: "AI & agents" },
  "/admin/newsletter": { de: "Newsletter", en: "Newsletter" },
  "/admin/vorlagen": { de: "Vorlagen", en: "Templates" },
  "/admin/sicherheit": { de: "Sicherheit", en: "Security" },
  "/admin/social": { de: "Social-Studio", en: "Social Studio" },
  "/admin/social/planner": { de: "Post-Planer", en: "Post planner" },
  "/admin/coach": { de: "Coach Studio", en: "Coach Studio" },
  "/admin/club": { de: "Vereinsverwaltung", en: "Club management" },
} as const;

export function adminPageTitle(pathname: string, language: AdminLanguage): string {
  if (pathname.startsWith("/admin/club/")) return `${adminRouteTitles["/admin/club"][language]} · ${baseTitles[language]}`;
  if (pathname.startsWith("/admin/coach/")) {
    return language === "en" ? "Edit tactic · Coach Studio" : "Taktik bearbeiten · Coach Studio";
  }
  const title = adminRouteTitles[pathname as keyof typeof adminRouteTitles]?.[language];
  return title ? `${title} · ${baseTitles[language]}` : baseTitles[language];
}
