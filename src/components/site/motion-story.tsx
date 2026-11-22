
"use client";

import { useAdminLanguage } from "@/components/admin/admin-language";

import { Pause, Play } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { motionStoryModelUrl, motionStoryObject, motionStoryPoster, motionStoryScenes, motionStoryStudioModel, motionStoryStudioPoster } from "@/lib/motion-story";
import type { ContentItem, ImageValue, Section, SectionContent } from "@/lib/types";
import { EditableImage, EditableText } from "./editable";
import { useSectionContentEditable, useSectionHeadingLevel } from "./heading-level";
import { StudioArtwork } from "./studio/studio-artwork";
import styles from "./motion-story.module.css";

const cycle = 12000;

function useHeroTimeline(trigger: "loop" | "scroll", allowed: boolean, cssTimeline: boolean) {
  const runway = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const node = stage.current;
    if (!node || !allowed) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let inView = false;
    const update = () => {
      setReduced(preference.matches);
      if (inView && !preference.matches) setEnabled(true);
      setVisible(inView && !document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting && entry.intersectionRatio >= .24;
      update();
    }, { threshold: [.24] });
    observer.observe(node);
    update();
    document.addEventListener("visibilitychange", update);
    preference.addEventListener("change", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      preference.removeEventListener("change", update);
    };
  }, [allowed]);

  const mode: "loop" | "scroll" | "still" = allowed && enabled && !reduced ? trigger : "still";
  useEffect(() => {
    const path = runway.current, node = stage.current;
    if (!path || !node || mode !== "scroll" || !visible || !cssTimeline) return;
    let request = 0;
    let timeline: Animation[] = [];
    function update() {
      request = 0;
      if (!path || !node) return;
      if (timeline.length === 0) timeline = node.getAnimations({ subtree: true }).filter(animation => animation instanceof CSSAnimation);
      const travel = path.offsetHeight - node.offsetHeight;
      const elapsed = (parseFloat(getComputedStyle(node).top) || 0) - path.getBoundingClientRect().top;
      const progress = travel > 0 ? Math.max(0, Math.min(1, elapsed / travel)) : 0;
      for (const animation of timeline) animation.currentTime = progress * cycle * .76;
    }
    function queue() { if (!request) request = requestAnimationFrame(update); }
    update();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      cancelAnimationFrame(request);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
    };
  }, [mode, visible, cssTimeline]);

  return { runway, stage, mode, visible };
}

function ObjectArtwork({ poster, effect, pieces, editable, priority, onChange }: {
  poster: ImageValue; effect: "glaze" | "assembly"; pieces: ContentItem[];
  editable: boolean; priority: boolean; onChange: (image: ImageValue) => void;
}) {
  return <div className={styles.objectArea}>
    <div className={styles.objectShadow} aria-hidden="true" />
    {effect === "assembly" && pieces.map((item, index) => <div key={item.id} className={styles.objectPart} data-slot={index} aria-hidden="true">
      <EditableImage image={item.image} className={styles.objectPhoto} sizes="(max-width: 720px) 45vw, 420px" />
    </div>)}
    <div className={styles.objectBody}>
      <EditableImage image={poster} editable={editable} editLabel="Hauptmotiv bearbeiten" priority={priority}
        className={styles.objectPhoto} sizes="(max-width: 720px) 58vw, 520px" onChange={onChange} />
      {effect === "glaze" && <div className={styles.glazed} aria-hidden="true">
        <EditableImage image={poster} className={styles.objectPhoto} sizes="(max-width: 720px) 58vw, 520px" />
      </div>}
      {effect === "glaze" && <span className={styles.glazeRibbon} aria-hidden="true" />}
    </div>
  </div>;
}

