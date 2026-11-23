"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { AlignCenter, AlignLeft, Minus, Plus, RotateCcw } from "lucide-react";
import { CMS_TYPEFACES, cmsAppearanceColor, type CmsAppearance, type CmsTypeface } from "@/lib/cms-typefaces";
import { createSection, defaultDesign, sectionLibrary } from "@/lib/section-library";
import type { Section, SectionDesign } from "@/lib/types";
import { useAdminLanguage } from "./admin-language";
import { initialTextRole, nextCanvasPercent, updateCanvasAppearance, type TextRole } from "./canvas-format-model";
import styles from "./canvas-format-controls.module.css";

interface FormatProps {
  section: Section;
  itemId?: string;
  field?: string;
  textRole?: TextRole;
  onChange: (section: Section) => void;
}

type ColorKey = "headingColor" | "textColor" | "background" | "buttonBackground" | "buttonTextColor" | "secondaryLinkColor";
type Copy = (de: string, en: string) => string;

function Reset({ label, onReset, disabled }: { label: string; onReset: () => void; disabled: boolean }) {
  return <button type="button" className={styles.reset} aria-label={label} title={label} disabled={disabled} onClick={onReset}>
    <RotateCcw size={15} aria-hidden="true" />
  </button>;
}

function Choice<T extends string>({ label, value, choices, onChange }: {
  label: string; value: T; choices: readonly { value: T; label: string; icon?: ReactNode }[]; onChange: (value: T) => void;
}) {
  return <div className={styles.segment} role="group" aria-label={label}>
    {choices.map(choice => <button type="button" key={choice.value} aria-pressed={value === choice.value}
      onClick={() => onChange(choice.value)}>{choice.icon}{choice.label}</button>)}
  </div>;
}

function ColorInput({ label, value, inherited, onChange, copy }: {
  label: string; value?: string; inherited?: string; onChange: (value?: string) => void; copy: Copy;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const [invalid, setInvalid] = useState(false);
  const errorId = useId();
  useEffect(() => { setDraft(value ?? ""); setInvalid(false); }, [value]);
  const visible = value || inherited;
  const native = visible?.length === 4 ? "#" + [...visible.slice(1)].map(char => char + char).join("") : visible?.slice(0, 7);
  const submit = () => {
    const text = draft.trim();
    if (!text || cmsAppearanceColor(text)) { onChange(text || undefined); setInvalid(false); }
    else setInvalid(true);
  };
  return <>
    <div className={styles.colorControl}>
      <label className={styles.swatch} title={label} style={visible ? { background: visible } : undefined}>
        <input type="color" aria-label={copy("Farbwähler", "Colour picker") + " · " + label} value={native || "#395777"}
          onChange={event => { setDraft(event.target.value); setInvalid(false); onChange(event.target.value); }} />
      </label>
      <input className={styles.hex} value={draft} aria-label={label + " · Hex"} spellCheck={false} autoCapitalize="none"
        placeholder={copy("Aus Design", "From design")} maxLength={9} aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined} onChange={event => { setDraft(event.target.value); setInvalid(false); }}
        onBlur={submit} onKeyDown={event => {
          if (event.key === "Enter") { event.preventDefault(); submit(); }
        }} />
      <Reset label={copy("Farbe aus dem Design übernehmen", "Use design colour")} disabled={value === undefined && !draft}
        onReset={() => { setDraft(""); setInvalid(false); onChange(undefined); }} />
    </div>
    {invalid && <p className={styles.error} role="status" id={errorId}>{copy("Hex-Farbe eingeben, z. B. #345678.", "Enter a hex colour, e.g. #345678.")}</p>}
  </>;
}

export function CanvasFormatControls(props: FormatProps) {
  return <FormatScope key={JSON.stringify([props.section.id, props.section.type, props.itemId, props.field, props.textRole])} {...props} />;
}

