import "server-only";

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { cache } from "react";
import { getDraftConfig } from "@/lib/db";
import { ADMIN_LANGUAGE_COOKIE, DEFAULT_ADMIN_LANGUAGE, adminPageTitle, parseAdminLanguage } from "./locale";

export const readAdminLanguagePreferences = cache(async () => {
  const [cookieStore, config] = await Promise.all([cookies(), getDraftConfig().catch(() => undefined)]);
  const workspaceLanguage = parseAdminLanguage(config?.defaultAdminLanguage) ?? DEFAULT_ADMIN_LANGUAGE;
  const preferredLanguage = parseAdminLanguage(cookieStore.get(ADMIN_LANGUAGE_COOKIE)?.value);
  return { workspaceLanguage, preferredLanguage, language: preferredLanguage ?? workspaceLanguage };
});

export async function readAdminLanguage() {
  return (await readAdminLanguagePreferences()).language;
}

export async function adminMetadata(pathname: string): Promise<Metadata> {
  return { title: adminPageTitle(pathname, await readAdminLanguage()), robots: { index: false, follow: false } };
}
