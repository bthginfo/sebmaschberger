import { consentChangedEvent, readConsent, storageKey, type Consent } from "../analytics/consent-state";
import { secureScriptUrl, type ConsentScript, type PublicConsentScripts } from "./model";
import type { SiteLanguage } from "../types";

type PageRun = { key: string; location: string; cancel: AbortController };
let pageRun: PageRun | undefined;
let reloading = false;
let mounts = 0;

const locationKey = () => window.location.pathname + window.location.search;

export function pageConsentScriptsActive() {
  return pageRun !== undefined;
}

export function consentedScripts(bundle: PublicConsentScripts, consent: Consent | null): ConsentScript[] {
  if (consent?.scriptsGeneration !== bundle.generation) return [];
  return bundle.items.filter(script => script.enabled && consent[script.category] === true);
}

function reloadDocument() {
  if (reloading) return;
  reloading = true;
  pageRun?.cancel.abort();
  window.location.reload();
}

function appendTrustedScript(item: ConsentScript, signal: AbortSignal): Promise<void> | void {
  if (signal.aborted) return;
  const script = document.createElement("script");
  script.dataset.wsConsentScript = item.id;
  script.referrerPolicy = "no-referrer";

  if (item.kind === "inline") {
    script.textContent = item.source;
    document.head.append(script);
    return;
  }

  const url = secureScriptUrl(item.source.trim());
  if (!url) return;
  return new Promise(resolve => {
    const finish = () => {
      script.removeEventListener("load", finish);
      script.removeEventListener("error", finish);
      signal.removeEventListener("abort", cancel);
      resolve();
    };
    const cancel = () => { script.remove(); finish(); };
    script.async = false;
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", finish, { once: true });
    signal.addEventListener("abort", cancel, { once: true });
    script.src = url;
    document.head.append(script);
  });
}

async function runTrustedScripts(items: readonly ConsentScript[], signal: AbortSignal) {
  for (const item of items) {
    if (signal.aborted) break;
    await appendTrustedScript(item, signal);
  }
}

function makeSandbox(items: readonly ConsentScript[], language: SiteLanguage) {
  const context = { origin: window.location.origin, pathname: window.location.pathname, language };
  const sources = items.flatMap(item => {
    const source = item.kind === "url" ? secureScriptUrl(item.source.trim()) : item.source;
    return source ? [{ kind: item.kind, source }] : [];
  });
  const payload = JSON.stringify({ sources, context })
    .replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
  const frame = document.createElement("iframe");
  frame.setAttribute("sandbox", "allow-scripts");
  frame.setAttribute("aria-hidden", "true");
  frame.dataset.wsConsentSandbox = "";
  frame.hidden = true;
  frame.tabIndex = -1;
  frame.referrerPolicy = "no-referrer";
  frame.srcdoc = `<!doctype html><meta name="referrer" content="no-referrer"><script>
    const { sources, context } = ${payload};
    Object.defineProperty(window, "wsConsentPage", { value: Object.freeze(context) });
    (async () => {
      for (const item of sources) {
        const tag = document.createElement("script");
        if (item.kind === "inline") {
          tag.textContent = item.source;
          document.head.append(tag);
        } else {
          await new Promise(resolve => {
            tag.referrerPolicy = "no-referrer";
            tag.onload = tag.onerror = resolve;
            tag.src = item.source;
            document.head.append(tag);
          });
        }
      }
    })();
  </script>`;
  document.body.append(frame);
  return frame;
}

export function mountConsentScripts(bundle: PublicConsentScripts, language: SiteLanguage): () => void {
  if (window !== window.top) return () => {};
  mounts += 1;
  let frame: HTMLIFrameElement | undefined;
  let sandboxKey = "";

  const update = () => {
    if (reloading) return;
    const selected = consentedScripts(bundle, readConsent());
    const trusted = selected.filter(item => item.context === "page");
    const trustedKey = trusted.length ? bundle.generation + ":" + JSON.stringify(trusted.map(item => item.id)) : "";
    if (pageRun && (pageRun.location !== locationKey() || pageRun.key !== trustedKey)) {
      frame?.remove();
      reloadDocument();
      return;
    }

    const sandboxed = selected.filter(item => item.context === "sandbox");
    const nextSandboxKey = sandboxed.length ? JSON.stringify(sandboxed.map(item => item.id)) : "";
    if (sandboxKey !== nextSandboxKey) {
      frame?.remove();
      sandboxKey = nextSandboxKey;
      frame = sandboxed.length ? makeSandbox(sandboxed, language) : undefined;
    }

    if (trusted.length && !pageRun) {
      pageRun = { key: trustedKey, location: locationKey(), cancel: new AbortController() };
      void runTrustedScripts(trusted, pageRun.cancel.signal);
    }
  };

  const storageChanged = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) update();
  };
  const historyChanged = (event: PopStateEvent) => {
    if (pageRun && pageRun.location !== locationKey()) {
      event.stopImmediatePropagation();
      reloadDocument();
    }
  };
  const restored = (event: PageTransitionEvent) => {
    if (event.persisted && pageRun) reloadDocument();
    else update();
  };

  const initial = window.setTimeout(update, 0);
  window.addEventListener(consentChangedEvent, update);
  window.addEventListener("storage", storageChanged);
  window.addEventListener("popstate", historyChanged, true);
  window.addEventListener("pageshow", restored);

  return () => {
    mounts -= 1;
    window.clearTimeout(initial);
    frame?.remove();
    window.removeEventListener(consentChangedEvent, update);
    window.removeEventListener("storage", storageChanged);
    window.removeEventListener("popstate", historyChanged, true);
    window.removeEventListener("pageshow", restored);
    queueMicrotask(() => {
      if (pageRun && (!mounts || pageRun.location !== locationKey())) reloadDocument();
    });
  };
}
