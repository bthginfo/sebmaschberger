"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { ChevronUp, Image as ImageIcon, Link2, Pencil, Settings2, SlidersHorizontal, Type, X } from "lucide-react";
import type { Section } from "@/lib/types";
import { useAdminLanguage } from "./admin-language";
import { CanvasFormatControls } from "./canvas-format-controls";
import styles from "./private-canvas-tools.module.css";

export type CanvasSelection = { sectionId: string; itemId?: string; field?: string; textRole?: "heading" | "body" };
type Props = {
  stage: RefObject<HTMLDivElement | null>;
  section: Section;
  selection?: CanvasSelection;
  lockedContent: boolean;
  lockedFormat: boolean;
  lockedLinks: boolean;
  onSection: () => void;
  onSettings: (tab: "content" | "design") => void;
  onChange: (section: Section) => void;
};
type Action = { node: HTMLElement; kind: "text" | "image" | "link"; label: string };

function contentActions(stage: HTMLElement | null, sectionId: string, itemId: string | undefined, labels: Record<Action["kind"], string>): Action[] {
  const section = stage?.querySelector<HTMLElement>(`[data-section-id="${CSS.escape(sectionId)}"]`);
  if (!section) return [];
  const result: Action[] = [];
  for (const node of section.querySelectorAll<HTMLElement>('[contenteditable="true"], .ws-image-edit-button, [data-canvas-link]')) {
    if (!node.getClientRects().length || node.closest("dialog, [data-canvas-tools]")) continue;
    const entry = node.closest<HTMLElement>("[data-item-id]")?.dataset.itemId ?? node.dataset.canvasLinkItem;
    if (entry !== itemId) continue;
    if (node.matches('[contenteditable="true"]')) result.push({ node, kind: "text", label: node.textContent?.trim() || node.getAttribute("aria-label") || labels.text });
    else if (node.hasAttribute("data-canvas-link")) {
      const label = node.parentElement?.querySelector<HTMLElement>('[contenteditable="true"]')?.textContent?.trim();
      result.push({ node, kind: "link", label: label || labels.link });
    } else {
      const figure = node.closest("figure");
      result.push({ node, kind: "image", label: figure?.querySelector("img")?.alt.trim() || node.textContent?.trim() || labels.image });
    }
  }
  return result;
}

