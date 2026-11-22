"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { motionStoryModelUrl, motionStoryStudioModel, motionStoryStudioPoster } from "@/lib/motion-story";
import { scroll3dStops } from "@/lib/scroll-3d";
import type { Section, SectionContent } from "@/lib/types";
import { useAdminLanguage } from "@/components/admin/admin-language";
import { EditableImage, EditableText } from "./editable";
import { useSectionHeadingLevel } from "./heading-level";
import type { StudioPlayer } from "./studio/studio-runtime";
import styles from "./scroll-3d.module.css";

const noMotion = "(prefers-reduced-motion: reduce), (max-height: 420px)";
const emptyChapters: NonNullable<SectionContent["items"]> = [];

export function Scroll3d({ section, language, editable, enabled, onChange, actions }: {
  section: Section;
  language: string;
  editable: boolean;
  enabled: boolean;
  onChange?: (section: Section) => void;
  actions?: ReactNode;
}) {
  const { content, design } = section;
  const { t } = useAdminLanguage();
  const heading = useSectionHeadingLevel(section.id);
  const chapters = content.items ?? emptyChapters;
  const stops = useMemo(() => scroll3dStops(chapters) ?? Array.from(
    { length: chapters.length + 1 }, (_, index) => index / (chapters.length + 1),
  ), [chapters]);
  const model = content.motionModel ? motionStoryModelUrl(content.motionModel) : motionStoryStudioModel;
  const poster = content.image ?? (content.motionModel ? undefined : motionStoryStudioPoster);
  const path = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const meter = useRef<HTMLDivElement>(null);
  const slider = useRef<HTMLInputElement>(null);
  const resetShade = useRef<HTMLDivElement>(null);
  const player = useRef<StudioPlayer | null>(null);
  const progress = useRef(0);
  const [active, setActive] = useState(0);
  const [testing, setTesting] = useState(false);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState<"waiting" | "loading" | "unavailable">("waiting");
  const running = enabled && (!editable || testing);
  const loop = design.scroll3dPlayback === "loop";
  const playing = running && ready;
  const canEdit = editable && !testing;
  const chapterDesign = playing ? chapters[active - 1]?.scroll3d : undefined;
  const initialLayout = design.imageSide === "left" ? "art-left" : "art-right";
  const layout = chapterDesign?.layout ?? initialLayout;
  const chapterLabel = language === "de" ? "Kapitel der 3D-Story" : "3D story chapters";
  const introLabel = language === "de" ? "Einstieg" : "Introduction";

  useEffect(() => { player.current?.pause(paused); }, [paused]);

  useEffect(() => {
    const node = stage.current, art = canvas.current, runway = path.current;
    if (!running || !model || !node || !art || !runway) return;
    const preference = matchMedia(noMotion);
    let stopped = false;
    let loaded = false;
    let frame = 0;
    let travel = 0;
    let stickyTop = 0;
    let chapter = 0;

    function seek() {
      frame = 0;
      if (runway && travel > 0) player.current?.seek((stickyTop - runway.getBoundingClientRect().top) / travel);
    }
    function queueSeek() {
      if (!frame) frame = requestAnimationFrame(seek);
    }
    function measure() {
      if (editable || loop || !node || !runway) return;
      stickyTop = parseFloat(getComputedStyle(node).top) || 0;
      travel = runway.offsetHeight - node.offsetHeight;
      queueSeek();
    }
    function sync() {
      if (preference.matches) {
        player.current?.pause(true);
        setReady(false);
        setStatus("unavailable");
      } else if (player.current) {
        player.current.pause(false);
        // The runtime signals readiness again when it can render.
      } else {
        loaded = false;
        if (node) vicinity.observe(node);
      }
    }
    const vicinity = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || preference.matches || loaded) return;
      loaded = true;
      vicinity.disconnect();
      setStatus("loading");
      void Promise.all([import("./studio/studio-runtime"), import("./studio/model-sequence")]).then(([runtime, sequence]) => {
        if (stopped) return;
        player.current = runtime.mountStudio(art, node, sequence.modelSequence(model, { story: true }), {
          mode: loop ? "loop" : "scroll",
          motionQuery: noMotion,
          loopReset: loop ? opacity => resetShade.current?.style.setProperty("opacity", String(opacity)) : undefined,
          ready(value) {
            const available = value && !preference.matches;
            setReady(available);
            setStatus(available ? "waiting" : "unavailable");
            if (!available) resetShade.current?.style.setProperty("opacity", "0");
          },
          progress(value) {
            progress.current = value;
            meter.current?.style.setProperty("--story-progress", String(value));
            const next = stops.findLastIndex(stop => value >= stop - 0.0001);
            if (next !== chapter) {
              chapter = next;
              setActive(next);
            }
          },
        });
      }).catch(() => { if (!stopped) setStatus("unavailable"); });
    }, { rootMargin: "200px 0px" });
    const sizes = new ResizeObserver(measure);
    if (!editable && !loop) {
      sizes.observe(runway);
      sizes.observe(node);
      window.addEventListener("scroll", queueSeek, { passive: true });
    }
    preference.addEventListener("change", sync);
    sync();
    return () => {
      stopped = true;
      vicinity.disconnect();
      sizes.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", queueSeek);
      preference.removeEventListener("change", sync);
      player.current?.destroy();
      player.current = null;
      setReady(false);
      setActive(0);
      setPaused(false);
      setStatus("waiting");
    };
  }, [editable, loop, model, running, stops]);

  function goTo(index: number) {
    const stop = stops[index];
    if (editable) {
      player.current?.seek(stop);
      if (slider.current) slider.current.value = String(Math.round(stop * 1000));
    } else if (path.current && stage.current) {
      const runway = path.current;
      const sticky = parseFloat(getComputedStyle(stage.current).top) || 0;
      const travel = runway.offsetHeight - stage.current.offsetHeight;
      const bias = index > 0 ? 1 : 0;
      window.scrollBy({ top: runway.getBoundingClientRect().top - sticky + travel * stop + bias, behavior: "smooth" });
    }
  }

  function update<K extends keyof SectionContent>(key: K, value: SectionContent[K]) {
    onChange?.({ ...section, content: { ...content, [key]: value } });
  }
  function updateChapter(index: number, key: "title" | "text", value: string) {
    update("items", chapters.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  }

  return <>
    {editable && enabled && <div className={styles.tools}>
      <button type="button" className={styles.control} aria-pressed={testing} onClick={() => setTesting(!testing)}>
        {t(testing ? "Test beenden" : "3D testen")}
      </button>
      {testing && !playing && status !== "waiting" && <span role="status">{t(status === "loading" ? "3D-Szene lädt …" : "Die 3D-Vorschau ist in diesem Browserfenster nicht verfügbar.")}</span>}
      {testing && playing && !loop && <input ref={slider} type="range" aria-label={t("Position der 3D-Szene")} min={0} max={1000}
        step={1} defaultValue={Math.round(progress.current * 1000)}
        onInput={event => player.current?.seek(Number(event.currentTarget.value) / 1000)} />}
    </div>}
    <div className={styles.runway} ref={path} data-scroll-3d-runway data-playing={playing} data-scroll={playing && !editable && !loop} data-loop={loop}
      style={{ "--story-travel": `${Math.max(1, chapters.length + 1) * (design.scroll3dLength ?? 0.9) * 100}svh` } as CSSProperties}>
      <div className={styles.stage} ref={stage} data-scroll-3d-stage data-layout={layout} data-intro-layout={initialLayout}
        data-align={design.align} data-chapter-index={playing ? active : undefined}
        style={{ "--story-bg": chapterDesign?.background, "--story-fg": chapterDesign?.textColor } as CSSProperties}>
        <article className={styles.copy} data-scroll-3d-copy data-active={active === 0} inert={playing && active !== 0}
          tabIndex={playing && active === 0 ? 0 : undefined}>
          <EditableText className={styles.eyebrow} value={content.subheading} editable={canEdit} onChange={value => update("subheading", value)} />
          <EditableText as={heading} className={styles.title} value={content.heading} editable={canEdit} onChange={value => update("heading", value)} />
          <EditableText className={styles.description} value={content.text} editable={canEdit} onChange={value => update("text", value)} />
        </article>
        <div className={styles.art} data-scroll-3d-art>
          {!playing && <EditableImage image={poster} editable={canEdit} onChange={image => update("image", image)}
            className={styles.poster} sizes="(max-width: 720px) 100vw, 56vw" />}
          {running && model && <canvas ref={canvas} data-ready={playing} aria-hidden="true" />}
        </div>
        {chapters.map((item, index) => <article className={styles.copy} key={item.id} data-scroll-3d-copy
          data-item-id={item.id} data-chapter data-active={active === index + 1} inert={playing && active !== index + 1}
          tabIndex={playing && active === index + 1 ? 0 : undefined}>
          <EditableText as={heading === "h1" ? "h2" : "h3"} className={styles.title} value={item.title} editable={canEdit}
            onChange={value => updateChapter(index, "title", value)} />
          <EditableText className={styles.description} value={item.text} editable={canEdit}
            onChange={value => updateChapter(index, "text", value)} />
        </article>)}
        {loop && <div ref={resetShade} className={styles.loopShade} aria-hidden="true" />}
        {playing && loop && <button type="button" className={styles.loopControl} aria-pressed={paused} onClick={() => setPaused(!paused)}>
          {t(paused ? "Abspielen" : "Pause")}
        </button>}
        {playing && !loop && chapters.length > 0 && <nav className={styles.navigation} aria-label={chapterLabel}>
          <div ref={meter} className={styles.progress} aria-hidden="true" />
          <div className={styles.chapterButtons}>
            {[introLabel, ...chapters.map(item => item.title)].map((label, index) => <button type="button" key={index}
              className={styles.control} aria-current={active === index ? "step" : undefined} onClick={() => goTo(index)}>
              {label}
            </button>)}
          </div>
        </nav>}
      </div>
    </div>
    {actions && <div className={styles.actions}>{actions}</div>}
  </>;
}
