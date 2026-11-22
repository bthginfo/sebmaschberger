"use client";

import type { LiquidGlassSettings, SiteConfig } from "@/lib/types";
import { applyLiquidGlass, liquidGlassSettings } from "@/lib/liquid-glass.mjs";
import { useAdminLanguage } from "./admin-language";
import { Button, Field, Select, Toggle } from "./admin-ui";

export function LiquidGlassEditor({ config, onChange }: { config: SiteConfig; onChange: (config: SiteConfig) => void }) {
  const { t } = useAdminLanguage();
  const selected = config.theme.aesthetic === "liquid-glass" && (config.designVariant ?? 1) === 1;
  const settings = liquidGlassSettings(config.theme.glass);
  const update = (patch: Partial<LiquidGlassSettings>) => onChange({ ...config, theme: { ...config.theme, glass: { ...settings, ...patch } } });
  const range = (label: string, key: "intensity" | "speed" | "depth" | "revealDuration", min = 0, max = 100, step = 1) => <Field label={t(label)} hint={`${settings[key]}${key === "revealDuration" ? " ms" : " %"}`}><input type="range" min={min} max={max} step={step} value={settings[key]} onChange={event => update({ [key]: Number(event.target.value) })} style={{ width: "100%" }} /></Field>;
  return <div className="cms-form-section" data-liquid-glass-editor="">
    <h3>{t("Look & räumliche Tiefe")}</h3>
    <Field label={t("Visueller Stil")} hint={t("Liquid Glass ergänzt Panorama. Inhalte und Profil bleiben erhalten; Speichern und Veröffentlichen geben den Entwurf frei.")}>
      <Select value={selected ? "liquid-glass" : "standard"} onChange={event => onChange(event.target.value === "liquid-glass" ? applyLiquidGlass(config) : { ...config, theme: { ...config.theme, aesthetic: "standard" } })}>
        <option value="standard">{t("Stil des gewählten Entwurfs")}</option><option value="liquid-glass">Liquid Glass · iOS</option>
      </Select>
    </Field>
    {selected && <>
      <p>{t("Transparente Glasflächen, feine Lichtkanten und weiche Schatten heben Inhalte vom ruhigen Hintergrund ab. Farben bleiben in der Palette bearbeitbar.")}</p>
      <Toggle label={t("Räumliche Bewegung aktivieren")} checked={settings.enabled} onChange={enabled => update({ enabled })} />
      <Field label={t("Atmosphäre im Hintergrund")}><Select value={settings.background} onChange={event => update({ background: event.target.value as LiquidGlassSettings["background"] })}><option value="aurora">{t("Weiche Lichtnebel")}</option><option value="space">{t("Dezente Sterne")}</option><option value="none">{t("Ohne Hintergrundeffekt")}</option></Select></Field>
      {range("Stärke der Atmosphäre", "intensity")}{range("Tempo der Atmosphäre", "speed")}{range("Räumliche Scrolltiefe", "depth")}
      <Toggle label={t("Texte und Karten sanft einblenden")} checked={settings.reveal} onChange={reveal => update({ reveal })} />
      {range("Dauer der Einblendung", "revealDuration", 350, 1400, 50)}
      <Toggle label={t("Sanftes Feedback bei Interaktionen")} checked={settings.feedback} onChange={feedback => update({ feedback })} />
      <Button variant="quiet" onClick={() => onChange(applyLiquidGlass(config))}>{t("Dunkle Glasfarben übernehmen")}</Button>
      <p>{t("Reduzierte Bewegung wird berücksichtigt. In der Bearbeitung bleibt die Vorschau ruhig. Ohne Liquid Glass bleiben die übrigen Gestaltungen unverändert.")}</p>
    </>}
  </div>;
}
