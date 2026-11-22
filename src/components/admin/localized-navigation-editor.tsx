"use client";

import { useState } from "react";
import { localizedSite } from "@/lib/site-languages";
import type { SiteConfig, SiteLanguage } from "@/lib/types";
import { Button, Field, IconButton, Input, Plus, Textarea, Trash2 } from "./admin-ui";
import { FooterEditor, NavigationEditor } from "./footer-editor";
import { useAdminLanguage } from "@/components/admin/admin-language";

export function LocalizedNavigationEditor({ config, onChange }: { config: SiteConfig; onChange: (config: SiteConfig) => void }) {
  const { t } = useAdminLanguage();
  const [language, setLanguage] = useState<SiteLanguage>("de");
  const view = localizedSite(config, language);
  function update(next: SiteConfig) {
    if (language === "de") {
      onChange(next);
      return;
    }
    const { tagline, navigation, footerText, openingHours, footer } = next;
    onChange({
      ...config,
      locales: { ...config.locales, en: { ...config.locales?.en, tagline, navigation, footerText, openingHours, footer } },
    });
  }
  return <>
    <div className="cms-tabs" role="group" aria-label={t("Sprache der Navigation und des Fußbereichs")}>
      <button type="button" aria-pressed={language === "de"} onClick={() => setLanguage("de")}>Deutsch</button>
      <button type="button" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>English</button>
    </div>
    <NavigationEditor key={`navigation-${language}`} config={view} onChange={update} />
    <div className="cms-form-section">
      <h3>{t("Vereinsangaben im Fußbereich")}</h3>
      <Field label={t("Zusatzzeile")}><Input value={view.tagline} onChange={event => update({ ...view, tagline: event.target.value })} /></Field>
      <Field label={t("Beschreibung")}><Textarea rows={4} value={view.footerText} onChange={event => update({ ...view, footerText: event.target.value })} /></Field>
    </div>
    <FooterEditor key={`footer-${language}`} config={view} onChange={update} />
    {language === "en" && <>
      <div className="cms-form-section">
        <h3>{t("Englische Trainingszeiten")}</h3>
        {view.openingHours.map((entry, index) => <div className="cms-settings-repeater" key={index}>
          <Field label={t("Tag oder Zeitraum")}><Input value={entry.day} onChange={event => update({ ...view, openingHours: view.openingHours.map((item, position) => position === index ? { ...item, day: event.target.value } : item) })} /></Field>
          <Field label={t("Öffnungszeiten")}><Input value={entry.hours} onChange={event => update({ ...view, openingHours: view.openingHours.map((item, position) => position === index ? { ...item, hours: event.target.value } : item) })} /></Field>
          <IconButton label={t("Zeitraum entfernen")} onClick={() => update({ ...view, openingHours: view.openingHours.filter((_, position) => position !== index) })}><Trash2 size={16} /></IconButton>
        </div>)}
        <Button disabled={view.openingHours.length >= 14} onClick={() => update({ ...view, openingHours: [...view.openingHours, { day: "", hours: "" }] })}><Plus size={16} />{t("Zeitraum hinzufügen")}</Button>
      </div>
    </>}
  </>;
}
