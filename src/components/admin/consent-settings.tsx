"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Code2, Plus, Trash2 } from "lucide-react";
import { useAdminLanguage } from "./admin-language";
import { Button, Field, IconButton, Input, Notice, Select, Textarea, Toggle } from "./admin-ui";
import { configuredConsentBanner, defaultConsentBanner, maxConsentScripts, scriptCategories, secureScriptUrl, type ConsentScript, type ConsentScriptCategory } from "@/lib/consent/model";
import type { SiteConfig, SiteLanguage } from "@/lib/types";
import "./consent-settings.css";

const categoryLabels: Record<ConsentScriptCategory, string> = {
  analytics: "Statistik",
  external: "Externe Medien",
  marketing: "Marketing",
};

export function ConsentSettings({ config, onChange }: { config: SiteConfig; onChange: (config: SiteConfig) => void }) {
  const { language, t } = useAdminLanguage();
  const [copyLanguage, setCopyLanguage] = useState<SiteLanguage>(language);
  const [openScript, setOpenScript] = useState<string | null>(null);
  const copy = configuredConsentBanner(config, copyLanguage);
  const fallback = defaultConsentBanner[copyLanguage];
  const scripts = config.consent.scripts ?? [];
  const active = scripts.filter(script => script.enabled).length;
  const updateConsent = (consent: SiteConfig["consent"]) => onChange({ ...config, consent });
  const replaceScripts = (items: ConsentScript[]) => updateConsent({ ...config.consent, scripts: items });

  function addScript() {
    const id = crypto.randomUUID();
    replaceScripts([...scripts, { id, name: "", enabled: false, category: "analytics", context: "sandbox", kind: "url", source: "" }]);
    setOpenScript(id);
  }

  function moveScript(index: number, direction: -1 | 1) {
    const next = [...scripts];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    replaceScripts(next);
  }

  return <>
    <section className="cms-form-section">
      <h3>{t("Einwilligungsbanner")}</h3>
      <Toggle label={t("Einwilligungsbanner anzeigen")} checked={config.consent.enabled}
        onChange={enabled => updateConsent({ ...config.consent, enabled })}
        hint={t("Besucher wählen, welche optionalen Dienste geladen werden dürfen.")} />
      <div className="cms-consent-copy">
        <div className="cms-tabs" role="group" aria-label={t("Sprache des Bannertexts")}>
          <button type="button" lang="de" aria-pressed={copyLanguage === "de"} onClick={() => setCopyLanguage("de")}>Deutsch</button>
          <button type="button" lang="en" aria-pressed={copyLanguage === "en"} onClick={() => setCopyLanguage("en")}>English</button>
        </div>
        <p className="cms-hint">{t("Leere Felder verwenden den Standardtext in der jeweiligen Seitensprache.")}</p>
        <Field label={t("Titel des Banners")}>
          <Input value={copy.title} maxLength={500} placeholder={fallback.title} onChange={event => {
            const next = { ...copy, title: event.target.value };
            updateConsent(copyLanguage === "de" ? { ...config.consent, ...next } : { ...config.consent, english: next });
          }} />
        </Field>
        <Field label={t("Text des Banners")}>
          <Textarea value={copy.text} maxLength={30000} placeholder={fallback.text} onChange={event => {
            const next = { ...copy, text: event.target.value };
            updateConsent(copyLanguage === "de" ? { ...config.consent, ...next } : { ...config.consent, english: next });
          }} />
        </Field>
      </div>
    </section>
    <section className="cms-form-section">
      <div className="cms-consent-script-heading">
        <div>
          <h3>{t("Zusätzliche Skripte")}</h3>
          <p className="cms-hint">{t("Aktive Skripte laden nach Veröffentlichung und Einwilligung in ihren Zweck.")}</p>
        </div>
        <Button disabled={scripts.length >= maxConsentScripts} onClick={addScript}><Plus size={16} />{t("Skript hinzufügen")}</Button>
      </div>
      {active > 0 && !config.consent.enabled && <Notice>{t("Aktivieren Sie das Einwilligungsbanner, um diese Skripte nach Zustimmung zu laden.")}</Notice>}
      {scripts.length === 0
        ? <p className="cms-consent-empty">{t("Fügen Sie eine HTTPS-Skriptadresse oder JavaScript-Code hinzu.")}</p>
        : <ol className="cms-consent-script-list">
          {scripts.map((script, index) => {
            const expanded = openScript === script.id;
            const panel = "consent-script-" + script.id;
            const name = script.name.trim() || t("Unbenanntes Skript");
            const invalidSource = script.kind === "url"
              ? (script.enabled || Boolean(script.source.trim())) && !secureScriptUrl(script.source.trim())
              : script.enabled && !script.source.trim();
            const update = (changes: Partial<ConsentScript>) =>
              replaceScripts(scripts.map(item => item.id === script.id ? { ...item, ...changes } : item));
            return <li key={script.id} className="cms-consent-script">
              <div className="cms-consent-script-bar">
                <button className="cms-consent-script-toggle" type="button" aria-expanded={expanded} aria-controls={panel}
                  onClick={() => setOpenScript(expanded ? null : script.id)}>
                  <Code2 size={18} aria-hidden="true" />
                  <span><strong>{name}</strong><small>{t(categoryLabels[script.category])} · {script.enabled ? t("Aktiv") : t("Inaktiv")}</small></span>
                  <ChevronDown size={16} aria-hidden="true" />
                </button>
                <div className="cms-consent-script-actions">
                  <IconButton disabled={index === 0} label={t("{name} nach oben verschieben", { name })} onClick={() => moveScript(index, -1)}><ArrowUp size={16} /></IconButton>
                  <IconButton disabled={index === scripts.length - 1} label={t("{name} nach unten verschieben", { name })} onClick={() => moveScript(index, 1)}><ArrowDown size={16} /></IconButton>
                  <IconButton label={t("{name} entfernen", { name })} onClick={() => replaceScripts(scripts.filter(item => item.id !== script.id))}><Trash2 size={16} /></IconButton>
                </div>
              </div>
              {expanded && <div id={panel} className="cms-consent-script-fields">
                <Toggle label={t("Skript aktivieren")} checked={script.enabled} onChange={enabled => update({ enabled })} />
                <div className="cms-form-grid">
                  <Field label={t("Name des Dienstes")} hint={t("Dieser Name ist in den Datenschutzeinstellungen sichtbar.")}>
                    <Input value={script.name} maxLength={120} aria-invalid={script.enabled && !script.name.trim() || undefined}
                      onChange={event => update({ name: event.target.value })} />
                  </Field>
                  <Field label={t("Zweck")}>
                    <Select value={script.category} onChange={event => update({ category: event.target.value as ConsentScriptCategory })}>
                      {scriptCategories.map(category => <option key={category} value={category}>{t(categoryLabels[category])}</option>)}
                    </Select>
                  </Field>
                  <Field label={t("Skriptquelle")}>
                    <Select value={script.kind} onChange={event => update({ kind: event.target.value === "inline" ? "inline" : "url" })}>
                      <option value="url">{t("HTTPS-Adresse")}</option>
                      <option value="inline">{t("JavaScript-Code")}</option>
                    </Select>
                  </Field>
                  <Field label={t("Ausführungskontext")}>
                    <Select value={script.context} onChange={event => update({ context: event.target.value === "page" ? "page" : "sandbox" })}>
                      <option value="sandbox">{t("Isoliert")}</option>
                      <option value="page">{t("Vertrauenswürdig im Seitenkontext")}</option>
                    </Select>
                  </Field>
                </div>
                <p className="cms-hint">{script.context === "sandbox"
                  ? t("Separater Rahmen ohne Zugriff auf die Seite oder ihre Cookies.")
                  : t("Kann auf die öffentliche Seite und ihre Cookies zugreifen. Verwenden Sie nur Code, dem Sie vertrauen. In angemeldeten CMS-Sitzungen bleibt er aus.")}</p>
                {script.kind === "url"
                  ? <Field label={t("HTTPS-Skriptadresse")}>
                    <Input type="url" inputMode="url" value={script.source} maxLength={2000} placeholder="https://example.com/service.js" autoComplete="off" spellCheck={false}
                      aria-invalid={invalidSource || undefined} onChange={event => update({ source: event.target.value })} />
                  </Field>
                  : <Field label={t("JavaScript-Code")} hint={t("Nur JavaScript einfügen. Die umgebenden script-Tags sind nicht erforderlich.")}>
                    <Textarea className="cms-consent-code" value={script.source} rows={6} maxLength={20000} spellCheck={false}
                      aria-invalid={invalidSource || undefined} onChange={event => update({ source: event.target.value })} />
                  </Field>}
                {invalidSource && <Notice tone="error">{script.kind === "url"
                  ? t("Geben Sie eine vollständige HTTPS-Skriptadresse ein.")
                  : t("Geben Sie den JavaScript-Code für das aktive Skript ein.")}</Notice>}
              </div>}
            </li>;
          })}
        </ol>}
      {scripts.length > 1 && <p className="cms-hint">{t("Die Reihenfolge gilt je Ausführungskontext.")}</p>}
    </section>
  </>;
}
