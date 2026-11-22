"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, Globe2, Pause, Play } from "lucide-react";
import type { CreatorSectionProps } from "@/lib/creator/types";
import { ContentLink, EditableText } from "@/components/site/editable";
import { useSectionHeadingLevel } from "@/components/site/heading-level";
import { creatorCopy } from "../marketing/creator-copy";
import { CreatorPhoto } from "../marketing/creator-photo";
import { useArtworkMotion } from "../motion/creator-motion";
import { HeroCanvas, type HeroPreset } from "./hero-canvas";
import styles from "./heroes.module.css";

export function CreatorHero({ section, site, editable, onChange }: CreatorSectionProps) {
  const c = section.content, ui = creatorCopy(section);
  const headingLevel = useSectionHeadingLevel(section.id);
  const heroRef = useRef<HTMLDivElement>(null), artworkRef = useRef<HTMLDivElement>(null);
  useArtworkMotion(heroRef, artworkRef, Boolean(editable));
  const update = (key: string, value: unknown) => onChange?.({ ...section, content: { ...c, [key]: value } });
  if (section.design.creatorHero) return <HeroCanvas preset={section.design.creatorHero as HeroPreset} creator={c.subheading || site.name} title={c.heading} description={c.text} image={c.image} cta={c.primaryLabel} href={c.primaryHref} secondaryCta={c.secondaryLabel} secondaryHref={c.secondaryHref} headingTag={headingLevel} ui={ui} editable={editable} onTitle={value => update("heading", value)} onCreator={value => update("subheading", value)} onDescription={value => update("text", value)} onImage={value => update("image", value)} onCta={value => update("primaryLabel", value)} />;
  const home = section.design.heroLayout === "panorama";
  const items = c.items?.filter(item => !item.tags?.includes("ui")) ?? [];
  const Heading = headingLevel;
  return <div ref={heroRef} className={`${styles.marketingHero} ${home ? styles.homeHero : styles.innerHero} ${!c.image ? styles.typeHero : ""}`} data-motion={editable ? "off" : "hero"}>
    <div className={styles.marketingHeroMain}>
      <div className={styles.marketingHeroCopy}>
        {home && !editable ? <Heading className={styles.marketingTitle}>{c.heading.split("\n").map((line, index) => <span className={styles.posterLine} key={`${index}-${line}`}>{line}</span>)}</Heading> : <EditableText as={headingLevel} value={c.heading} editable={editable} onChange={value => update("heading", value)} className={styles.marketingTitle} />}
        <EditableText as="p" value={c.text} editable={editable} onChange={value => update("text", value)} className={`${styles.marketingDescription}${!home && c.text?.includes('\n') ? ` ${styles.serviceSummary}` : ''}`} />
        <div className={styles.marketingActions}>{c.primaryLabel && <ContentLink href={c.primaryHref} editField="primaryHref" editable={editable} className={styles.primaryAction}><EditableText as="span" value={c.primaryLabel} editable={editable} onChange={value => update("primaryLabel", value)} /><ArrowUpRight size={22} /></ContentLink>}{c.secondaryLabel && <ContentLink href={c.secondaryHref} editField="secondaryHref" editable={editable} className={styles.secondaryAction}><EditableText as="span" value={c.secondaryLabel} editable={editable} onChange={value => update("secondaryLabel", value)} /><ArrowUpRight size={20} /></ContentLink>}</div>
      </div>
      {c.image && <div ref={artworkRef} className={styles.marketingHeroMedia}><CreatorPhoto image={c.image} editable={editable} onChange={value => update("image", value)} className={styles.marketingPhoto} priority sizes="(max-width: 700px) 100vw, 50vw" />
        {c.caption && <div className={styles.photoLabel}><Globe2 size={20} /><EditableText as="span" value={c.caption} editable={editable} onChange={value => update("caption", value)} /><ArrowUpRight size={20} /></div>}
        {c.subheading && <EditableText as="span" value={c.subheading} editable={editable} onChange={value => update("subheading", value)} className={styles.heroSticker} />}
        {home && Boolean(c.images?.length) && <div className={styles.heroContactSheet}>{c.images?.slice(0, 2).map((image, index) => <div className={styles.heroStudy} key={index}><CreatorPhoto image={image} editable={editable} loading="eager" sizes="(max-width: 700px) 28vw, 15vw" onChange={value => update("images", c.images?.map((candidate, n) => n === index ? value : candidate))} />{image.caption && <EditableText as="span" value={image.caption} editable={editable} onChange={value => update("images", c.images?.map((candidate, n) => n === index ? { ...candidate, caption: value } : candidate))} />}</div>)}</div>}
      </div>}
    </div>
    {items.length > 0 && <CreatorRibbon section={section} editable={editable} onChange={onChange} />}
    {home && c.secondaryHref?.startsWith("#") && <a className={styles.heroScroll} href={c.secondaryHref} aria-label={c.secondaryLabel}><ArrowDown size={22} /></a>}
  </div>;
}