export function MotionStory({ section, editable: canEdit, onChange, actions }: {
  section: Section;
  editable: boolean;
  onChange?: (section: Section) => void;
  actions?: ReactNode;
}) {
  const { t: adminText } = useAdminLanguage();
  const { content, design } = section;
  const editable = useSectionContentEditable(canEdit);
  const Heading = useSectionHeadingLevel(section.id);
  const NoteHeading = Heading === "h1" ? "h2" : "h3";
  const headingId = useId();
  const frameId = useId();
  const [paused, setPaused] = useState(false);
  const [testing, setTesting] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const effect = design.motionEffect;
  const studio = effect === "studio";
  const poster = content.image?.src ? content.image : studio ? motionStoryStudioPoster : effect ? motionStoryObject : motionStoryPoster;
  const items = content.items ?? [];
  const scenes = motionStoryScenes(content);
  const trigger = !canEdit && design.motionTrigger === "scroll" ? "scroll" : "loop";
  const hasMotion = Boolean(effect || scenes.length);
  const { runway, stage, mode, visible } = useHeroTimeline(trigger, hasMotion && (!canEdit || testing), !studio);

  function update<Key extends keyof SectionContent>(key: Key, value: SectionContent[Key]) {
    onChange?.({ ...section, content: { ...content, [key]: value } });
  }

  function updateItem<Key extends keyof ContentItem>(itemId: string, key: Key, value: ContentItem[Key]) {
    update("items", items.map(item => item.id === itemId ? { ...item, [key]: value } : item));
  }

  const updateable = editable && !testing;
  const labels = effect && !studio && design.motionText ? items.filter(item => item.title.trim()).slice(0, 2) : [];
  const notes = items.filter(item => canEdit || (effect ? !labels.includes(item) || (effect === "glaze" && item.image?.src) : !design.motionText || !scenes.includes(item)));

  return <div className={styles.story} data-motion-story role="group" aria-labelledby={headingId}>
    <div ref={runway} className={styles.runway} data-motion-trigger={studio && !modelReady ? "still" : mode} style={{ "--cycle": cycle + "ms" } as CSSProperties}>
      <div id={frameId} ref={stage} className={styles.stage} data-motion-stage data-motion-effect={effect} data-scenes={scenes.length}
        data-studio-ready={studio ? modelReady : undefined} data-loop-running={mode === "loop" && visible && !paused && (!studio || modelReady)}>
        <div className={styles.scene} data-scene="opening">
          {effect === "studio" ? <StudioArtwork model={motionStoryModelUrl(content.motionModel) ?? motionStoryStudioModel}
            mode={mode} stage={stage} runway={runway} poster={poster} editable={updateable}
            priority={Heading === "h1"} paused={paused} ready={modelReady} onReady={setModelReady} onChange={value => update("image", value)} />
          : effect ? <ObjectArtwork poster={poster} effect={effect} pieces={scenes} editable={updateable} priority={Heading === "h1"} onChange={value => update("image", value)} /> : <>
            <EditableImage image={poster} editable={updateable} editLabel="Startmotiv bearbeiten" priority={Heading === "h1"}
            className={styles.photo} sizes="(max-width: 720px) 100vw, 1200px" onChange={value => update("image", value)} />
          <div className={styles.tint} /></>}
          <div className={styles.copy}>
            <EditableText id={headingId} as={Heading} className={styles.heading} value={content.heading} editable={updateable}
              onChange={value => update("heading", value)} />
            {(content.subheading || updateable) && <EditableText className={styles.subheading} value={content.subheading} editable={updateable}
              onChange={value => update("subheading", value)} />}
            {(content.text || updateable) && <EditableText className={styles.text} value={content.text} editable={updateable} onChange={value => update("text", value)} />}
          </div>
        </div>
        {!effect && mode !== "still" && scenes.map((item, index) => <div key={item.id} className={styles.scene} data-scene={index === 0 ? "second" : "third"} aria-hidden="true">
          <EditableImage image={item.image} className={styles.photo} sizes="(max-width: 720px) 100vw, 1200px" />
          <div className={styles.tint} />
          <div className={styles.copy}>
            <strong className={styles.heading}>{design.motionText && item.title ? item.title : content.heading}</strong>
            <p className={styles.text}>{design.motionText && item.text ? item.text : content.text}</p>
          </div>
        </div>)}
        {labels.length > 0 && mode !== "still" && <div className={styles.objectLabels} aria-hidden="true">
          {labels.map((item, index) => <span key={item.id} data-slot={index}>{item.title}</span>)}
        </div>}
        {actions && <div className={styles.actions}>{actions}</div>}
        {mode === "loop" && !canEdit && (!studio || modelReady) && <button type="button" className={styles.pause} aria-controls={frameId}
          aria-label={canEdit ? adminText(paused ? "Hero-Animation fortsetzen" : "Hero-Animation pausieren") : paused ? "Hero-Animation fortsetzen" : "Hero-Animation pausieren"} onClick={() => setPaused(value => !value)}>
          {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
        </button>}
      </div>
    </div>
    {canEdit && hasMotion && <button className={styles.tryMotion} type="button" aria-controls={frameId}
      aria-pressed={testing} onClick={() => setTesting(value => !value)}>
      {testing ? <Pause size={15} /> : <Play size={15} />}
      {testing ? adminText("Animationsvorschau beenden") : adminText("Animation testen")}
    </button>}
    {(content.caption || editable) && <EditableText className={styles.caption} value={content.caption} editable={editable}
      onChange={value => update("caption", value)} />}
    {items.length > 0 && <div className={styles.notes}>
      {items.map(item => <article key={item.id} data-item-id={item.id} className={styles.note} data-scene-note={!notes.includes(item) || undefined}>
        <EditableText as={NoteHeading} className={styles.noteTitle} value={item.title} editable={editable}
          onChange={value => updateItem(item.id, "title", value)} />
        <EditableText className={styles.noteText} value={item.text} editable={editable}
          onChange={value => updateItem(item.id, "text", value)} />
        {(editable || (notes.includes(item) && item.image?.src)) && <EditableImage image={item.image} className={styles.noteImage} editable={editable}
          editLabel="Szenenbild bearbeiten" sizes="(max-width: 700px) 100vw, 40vw"
          onChange={value => updateItem(item.id, "image", value)} />}
      </article>)}
    </div>}
  </div>;
}
