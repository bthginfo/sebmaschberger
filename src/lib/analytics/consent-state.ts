export type Consent = {
  version: 1;
  necessary: true;
  analytics: boolean;
  external: boolean;
  marketing?: boolean;
  statisticsGeneration?: number;
  scriptsGeneration?: string;
  savedAt: string;
};

export const storageKey = "ws-consent-v1";
export const consentChangedEvent = "hp:consent-changed";
const fallbackKey = storageKey + "-session";
let volatileConsent: Consent | null = null;

function parseConsent(raw: string | null): Consent | null {
  const value = JSON.parse(raw ?? "null");
  return value?.version === 1 && value.necessary === true
    && typeof value.analytics === "boolean" && typeof value.external === "boolean" ? value : null;
}

export function readConsent(): Consent | null {
  if (volatileConsent) return volatileConsent;
  try {
    const fallback = parseConsent(sessionStorage.getItem(fallbackKey));
    if (fallback) return fallback;
  } catch { /* The browser may disable session storage. */ }
  try {
    return parseConsent(localStorage.getItem(storageKey));
  } catch {
    return null;
  }
}

export function storeConsent(consent: Consent) {
  const value = JSON.stringify(consent);
  try {
    localStorage.setItem(storageKey, value);
  } catch {
    volatileConsent = consent;
    try { sessionStorage.setItem(fallbackKey, value); } catch { /* Keep the choice in this document. */ }
    return;
  }
  volatileConsent = null;
  try { sessionStorage.removeItem(fallbackKey); } catch { /* Local storage is authoritative on the next visit. */ }
}