/** One compositor track; its visual copy never enters editing, focus or the accessibility tree. */
function CreatorRibbon({ section, editable, onChange }: Pick<CreatorSectionProps, "section" | "editable" | "onChange">) {
  const items = section.content.items?.filter(item => !item.tags?.includes("ui")) ?? [];
  const ui = creatorCopy(section), ribbon = useRef<HTMLDivElement>(null), trackId = useId();
  const [allowed, setAllowed] = useState(false), [paused, setPaused] = useState(false);
  const [interaction, setInteraction] = useState({ hover: false, focus: false, resumedHover: false, resumedFocus: false });
  useEffect(() => {
    const host = ribbon.current;
    if (!host || editable) { setAllowed(false); return; }
    let onScreen = false;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setAllowed(onScreen && !document.hidden && !preference.matches);
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => { onScreen = entries[0]?.isIntersecting ?? false; update(); });
    observer?.observe(host);
    document.addEventListener("visibilitychange", update); preference.addEventListener("change", update);
    return () => { observer?.disconnect(); document.removeEventListener("visibilitychange", update); preference.removeEventListener("change", update); };
  }, [editable]);
  const edit = (id: string, title: string) => onChange?.({ ...section, content: { ...section.content, items: section.content.items?.map(item => item.id === id ? { ...item, title } : item) } });
  const transientPause = (interaction.hover && !interaction.resumedHover) || (interaction.focus && !interaction.resumedFocus);
  const togglePlayback = () => {
    const nextPaused = !paused;
    setPaused(nextPaused);
    // Resume overrides only the interaction episodes already in progress. Focus
    // stays on the native control; a later hover/focus entry pauses normally.
    setInteraction(value => ({ ...value, resumedHover: !nextPaused && value.hover, resumedFocus: !nextPaused && value.focus }));
  };
  return <div ref={ribbon} className={styles.heroRibbon} data-ribbon-running={allowed && !paused && !transientPause}
    onPointerEnter={event => { if (event.pointerType === "mouse" && matchMedia("(hover: hover) and (pointer: fine)").matches) setInteraction(value => ({ ...value, hover: true, resumedHover: false })); }}
    onPointerLeave={event => { if (event.pointerType === "mouse") setInteraction(value => ({ ...value, hover: false, resumedHover: false })); }}
    onFocusCapture={() => setInteraction(value => ({ ...value, focus: true, resumedFocus: false }))}
    onBlurCapture={event => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setInteraction(value => ({ ...value, focus: false, resumedFocus: false })); }}>
    <div id={trackId} className={styles.ribbonTrack}>
      <div className={styles.ribbonCopy}>{items.map(item => item.href ? <ContentLink key={item.id} href={item.href} editField="href" editItemId={item.id} editable={editable} className={styles.ribbonItem}><span data-item-id={item.id}><EditableText as="span" value={item.title} editable={editable} onChange={title => edit(item.id, title)} /></span><ArrowUpRight size={23} aria-hidden="true" /></ContentLink> : <span key={item.id} data-item-id={item.id} className={styles.ribbonItem}><EditableText as="span" value={item.title} editable={editable} onChange={title => edit(item.id, title)} /><ArrowUpRight size={23} aria-hidden="true" /></span>)}</div>
      {!editable && <div className={styles.ribbonCopy} aria-hidden="true" inert>{items.map(item => <span key={item.id} className={styles.ribbonItem}>{item.title}<ArrowUpRight size={23} aria-hidden="true" /></span>)}</div>}
    </div>
    {!editable && <button type="button" className={styles.ribbonToggle} aria-controls={trackId} aria-pressed={paused} aria-label={paused ? ui("resumeRibbon") || "Laufband fortsetzen" : ui("pauseRibbon") || "Laufband pausieren"} title={paused ? ui("resumeRibbon") || "Laufband fortsetzen" : ui("pauseRibbon") || "Laufband pausieren"} onClick={togglePlayback}>{paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}</button>}
  </div>;
}
