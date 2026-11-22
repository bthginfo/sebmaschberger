"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, Check, ChevronDown, Copy, Plus, RotateCcw } from "lucide-react";
import type { ContentItem, CreatorRemixModule } from "@/lib/types";
import type { CreatorSectionProps } from "@/lib/creator/types";
import { remixInquiryHref, remixMessage, remixModules, selectedRemixModules } from "@/lib/creator/remix";
import { ContentLink, EditableChoice, EditableText } from "@/components/site/editable";
import { ContentIcon } from "@/components/site/content-icon";
import { useSectionHeadingLevel } from "@/components/site/heading-level";
import { creatorCopy, updateCreatorItem } from "../marketing/creator-copy";
import { CreatorPhoto } from "../marketing/creator-photo";
import { useFlipMotion } from "../motion/creator-motion";
import styles from "./remix.module.css";

export function CreatorRemix({ section, editable, onChange }: CreatorSectionProps) {
  const c = section.content, ui = creatorCopy(section), heading = useSectionHeadingLevel(section.id);
  const items = c.items ?? [], modules = remixModules(items), presets = items.filter(item => item.remixSelection).slice(0, 4);
  const initial = presets.find(item => item.tags?.includes("default"))?.remixSelection ?? presets[0]?.remixSelection ?? modules.slice(0, 2).map(item => item.remixModule!);
  const [chosen, setSelection] = useState<CreatorRemixModule[]>(initial);
  const selection = editable ? initial : chosen;
  const [notice, setNotice] = useState("");
  const root = useRef<HTMLDivElement>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageId = useId();
  const active = selectedRemixModules(items, selection), revision = active.map(item => item.id).join("|");
  useFlipMotion(root, revision, Boolean(editable));
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const update = (key: string, value: unknown) => onChange?.({ ...section, content: { ...c, [key]: value } });
  const editItem = (item: ContentItem, patch: Partial<ContentItem>) => onChange?.(updateCreatorItem(section, items.indexOf(item), patch));
  const announce = (value: string) => { setNotice(value); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setNotice(""), 3500); };
  const choose = (next: CreatorRemixModule[]) => { if (editable) return; setSelection(next); announce(ui("changed")); };
  const toggle = (key: CreatorRemixModule) => choose(selection.includes(key) ? selection.filter(value => value !== key) : [...selection, key]);
  const preset = presets.find(item => item.remixSelection?.length === active.length && item.remixSelection.every(key => active.some(module => module.remixModule === key)));
  const message = remixMessage(items, selection, ui("summaryIntro"), ui("summaryOutro"));
  const inquiryHref = remixInquiryHref(c.primaryHref, ui("inquirySubject"), message);
  const copy = async () => { try { await navigator.clipboard.writeText(message); announce(ui("copied")); } catch { announce(ui("copyError")); } };
  return <div ref={root} className={styles.remix} data-motion={editable ? "off" : "remix"}>
    <div className={styles.layout}>
      <div className={styles.controls}>
        <header className={styles.intro}><EditableText as={heading} value={c.heading} editable={editable} onChange={value => update("heading", value)} /><EditableText as="p" value={c.text} editable={editable} onChange={value => update("text", value)} /></header>
        <div className={styles.choices} role="group" aria-label={ui("choose")}>
          {modules.map(item => <EditableChoice key={item.id} editable={editable} type="button" onChoose={() => toggle(item.remixModule!)} aria-pressed={selection.includes(item.remixModule!)} aria-controls={stageId} className={styles.choice} data-item-id={item.id}>
            <ContentIcon name={item.icon} size={20} /><EditableText as="span" value={item.label || item.title} editable={editable} onChange={value => editItem(item, item.label ? { label: value } : { title: value })} /><span className={styles.check} aria-hidden="true">{selection.includes(item.remixModule!) ? <Check size={16} /> : <Plus size={16} />}</span>
          </EditableChoice>)}
        </div>
        {c.primaryLabel && <ContentLink href={inquiryHref} editable={editable} className={styles.inquiry}><EditableText as="span" value={c.primaryLabel} editable={editable} onChange={value => update("primaryLabel", value)} /><ArrowUpRight size={22} /></ContentLink>}
        <details className={styles.utilities}><summary>{ui("options")}<ChevronDown size={14} /></summary><div>
          <label><span>{ui("presets")}</span><select value={preset?.id ?? ""} disabled={editable} onChange={event => { const value = presets.find(item => item.id === event.target.value); if (value?.remixSelection) choose(value.remixSelection); }}><option value="" disabled>{ui("custom")}</option>{presets.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <button type="button" disabled={editable} onClick={() => { setSelection(initial); announce(ui("resetDone")); }}><RotateCcw size={14} />{c.secondaryLabel}</button><button type="button" onClick={() => void copy()} disabled={editable || !active.length}><Copy size={14} />{ui("copy")}</button>
        </div></details>
      </div>
      <div className={styles.preview} aria-label={ui("preview")}>
        <div id={stageId} className={styles.stage} data-count={active.length}>
          {active.length ? active.map(item => <article key={item.id} data-flip-key={item.id} data-module={item.remixModule} className={styles.module}>
            {item.image && <CreatorPhoto image={item.image} className={styles.moduleImage} sizes="(max-width: 700px) 85vw, 40vw" editable={editable} onChange={value => editItem(item, { image: value })} />}
            <div className={styles.moduleCopy}><ContentIcon name={item.icon} size={22} />{item.href ? <ContentLink href={item.href} editField="href" editItemId={item.id} editable={editable}><EditableText as="span" value={item.label || item.title} editable={editable} onChange={value => editItem(item, item.label ? { label: value } : { title: value })} /><ArrowUpRight size={18} /></ContentLink> : <EditableText as="span" value={item.label || item.title} editable={editable} onChange={value => editItem(item, item.label ? { label: value } : { title: value })} />}</div>
          </article>) : <div className={styles.empty}><Plus size={28} /><p>{ui("emptyTitle")}</p><span>{ui("emptyText")}</span></div>}
        </div>
        <EditableText as="p" value={c.caption} editable={editable} onChange={value => update("caption", value)} className={styles.caption} />
      </div>
    </div>
    <p role="status" aria-live="polite" aria-atomic="true" className={styles.notice}>{notice}</p>
    <noscript><p>{c.text}</p><a href={c.primaryHref}>{c.primaryLabel}</a></noscript>
  </div>;
}