function FormatScope({ section, itemId, field, textRole, onChange }: FormatProps) {
  const { language } = useAdminLanguage();
  const copy: Copy = (de, en) => language === "en" ? en : de;
  const startingRole = field ? initialTextRole(field) : textRole ?? "heading";
  const [role, setRole] = useState<TextRole>(startingRole);
  const initialColor: ColorKey = field === "primaryLabel" || field === "primaryHref" ? "buttonTextColor"
    : field === "secondaryLabel" || field === "secondaryHref" || field === "href" || field === "label" ? "secondaryLinkColor"
    : startingRole === "heading" ? "headingColor" : "textColor";
  const [color, setColor] = useState<ColorKey>(initialColor);
  const spacingDefault = useMemo(() => itemId === undefined && sectionLibrary.some(entry => entry.type === section.type)
    ? createSection(section.type).design.spacing : defaultDesign.spacing, [section.type, itemId]);
  const item = itemId === undefined ? undefined : section.content.items?.find(entry => entry.id === itemId);
  if (itemId !== undefined && !item) return null;
  if (item && ["creator-social", "motion-story", "scroll-3d"].includes(section.type)) {
    return <p className={styles.specialist}>{copy("Die Einstellungen für diesen Eintrag finden Sie unter „Alle Einstellungen“.","Open All settings to edit this entry’s specialised fields.")}</p>;
  }
  const look = item ? item.appearance ?? {} : section.design;
  const heading = role === "heading";
  const face = heading ? "headingTypeface" : "bodyTypeface";
  const scaleKey = heading ? "headingScale" : "bodyScale";
  const scopeScale = look[scaleKey];
  const inheritedScale = item ? section.design[scaleKey] ?? 1 : 1;
  const percent = Math.round((scopeScale ?? inheritedScale) * 100);
  const min = 75, max = 140;
  const basePercent = Math.round((section.design.fontScale ?? 1) * 100);
  const scaleDescription = copy("Relativ zur Abschnittsgestaltung", "Relative to the section design") + " · " + basePercent + "%";
  const title = copy("Überschrift", "Heading"), body = copy("Fließtext", "Body text");
  const colorRoles: { value: ColorKey; label: string }[] = [
    { value: "headingColor", label: copy("Überschrift", "Heading") },
    { value: "textColor", label: copy("Text", "Text") },
    { value: "background", label: copy("Hintergrund", "Background") },
  ];
  if (initialColor === "buttonTextColor" || !item && section.content.primaryLabel) colorRoles.push(
    { value: "buttonBackground", label: copy("Buttonfläche", "Button fill") },
    { value: "buttonTextColor", label: copy("Buttontext", "Button text") },
  );
  if (initialColor === "secondaryLinkColor" || (item ? item.href : section.content.secondaryLabel))
    colorRoles.push({ value: "secondaryLinkColor", label: copy("Link", "Link") });

  function appearance<K extends keyof CmsAppearance>(key: K, value: CmsAppearance[K]) {
    const next = updateCanvasAppearance(section, itemId, key, value);
    if (next !== section) onChange(next);
  }
  function design<K extends "align" | "spacing">(key: K, value: SectionDesign[K]) {
    if (!item && section.design[key] !== value) onChange({ ...section, design: { ...section.design, [key]: value } });
  }
  function scale(value?: number) {
    appearance(scaleKey, value === 1 ? undefined : value);
  }
  const colorLabel = colorRoles.find(option => option.value === color)!.label;
  const resetText = (label: string) => copy(label + " zurücksetzen", "Reset " + label);
  return <div className={styles.controls}>
    <Choice label={copy("Textstil", "Text style")} value={role} choices={[{value:"heading",label:title},{value:"body",label:body}]}
      onChange={next => { setRole(next); setColor(next === "heading" ? "headingColor" : "textColor"); }} />
    <div className={styles.field}>
      <label className={styles.inlineSelect}><span>{copy("Schrift", "Typeface")}</span>
        <select value={look[face] ?? ""} onChange={event => appearance(face, (event.target.value || undefined) as CmsTypeface | undefined)}>
          <option value="">{copy("Aus Design übernehmen", "Use design typeface")}</option>
          {Object.entries(CMS_TYPEFACES).map(([id, [name]]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </label>
    </div>
    <div className={styles.row}>
      <span>{copy("Größe", "Size")}</span>
      <div className={styles.stepper} role="group" aria-label={copy("Schriftgröße", "Font size")}>
        <button type="button" disabled={percent <= min} aria-label={copy("Schrift verkleinern", "Decrease font size")}
          onClick={() => scale(nextCanvasPercent(percent, -1, min, max, inheritedScale * 100) / 100)}><Minus size={16}/></button>
        <output aria-live="polite" title={scaleDescription}>{percent}%</output>
        <button type="button" disabled={percent >= max} aria-label={copy("Schrift vergrößern", "Increase font size")}
          onClick={() => scale(nextCanvasPercent(percent, 1, min, max, inheritedScale * 100) / 100)}><Plus size={16}/></button>
      </div>
      <Reset label={resetText(copy("Schriftgröße", "font size"))} disabled={scopeScale === undefined} onReset={() => scale()} />
    </div>
    <div className={styles.colors}>
      <label className={styles.inlineSelect}><span>{copy("Farbe für", "Colour for")}</span><select value={color} onChange={event => setColor(event.target.value as ColorKey)}>
        {colorRoles.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select></label>
      <ColorInput key={color} label={colorLabel} value={look[color]} inherited={item ? section.design[color] : undefined}
        onChange={value => appearance(color, value)} copy={copy} />
    </div>
    {!item && <div className={styles.layout}>
      <div className={styles.layoutLine}>
        <span>{copy("Ausrichtung", "Alignment")}</span>
        <Choice label={copy("Ausrichtung", "Alignment")} value={section.design.align} choices={[
          { value: "left", label: copy("Links", "Left"), icon: <AlignLeft size={15} /> },
          { value: "center", label: copy("Mittig", "Centre"), icon: <AlignCenter size={15} /> },
        ]} onChange={next => design("align", next)} />
        <Reset label={resetText(copy("Ausrichtung", "alignment"))} disabled={section.design.align === defaultDesign.align} onReset={() => design("align", defaultDesign.align)} />
      </div>
      <div className={styles.layoutLine}>
        <span>{copy("Abstände", "Spacing")}</span>
        <Choice label={copy("Abstände", "Spacing")} value={section.design.spacing} choices={[
          { value:"compact", label:copy("Eng", "Tight") }, { value:"normal", label:copy("Normal", "Normal") }, { value:"airy", label:copy("Weit", "Loose") },
        ]} onChange={next => design("spacing", next)}/>
        <Reset label={resetText(copy("Abstände", "spacing"))} disabled={section.design.spacing === spacingDefault} onReset={() => design("spacing", spacingDefault)} />
      </div>
    </div>}
  </div>;
}