export function PrivateCanvasTools({ stage, section, selection, lockedContent, lockedFormat, lockedLinks, onSection, onSettings, onChange }: Props) {
  const { language } = useAdminLanguage();
  const en = language === "en";
  const [panel, setPanel] = useState<"content" | "design" | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const root = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const uid = useId();
  const item = selection?.itemId ? section.content.items?.find(value => value.id === selection.itemId) : undefined;
  const itemName = item?.title || (en ? "Entry" : "Eintrag");
  const sectionName = section.name || (en ? "Section" : "Abschnitt");
  const title = item ? itemName : sectionName;
  const settings = en ? "All settings" : "Alle Einstellungen";
  const content = en ? "Content" : "Inhalt";
  const scope = item ? (en ? "Entry" : "Eintrag") : (en ? "Section" : "Abschnitt");
  const actionLabels = { text: "Text", image: en ? "Image" : "Bild", link: "Link" };
  function close(restore = false) {
    setPanel(null);
    if (restore) opener.current?.focus({ preventScroll: true });
  }
  function open(next: "content" | "design", trigger: HTMLButtonElement) {
    if (panel === next) { close(true); return; }
    if (next === "content") setActions(contentActions(stage.current, section.id, item?.id, actionLabels).filter(action => !lockedLinks || action.kind !== "link"));
    opener.current = trigger;
    setPanel(next);
  }
  useLayoutEffect(() => {
    const anchor = root.current;
    const flyout = surface.current;
    if (!panel || !anchor || !flyout) return;
    function position() {
      if (!anchor || !flyout) return;
      const rect = anchor.getBoundingClientRect();
      flyout.style.setProperty("--tool-top", `${rect.bottom + 4}px`);
      flyout.style.setProperty("--tool-right", `${Math.max(6, document.documentElement.clientWidth - rect.right + 6)}px`);
      flyout.style.setProperty("--tool-width", `${Math.max(1,rect.width - 12)}px`);
    }
    position();
    flyout.showPopover?.();
    const observer = new ResizeObserver(position);
    observer.observe(anchor);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [panel]);
  useEffect(() => {
    if (!panel) return;
    heading.current?.focus({ preventScroll: true });
    const outside = (event: Event) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setPanel(null);
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("focusin", outside);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("focusin", outside);
    };
  }, [panel]);
  function activate(action: Action) {
    close();
    if (!action.node.isConnected) { onSettings("content"); return; }
    action.node.scrollIntoView({block:"nearest",inline:"nearest",behavior:"instant"});
    action.node.focus({preventScroll:true});
    if (action.kind !== "text") action.node.click();
  }
  return <div className={styles.tools} ref={root} onKeyDown={event => {
    if (event.key === "Escape" && panel) { event.preventDefault(); event.stopPropagation(); close(true); }
  }}>
    <div className={styles.bar} role="group" aria-label={en ? "Edit selection" : "Auswahl bearbeiten"}>
      {item && <button type="button" className={styles.icon} onClick={onSection} title={en ? "Select parent section" : "Übergeordneten Abschnitt auswählen"} aria-label={en ? "Select parent section" : "Übergeordneten Abschnitt auswählen"}><ChevronUp size={18}/></button>}
      <div className={styles.target}><span>{scope}</span><strong title={title}>{title}</strong></div>
      {!lockedContent && <button className={styles.tab} data-private-canvas-content aria-expanded={panel === "content"} aria-controls={panel === "content" ? uid : undefined} type="button" onClick={event=>open("content",event.currentTarget)}><Pencil size={16}/>{content}</button>}
      {!lockedFormat && <button className={styles.tab} aria-expanded={panel === "design"} aria-controls={panel === "design" ? uid : undefined} type="button" onClick={event=>open("design",event.currentTarget)}><SlidersHorizontal size={16}/>Format</button>}
      <button type="button" className={lockedContent && lockedFormat ? styles.tab : styles.icon} title={settings} aria-label={settings} onClick={()=>{close();onSettings("content");}}><Settings2 size={18}/>{lockedContent && lockedFormat && settings}</button>
    </div>
    {panel && <section ref={surface} popover="manual" className={styles.panel} id={uid} aria-labelledby={uid + "-title"}>
      <div className={styles.panelHead}><div><h3 ref={heading} id={uid + "-title"} tabIndex={-1}>{panel === "design" ? "Format" : content}</h3><span>{title}</span></div><button type="button" className={styles.icon} aria-label={en ? "Close" : "Schließen"} onClick={()=>close(true)}><X size={18}/></button></div>
      <div className={styles.body}>{panel === "design" ? <CanvasFormatControls section={section} itemId={selection?.itemId} field={selection?.field} textRole={selection?.textRole} onChange={onChange}/> : actions.length ? <ul className={styles.list}>{actions.map((action,index) => {
        const Icon = action.kind === "text" ? Type : action.kind === "image" ? ImageIcon : Link2;
        return <li key={index}><button type="button" onClick={()=>activate(action)}><Icon size={17} aria-hidden="true"/><span><small>{actionLabels[action.kind]}</small><strong>{action.label}</strong></span></button></li>;
      })}</ul> : <p>{en ? "Edit this content in the settings." : "Diesen Inhalt bearbeiten Sie in den Einstellungen."}</p>}</div>
      <button type="button" className={styles.settings} onClick={()=>{close();onSettings(panel);}}><Settings2 size={16}/>{settings}</button>
    </section>}
  </div>;
}
