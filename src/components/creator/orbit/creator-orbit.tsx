"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ArrowUpRight, Maximize2, Minimize2 } from "lucide-react";
import type { ContentItem } from "@/lib/types";
import type { CreatorSectionProps } from "@/lib/creator/types";
import { ContentLink, EditableChoice, EditableText } from "@/components/site/editable";
import { useSectionHeadingLevel } from "@/components/site/heading-level";
import { creatorCopy, updateCreatorItem } from "../marketing/creator-copy";
import { CreatorPhoto } from "../marketing/creator-photo";
import styles from "./orbit.module.css";

type CardPosition = { rect: DOMRect; surfaceTransform: string };
type RunningMotion = { animation: Animation; node: HTMLElement };

/** The same content cards become a single composition; touch stays native page scrolling. */
export function CreatorOrbit({ section, editable = false, onChange }: CreatorSectionProps) {
  const c = section.content, ui = creatorCopy(section), heading = useSectionHeadingLevel(section.id);
  const items = c.items ?? [], cards = items.filter(item => !item.tags?.includes("ui")).slice(0, 6);
  const [selectedId, setSelectedId] = useState(() => cards[1]?.id ?? cards[0]?.id ?? "");
  const [gathered, setGathered] = useState(false);
  const active = cards.find(item => item.id === selectedId) ?? cards[0];
  const root = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null);
  const previous = useRef(new Map<string, CardPosition>()), running = useRef<RunningMotion[]>([]);
  const visible = useRef(true), stageId = useId(), statusId = useId();
  const update = (key: string, value: string) => onChange?.({ ...section, content: { ...c, [key]: value } });
  const editItem = (item: ContentItem, patch: Partial<ContentItem>) => onChange?.(updateCreatorItem(section, items.indexOf(item), patch));

  const stopMotion = useCallback(() => {
    running.current.forEach(({ animation, node }) => { animation.cancel(); node.style.removeProperty("will-change"); });
    running.current = [];
  }, []);

  // Capture the current painted position, including an interrupted transition.
  const capture = () => {
    const positions = new Map<string, CardPosition>();
    stage.current?.querySelectorAll<HTMLElement>("[data-orbit-card]").forEach(node => {
      const surface = node.querySelector<HTMLElement>("[data-orbit-surface]");
      if (surface) positions.set(node.dataset.orbitCard!, { rect: node.getBoundingClientRect(), surfaceTransform: getComputedStyle(surface).transform });
    });
    previous.current = positions;
  };
  const choose = (id: string) => { if (!editable && id !== active?.id) { capture(); setSelectedId(id); } };
  const compose = () => { if (!editable) { capture(); setGathered(value => !value); } };

  useEffect(() => {
    const host = root.current;
    if (!host) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stopWhenHidden = () => { if (document.hidden || preference.matches) stopMotion(); };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
      visible.current = entries[0]?.isIntersecting ?? true;
      if (!visible.current) stopMotion();
    }, { threshold: 0 });
    observer?.observe(host);
    document.addEventListener("visibilitychange", stopWhenHidden);
    preference.addEventListener("change", stopWhenHidden);
    return () => { observer?.disconnect(); document.removeEventListener("visibilitychange", stopWhenHidden); preference.removeEventListener("change", stopWhenHidden); stopMotion(); };
  }, [stopMotion]);

  useLayoutEffect(() => {
    const from = previous.current;
    previous.current = new Map();
    stopMotion();
    if (!stage.current || editable || !from.size || !visible.current || document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const play = (node: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions) => {
      if (typeof node.animate !== "function") return;
      node.style.willChange = "transform";
      const animation = node.animate(frames, options), motion = { animation, node };
      running.current.push(motion);
      animation.onfinish = () => { node.style.removeProperty("will-change"); running.current = running.current.filter(value => value !== motion); };
    };
    stage.current.querySelectorAll<HTMLElement>("[data-orbit-card]").forEach((node, index) => {
      const before = from.get(node.dataset.orbitCard!), surface = node.querySelector<HTMLElement>("[data-orbit-surface]");
      if (!before || !surface) return;
      const after = node.getBoundingClientRect(), dx = before.rect.left - after.left, dy = before.rect.top - after.top;
      const sx = before.rect.width / Math.max(1, after.width), sy = before.rect.height / Math.max(1, after.height);
      const moved = Math.abs(dx) + Math.abs(dy) + Math.abs(1 - sx) * 100 + Math.abs(1 - sy) * 100 > 1;
      const duration = gathered ? 760 : 620, delay = moved ? Math.min(index * 32, 150) : 0;
      const timing = { duration: moved ? duration : 350, delay, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" as FillMode };
      if (moved) play(node, [
        { transform: `translate3d(${dx}px,${dy}px,0) scale(${sx},${sy})` },
        { transform: `translate3d(${-dx * .018}px,${-dy * .018}px,0) scale(1.008,1.008)`, offset: .84 },
        { transform: "translate3d(0,0,0) scale(1,1)" },
      ], timing);
      const nextTransform = getComputedStyle(surface).transform;
      if (before.surfaceTransform !== nextTransform) play(surface, [{ transform: before.surfaceTransform }, { transform: nextTransform }], timing);
    });
  }, [gathered, active?.id, cards.length, editable, stopMotion]);

  return <div ref={root} className={styles.orbit} data-orbit="" data-gathered={gathered} data-motion={editable ? "off" : "orbit"}>
    <header className={styles.intro}>
      <EditableText as={heading} value={c.heading} editable={editable} onChange={value => update("heading", value)} />
      <EditableText as="p" value={c.text} editable={editable} onChange={value => update("text", value)} />
    </header>
    <div ref={stage} id={stageId} className={styles.stage} data-count={cards.length} data-selected-id={active?.id} role="group" aria-label={c.heading}>
      <div className={styles.artifact} aria-hidden={editable ? undefined : true}>
        <div className={styles.artifactBar}><span className={styles.browserDots} aria-hidden="true"><i /><i /><i /></span><EditableText as="span" value={c.subheading} editable={editable} onChange={value => update("subheading", value)} /><ArrowUpRight size={15} aria-hidden="true" /></div>
      </div>
      {cards.map((item, index) => <div key={item.id} className={styles.slot} data-orbit-card={item.id} data-slot={index} data-item-id={item.id} data-selected={active?.id === item.id}>
        <EditableChoice editable={editable} type="button" className={styles.card} data-orbit-surface="" aria-pressed={active?.id === item.id} aria-controls={statusId} onChoose={() => choose(item.id)}
          onKeyDown={event => {
            if (editable || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === "Home" ? 0 : event.key === "End" ? cards.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + cards.length) % cards.length;
            choose(cards[next].id);
            stage.current?.querySelector<HTMLButtonElement>(`[data-slot="${next}"] button[data-orbit-surface]`)?.focus({ preventScroll: true });
          }}>
          <div className={`${styles.cardImage}${!item.image?.src ? ` ${styles.noImage}` : ""}`}>
            <CreatorPhoto image={item.image} editable={editable} onChange={image => editItem(item, { image })} sizes="(max-width: 700px) 45vw, 30vw" className={styles.photo} />
            {(item.label || editable) && <EditableText as="span" className={styles.cardLabel} value={item.label} editable={editable} onChange={label => editItem(item, { label })} />}
          </div>
          <EditableText as="span" className={styles.cardTitle} value={item.title} editable={editable} onChange={title => editItem(item, { title })} />
        </EditableChoice>
      </div>)}
      {!cards.length && <p className={styles.empty}>{ui("emptyLabel") || "Füge Inhalte hinzu."}</p>}
    </div>
    <div className={styles.bottom}>
      <EditableChoice editable={editable} type="button" className={styles.compose} onChoose={compose} aria-pressed={gathered} aria-controls={stageId} disabled={!cards.length}>
        {gathered ? <Maximize2 size={19} aria-hidden="true" /> : <Minimize2 size={19} aria-hidden="true" />}
        <EditableText as="span" value={gathered ? c.secondaryLabel || "Verteilen" : c.primaryLabel || "Alles zusammen"} editable={editable} onChange={value => update(gathered ? "secondaryLabel" : "primaryLabel", value)} />
      </EditableChoice>
      {active && <div className={styles.detail} data-item-id={active.id}>
        <div><EditableText as="p" className={styles.detailTitle} value={active.title} editable={editable} onChange={title => editItem(active, { title })} /><EditableText as="p" className={styles.detailText} value={active.text || active.meta} editable={editable} onChange={value => editItem(active, active.text ? { text: value } : { meta: value })} /></div>
        {active.href && <ContentLink href={active.href} editable={editable} className={styles.open} label={`${ui("openLabel") || "Ansehen"}: ${active.title}`}><ArrowUpRight size={23} aria-hidden="true" /></ContentLink>}
      </div>}
    </div>
    <p id={statusId} className={styles.status} role="status" aria-live="polite" aria-atomic="true">{active ? `${ui("selectedLabel") || "Ausgewählt"}: ${active.title}` : ui("emptyLabel") || "Füge Inhalte hinzu."}</p>
  </div>;
}
