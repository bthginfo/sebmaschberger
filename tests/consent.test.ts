import assert from "node:assert/strict";
import test from "node:test";
import { seedContent } from "../src/data/seed";
import { configuredConsentBanner, consentBanner, consentLegalLinks, consentScriptDefinitionKey, publicConsentScriptPage, secureScriptUrl, type ConsentScript } from "../src/lib/consent/model";
import { consentedScripts } from "../src/lib/consent/runtime";
import { consentConfigSchema } from "../src/lib/consent/validation";
import type { Consent } from "../src/lib/analytics/consent-state";

const script: ConsentScript = {
  id: "stats", name: "Stats", category: "analytics", enabled: true, context: "sandbox", kind: "url", source: "https://stats.example.com/script.js",
};
const oldChoice: Consent = { version: 1, necessary: true, analytics: true, external: false, savedAt: "2026-11-11T00:00:00.000Z" };

test("consent preserves old stored categories and requires a choice for current script definitions", () => {
  const marketing = { ...script, id: "marketing", category: "marketing", context: "page" } as const;
  const bundle = { generation: "current", items: [script, marketing] };
  const consent = { ...oldChoice, scriptsGeneration: bundle.generation };
  assert.deepEqual(consentedScripts(bundle, oldChoice), []);
  assert.deepEqual(consentedScripts(bundle, consent), [script]);
  assert.deepEqual(consentedScripts(bundle, { ...consent, marketing: true }), [script, marketing]);
  assert.deepEqual(consentedScripts(bundle, { ...consent, analytics: false }), []);
  assert.deepEqual(consentedScripts({ ...bundle, generation: "changed" }, consent), []);
  assert.notEqual(consentScriptDefinitionKey([script, marketing]), consentScriptDefinitionKey([marketing, script]));
  assert.notEqual(consentScriptDefinitionKey([script]), consentScriptDefinitionKey([{ ...script, source: script.source + "?v=2" }]));
});

test("only named valid enabled scripts can be saved", () => {
  const consent = { ...seedContent.config.consent, enabled: true };
  assert.equal(secureScriptUrl("https://example.com/tag.js"), "https://example.com/tag.js");
  for (const unsafe of ["http://example.com/tag.js", "//example.com/tag.js", "https://name:secret@example.com/tag.js", "javascript:alert(1)"]) {
    assert.equal(secureScriptUrl(unsafe), null);
    assert.equal(consentConfigSchema.safeParse({ ...consent, scripts: [{ ...script, source: unsafe }] }).success, false);
  }
  assert.equal(consentConfigSchema.safeParse({ ...consent, scripts: [script] }).success, true);
  assert.equal(consentConfigSchema.safeParse({ ...consent, scripts: [script, script] }).success, false);
  assert.equal(consentConfigSchema.safeParse({ ...consent, scripts: [{ ...script, name: "", source: "" }] }).success, false);
  assert.equal(consentConfigSchema.safeParse({ ...consent, scripts: [{ ...script, enabled: false, name: "", source: "" }] }).success, true);
  assert.equal(consentConfigSchema.safeParse({ ...consent, scripts: [{ ...script, kind: "inline", source: "" }] }).success, false);
});

test("published site consent skips private paths and cart content", () => {
  const page = { ...seedContent.pages[0], sections: [], seo: { title: "", description: "" } };
  assert.equal(publicConsentScriptPage({ ...page, slug: "en/about" }), true);
  for (const slug of ["checkout/ergebnis", "en/members", "preview/first", "admin", "demo/starter", "en/account", "shop/cart", "en/projektfreigabe"]) {
    assert.equal(publicConsentScriptPage({ ...page, slug }), false, slug);
  }
  assert.equal(publicConsentScriptPage({ ...page, seo: { ...page.seo, noindex: true } }), false);
  assert.equal(publicConsentScriptPage({
    ...page, sections: [{ ...seedContent.pages[0].sections[0], type: "creator-shop", visible: true, content: { heading: "Basket", caption: "cart" } }],
  }), false);
});

test("banner copy and legal links follow the page locale and honor legacy translations", () => {
  const site = structuredClone(seedContent.config);
  site.consent.title = "Deutsch";
  site.consent.text = "Text auf Deutsch";
  site.consent.english = undefined;
  site.locales = undefined;
  assert.equal(consentBanner(site, "de").title, "Deutsch");
  assert.equal(consentBanner(site, "en").title, "Cookie settings");
  site.locales = { en: { tagline: "", navigation: [], footerText: "", openingHours: [], consent: { title: "Legacy English", text: "Legacy copy" } } };
  assert.equal(configuredConsentBanner(site, "en").title, "Legacy English");
  site.consent.english = { title: "Edited English", text: "" };
  assert.equal(consentBanner(site, "en").title, "Edited English");
  assert.equal(consentBanner(site, "en").text, "Choose which optional services this website may load.");
  site.footer = undefined;
  assert.deepEqual(consentLegalLinks(site, "en", [{ slug: "datenschutz" }, { slug: "en/privacy" }]), [{ href: "/en/privacy", label: "Privacy" }]);
});
