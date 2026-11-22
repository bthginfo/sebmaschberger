"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import type { CreatorSectionProps } from "@/lib/creator/types";
import type { ContentItem } from "@/lib/types";
import { ContentLink, EditableText } from "@/components/site/editable";
import { useSectionHeadingLevel } from "@/components/site/heading-level";
import { CreatorBrowserFrame } from "../marketing/creator-browser-frame";
import { creatorCopy, itemCopy, updateCreatorItem } from "../marketing/creator-copy";
import { HeroCanvas, type HeroPreset } from "./hero-canvas";
import { useEditorialMotion } from "../motion/creator-motion";
import styles from "./heroes.module.css";

export function CreatorHeroStack({ section, editable, onChange }: CreatorSectionProps) {
  const c = section.content, ui = creatorCopy(section);
  const items = c.items?.filter(item => !item.tags?.includes("ui")) ?? [];
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [outgoing, setOutgoing] = useState<{ item: ContentItem; token: number } | null>(null);
  const sequence = useRef(0), exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const motionRoot = useRef<HTMLDivElement>(null);
  useEditorialMotion(motionRoot, Boolean(editable), section.id);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const headingLevel = useSectionHeadingLevel(section.id);
  const current = items[index] ?? items[0];
  const update = (key: string, value: unknown) => onChange?.({ ...section, content: { ...c, [key]: value } });
  const move = (next: number) => {
    if (!items.length) return;
    const normalized = (next + items.length) % items.length;
    if (normalized === index) return;
    if (exitTimer.current) clearTimeout(exitTimer.current);
    setDirection(next > index ? 1 : -1);
    if (!editable && !window.matchMedia("(prefers-reduced-motion: reduce)").matches && current) {
      sequence.current += 1; setOutgoing({ item: current, token: sequence.current });
      exitTimer.current = setTimeout(() => setOutgoing(null), 720);
    } else setOutgoing(null);
    setIndex(normalized);
  };
  useEffect(() => () => { if (exitTimer.current) clearTimeout(exitTimer.current); }, []);
  const updateItem = (patch: Parameters<typeof updateCreatorItem>[2]) => { const original = c.items?.findIndex(item => item.id === current?.id) ?? -1; if (original >= 0) onChange?.(updateCreatorItem(section, original, patch)); };
  return <div ref={motionRoot} className={styles.showcase} data-motion={editable ? "off" : "gallery"}>
    <div className={styles.showcaseIntro} data-creator-reveal="section"><EditableText as={headingLevel} value={c.heading} editable={editable} onChange={value => update("heading", value)} /><EditableText as="p" value={c.text} editable={editable} onChange={value => update("text", value)} /></div>
    <div className={styles.stackControls}><div className={styles.categories} role="tablist" aria-label={ui("categoryLabel")}>{items.map((item, n) => <button key={item.id} style={{minHeight:44,minWidth:44}} role="tab" aria-selected={n === index} aria-controls={`${section.id}-canvas`} id={`${section.id}-tab-${n}`} tabIndex={n === index ? 0 : -1} onClick={() => move(n)} onKeyDown={event => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); const step = event.key === "ArrowRight" ? 1 : -1; const next = (n + step + items.length) % items.length; move(n + step); document.getElementById(`${section.id}-tab-${next}`)?.focus(); } if (event.key === "Home" || event.key === "End") { event.preventDefault(); const next = event.key === "Home" ? 0 : items.length - 1; move(next); document.getElementById(`${section.id}-tab-${next}`)?.focus(); } }}>{itemCopy(item)("category")}</button>)}</div><div className={styles.stackArrows}><span aria-live="polite">{String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</span><button type="button" style={{minHeight:44,minWidth:44}} aria-label={ui("previous")} onClick={() => move(index - 1)}><ArrowLeft size={21} /></button><button type="button" style={{minHeight:44,minWidth:44}} aria-label={ui("next")} onClick={() => move(index + 1)}><ArrowRight size={21} /></button></div></div>
    {current && <div className={styles.stackStage} onTouchStart={event => { if ((event.target as Element).closest("audio,video,button,a,input,select,[contenteditable]")) { touch.current = null; return; } touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }} onTouchEnd={event => { const start = touch.current; touch.current = null; if (!start) return; const delta = start.x - event.changedTouches[0].clientX, vertical = start.y - event.changedTouches[0].clientY; if (Math.abs(delta) > 55 && Math.abs(delta) > Math.abs(vertical) * 1.15) move(index + (delta > 0 ? 1 : -1)); }}>
      <div className={styles.stackBehind} aria-hidden="true" /><div className={styles.stackBehindSecond} aria-hidden="true" />
      <CreatorBrowserFrame className={styles.galleryFrame} editable={editable} title={`${current.title} — ${itemCopy(current)("category")}`} caption={ui("galleryCaption")} expandLabel={ui("expandHero")} collapseLabel={ui("collapse")}>
        <div className={`${styles.stackWindow} ${direction < 0 ? styles.slideBack : ""}`} style={{ "--stack-direction": direction } as CSSProperties} data-creator-hero-gallery="" data-motion={editable ? "off" : outgoing ? "stack" : "rest"}>
        <div id={`${section.id}-canvas`} role="tabpanel" aria-labelledby={`${section.id}-tab-${index}`} className={styles.stackSlide} key={current.id}>
          <HeroCanvas gallery preset={current.tags?.[0] as HeroPreset} creator={current.title} title={current.text} description={current.meta} image={current.image} cta={current.label} href={current.href} ui={itemCopy(current)} editable={editable} onCreator={value => updateItem({ title: value })} onTitle={value => updateItem({ text: value })} onDescription={value => updateItem({ meta: value })} onImage={value => updateItem({ image: value })} onCta={value => updateItem({ label: value })} />
        </div>
        {outgoing && <div key={`out-${outgoing.token}`} className={styles.stackOutgoing} aria-hidden="true" inert data-motion="ghost"><HeroCanvas gallery preset={outgoing.item.tags?.[0] as HeroPreset} creator={outgoing.item.title} title={outgoing.item.text} description={outgoing.item.meta} image={outgoing.item.image} cta={outgoing.item.label} href={outgoing.item.href} ui={itemCopy(outgoing.item)} /></div>}
        </div>
      </CreatorBrowserFrame>
    </div>}
    {c.primaryLabel && <ContentLink href={c.primaryHref} editField="primaryHref" editable={editable} className={styles.showcaseAction}><EditableText as="span" value={c.primaryLabel} editable={editable} onChange={value => update("primaryLabel", value)} /><ArrowUpRight size={22} /></ContentLink>}
  </div>;
}
