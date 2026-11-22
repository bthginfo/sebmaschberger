"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { ContentItem, CreatorLensPreset } from "@/lib/types";
import type { CreatorSectionProps } from "@/lib/creator/types";
import { lensPreset } from "@/lib/creator/scenes";
import { EditableChoice, EditableText } from "@/components/site/editable";
import { useSectionHeadingLevel } from "@/components/site/heading-level";
import { creatorCopy, updateCreatorItem } from "../marketing/creator-copy";
import { CreatorPhoto } from "../marketing/creator-photo";
import styles from "./lens.module.css";

export function CreatorLens({ section, editable, onChange }: CreatorSectionProps) {
  const c = section.content, ui = creatorCopy(section), heading = useSectionHeadingLevel(section.id);
  const presets = (c.items ?? []).filter(item => item.lens).slice(0, 3), initial = presets.find(item => item.tags?.includes("default")) ?? presets[0];
  const [lens, setLens] = useState<CreatorLensPreset>(() => lensPreset(initial));
  const [active, setActive] = useState(initial?.id ?? "");
  const scene = useRef<HTMLDivElement>(null), frame = useRef(0), pending = useRef({ x: 50, y: 50 }), visible = useRef(true);
  const sceneId = useId();
  const view = editable ? lensPreset(initial) : lens;
  useEffect(() => {
    const host = scene.current;
    if (!host) return;
    const stop = () => { if (document.hidden) { cancelAnimationFrame(frame.current); frame.current = 0; } };
    const observer = new IntersectionObserver(entries => { visible.current = entries[0]?.isIntersecting ?? false; if (!visible.current) { cancelAnimationFrame(frame.current); frame.current = 0; } });
    observer.observe(host); document.addEventListener("visibilitychange", stop);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", stop); cancelAnimationFrame(frame.current); };
  }, []);
  const update = (key: string, value: unknown) => onChange?.({ ...section, content: { ...c, [key]: value } });
  const editItem = (item: ContentItem, value: string) => onChange?.(updateCreatorItem(section, c.items!.indexOf(item), { title: value }));
  const point = (event: PointerEvent<HTMLDivElement>, tap = false) => {
    if (editable || document.hidden || !visible.current || !scene.current) return;
    if (!tap && (event.pointerType !== "mouse" || !matchMedia("(hover: hover) and (pointer: fine)").matches)) return;
    const rect = scene.current.getBoundingClientRect();
    pending.current = { x: Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)), y: Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100)) };
    if (!frame.current) frame.current = requestAnimationFrame(() => { frame.current = 0; setLens(value => ({ ...value, ...pending.current })); setActive(""); });
  };
  return <div className={styles.lens} data-motion={editable ? "off" : "lens"}>
    <header className={styles.intro}><EditableText as={heading} value={c.heading} editable={editable} onChange={value => update("heading", value)} /><EditableText as="p" value={c.text} editable={editable} onChange={value => update("text", value)} /></header>
    <div ref={scene} id={sceneId} className={styles.scene} role="group" aria-label={ui("scene")} style={{ "--lens-x": `${view.x}%`, "--lens-y": `${view.y}%`, "--lens-radius": `${view.radius}%` } as CSSProperties} onPointerMove={event => point(event)} onPointerUp={event => { if (event.pointerType !== "mouse") point(event, true); }}>
      <div className={styles.quiet}><CreatorPhoto image={c.image} editable={editable} onChange={value => update("image", value)} className={styles.photo} sizes="(max-width: 700px) 100vw, 90vw" /><EditableText as="p" value={c.subheading} editable={editable} onChange={value => update("subheading", value)} className={styles.poster} /></div>
      <div className={styles.vivid} aria-hidden="true"><CreatorPhoto image={c.image} className={styles.photo} sizes="(max-width: 700px) 100vw, 90vw" /><p className={styles.poster}>{c.subheading}</p><div className={styles.portalMark} /></div>
      <div className={styles.ring} aria-hidden="true" />
    </div>
    <div className={styles.controls}>
      <div className={styles.presets} role="group" aria-label={ui("scene")}>{presets.map(item => <EditableChoice key={item.id} editable={editable} type="button" data-item-id={item.id} aria-pressed={active === item.id} aria-controls={sceneId} onChoose={() => { if (!editable) { setLens(lensPreset(item)); setActive(item.id); } }}><EditableText as="span" value={item.title} editable={editable} onChange={value => editItem(item, value)} /></EditableChoice>)}</div>
      <label className={styles.range}><span>{ui("position")}</span><input type="range" min="0" max="100" step="1" value={Math.round(view.x)} disabled={editable} aria-controls={sceneId} onChange={event => { setLens(value => ({ ...value, x: Number(event.target.value) })); setActive(""); }} /></label>
    </div>
  </div>;
}
