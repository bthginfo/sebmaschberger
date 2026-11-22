"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, Pause, Play, RotateCcw } from "lucide-react";
import type { ContentItem, SiteLanguage } from "@/lib/types";

const labels = {
  de: { choose: "Ansicht auswählen", gallery: "Galerie durchblättern", view: "Ansicht", previous: "Vorherige Ansicht", next: "Nächste Ansicht", filter: "Projekte filtern", all: "Alle", project: "Projekt", projects: "Projekte" },
  en: { choose: "Choose a slide", gallery: "Browse gallery", view: "Slide", previous: "Previous slide", next: "Next slide", filter: "Filter projects", all: "All", project: "project", projects: "projects" },
};

type ItemsProps = {
  items: ContentItem[];
  editable: boolean;
  language?: SiteLanguage;
  media: (item: ContentItem, index: number) => ReactNode;
  copy: (item: ContentItem, index: number) => ReactNode;
};

export function ScrollStory({ items, editable, motion, media, copy }: ItemsProps & { motion: boolean }) {
  const list = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);
  const [enhanced, setEnhanced] = useState(false);
  const canPin = motion && !editable && items.length > 1 && items.some(item => item.image?.src);

  useEffect(() => {
    const chapters = list.current;
    if (!canPin || !chapters || typeof IntersectionObserver === "undefined") return;
    const preference = window.matchMedia("(min-width: 861px) and (min-height: 620px) and (prefers-reduced-motion: no-preference)");
    let observer: IntersectionObserver | undefined;

    function observe() {
      observer?.disconnect();
      setEnhanced(preference.matches);
      if (!preference.matches || !chapters) return;
      // Use a narrow band around the center of the viewport as the reading position.
      const inset = Math.round(window.innerHeight * .46);
      observer = new IntersectionObserver(entries => {
        const current = entries.find(entry => entry.isIntersecting);
        if (current) setActive(Number((current.target as HTMLElement).dataset.chapter));
      }, { rootMargin: `-${inset}px 0px -${inset}px` });
      for (const chapter of chapters.children) observer.observe(chapter);
    }

    observe();
    preference.addEventListener("change", observe);
    window.addEventListener("resize", observe);
    return () => {
      observer?.disconnect();
      preference.removeEventListener("change", observe);
      window.removeEventListener("resize", observe);
    };
  }, [canPin, items.length]);

  const pinned = canPin && enhanced;
  const current = Math.min(active, items.length - 1);
  return <div className="ws-scroll-story" data-pinned={pinned || undefined}>
    {pinned && <div className="ws-story-stage" aria-hidden="true">
      {items.map((item, index) => Math.abs(index - current) <= 1 && <div className="ws-story-plate" key={item.id} data-current={current === index}>
        {item.image?.src ? media(item, index) : <span>{item.title}</span>}
      </div>)}
    </div>}
    <ol className="ws-story-chapters" ref={list}>
      {items.map((item, index) => <li className="ws-story-chapter" key={item.id} data-item-id={item.id} data-chapter={index}>
        <div className="ws-story-inline">{media(item, index)}</div>
        {pinned && item.image?.alt && <span className="ws-story-alt ws-visual-sr-only">{item.image.alt}</span>}
        <div className="ws-story-copy">{copy(item, index)}</div>
      </li>)}
    </ol>
  </div>;
}

export function ProjectStage({ items, editable, language = "de", media, copy }: ItemsProps) {
  const [activeId, setActiveId] = useState<string>();
  const listId = useId();
  const selected = Math.max(0, items.findIndex(item => item.id === activeId));
  const active = items[selected];
  const text = labels[language];
  function advance(direction: number) {
    setActiveId(items[(selected + direction + items.length) % items.length].id);
  }

  return <div className="ws-project-stage">
    {!editable && items.length > 1 && <div className="ws-project-controls">
      <select className="ws-project-picker" data-long-list={items.length > 8 || undefined}
        aria-label={text.choose} value={active.id} onChange={event => setActiveId(event.target.value)}>
        {items.map((item, index) => <option key={item.id} value={item.id}>{item.title || `${text.view} ${index + 1}`}</option>)}
      </select>
      {items.length <= 8 && <div className="ws-project-choices" role="group" aria-label={text.choose}>
        {items.map((item, index) => <button type="button" key={item.id} aria-pressed={index === selected}
          aria-controls={`${listId}-${index}`} onClick={() => setActiveId(item.id)}>
          {item.title || `${text.view} ${index + 1}`}
        </button>)}
      </div>}
      <div className="ws-project-nav" role="group" aria-label={text.gallery}>
        <button type="button" onClick={() => advance(-1)} aria-label={text.previous}><ArrowLeft size={19} /></button>
        <span aria-live="polite" aria-atomic="true"><span className="ws-visual-sr-only">{active?.title}, </span>{selected + 1} / {items.length}</span>
        <button type="button" onClick={() => advance(1)} aria-label={text.next}><ArrowRight size={19} /></button>
      </div>
    </div>}
    <div className="ws-project-panels">
      {items.map((item, index) => <article key={item.id} id={`${listId}-${index}`} className="ws-project-panel"
        data-item-id={item.id} hidden={!editable && index !== selected}>
        {(item.image?.src || editable) && <div className="ws-project-media">{media(item, index)}</div>}
        <div className="ws-project-copy">{copy(item, index)}</div>
      </article>)}
    </div>
  </div>;
}

export function ProjectIndex({ items, editable, language = "de", media, copy }: ItemsProps) {
  const [category, setCategory] = useState<string>();
  const categories = [...new Set(items.map(item => item.meta?.trim()).filter((label): label is string => Boolean(label)))];
  const selected = !editable && category && categories.includes(category) ? category : undefined;
  const results = selected ? items.filter(item => item.meta?.trim() === selected) : items;
  const featured = (!selected || results.length === 1) ? results.find(item => item.image?.src)?.id : undefined;
  const text = labels[language];

  return <div className="ws-project-index">
    {!editable && categories.length > 1 && <div className="ws-project-controls">
      <div className="ws-index-filters" role="group" aria-label={text.filter}>
        <button type="button" aria-pressed={!selected} onClick={() => setCategory(undefined)}>{text.all}</button>
        {categories.map(label => <button key={label} type="button" aria-pressed={label === selected}
          onClick={() => setCategory(label)}>{label}</button>)}
      </div>
      <span className="ws-index-count" role="status">
        {results.length} {results.length === 1 ? text.project : text.projects}
      </span>
    </div>}
    <div className="ws-project-index-grid" key={selected ? "category:" + selected : "all"}>
      {results.map(item => {
        const index = items.indexOf(item);
        return <article key={item.id} className="ws-index-project"
          data-feature={item.id === featured || undefined} data-item-id={item.id}>
          {(item.image?.src || editable) && <div className="ws-index-project-media">{media(item, index)}</div>}
          <div className="ws-index-project-copy">{copy(item, index)}</div>
        </article>;
      })}
    </div>
  </div>;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const lastSceneHold = .62;

export function SceneSequence({ items, editable, motion, media, copy }: ItemsProps & { motion: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = root.current;
    const scene = stage.current;
    if (!host || !scene || editable || !motion || items.length < 2 || items.length > 6 || typeof IntersectionObserver === "undefined") return;

    const panels = Array.from(scene.querySelectorAll<HTMLElement>("[data-scene-panel]"));
    const preference = window.matchMedia("(min-width: 861px) and (min-height: 580px) and (prefers-reduced-motion: no-preference)");
    let near = false;
    let frame = 0;
    let disposed = false;
    function paint() {
      frame = 0;
      if (!host || !scene || !host.hasAttribute("data-pinned")) return;
      const distance = host.offsetHeight - scene.offsetHeight;
      const position = clamp01(-host.getBoundingClientRect().top / Math.max(1, distance)) * (panels.length - 1 + lastSceneHold);
      for (const [index, panel] of panels.entries()) {
        panel.style.setProperty("--scene-exit", String(clamp01((position - index - .36) / .64)));
      }
    }
    function request() {
      if (near && !frame && !document.hidden && host?.hasAttribute("data-pinned")) frame = window.requestAnimationFrame(paint);
    }
    function configure() {
      if (disposed || !host || !scene) return;
      host.toggleAttribute("data-pinned", preference.matches && host.clientWidth >= 780);
      if (scene.offsetHeight > window.innerHeight - 20) host.removeAttribute("data-pinned");
      request();
    }

    const observer = new IntersectionObserver(([entry]) => {
      near = Boolean(entry?.isIntersecting);
      if (near) request();
      else {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
    }, { rootMargin: "180px 0px" });
    observer.observe(host);
    preference.addEventListener("change", configure);
    window.addEventListener("resize", configure);
    window.addEventListener("scroll", request, { passive: true });
    document.addEventListener("visibilitychange", request);
    configure();
    void document.fonts?.ready.then(configure);
    return () => {
      disposed = true;
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      host.removeAttribute("data-pinned");
      preference.removeEventListener("change", configure);
      window.removeEventListener("resize", configure);
      window.removeEventListener("scroll", request);
      document.removeEventListener("visibilitychange", request);
    };
  }, [editable, items.length, motion]);

  return <div className="ws-scene-sequence" ref={root}
    style={{ "--scene-intervals": items.length - 1 + lastSceneHold } as CSSProperties}>
    <div className="ws-scene-stage" ref={stage}>
      {items.map((item, index) => <article key={item.id} className="ws-scene-panel" data-scene-panel data-item-id={item.id}
        style={{ "--scene-order": items.length - index } as CSSProperties}
        onFocusCapture={event => {
          const host = root.current;
          const scene = stage.current;
          if (!host?.hasAttribute("data-pinned") || !scene || !(event.target as HTMLElement).matches(":focus-visible")) return;
          const distance = host.offsetHeight - scene.offsetHeight;
          window.scrollBy({ top: host.getBoundingClientRect().top + distance * index / (items.length - 1 + lastSceneHold), behavior: "instant" });
        }}>
        {(item.image?.src || editable) && <div className="ws-scene-media">{media(item, index)}</div>}
        <div className="ws-scene-copy">{copy(item, index)}</div>
      </article>)}
    </div>
  </div>;
}

const workflowLabels = {
  de: { steps: "Schritte auswählen", pause: "Pause", play: "Abspielen", reset: "Neu starten", next: "Nächster Schritt", compactNext: "Weiter", step: "Schritt" },
  en: { steps: "Choose a step", pause: "Pause", play: "Play", reset: "Restart", next: "Next step", compactNext: "Next", step: "Step" },
};
const workflowStepDuration = 4600;

export function WorkflowDemo({ items, editable, motion, language = "de", media, copy }: ItemsProps & { motion: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(true);
  const [visible, setVisible] = useState(false);
  const [allowsMotion, setAllowsMotion] = useState(false);
  const text = workflowLabels[language];
  const current = Math.min(active, Math.max(0, items.length - 1));
  const canPlay = !editable && motion && items.length > 1 && allowsMotion;
  const running = canPlay && !paused;

  useEffect(() => {
    const node = root.current;
    if (!node || editable || !motion || items.length < 2 || typeof IntersectionObserver === "undefined") return;
    const preference = window.matchMedia("(prefers-reduced-motion: no-preference)");
    let inView = false;
    const update = () => {
      setAllowsMotion(preference.matches);
      setVisible(inView && !document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => { inView = Boolean(entry?.isIntersecting); update(); }, { threshold: .18 });
    observer.observe(node);
    preference.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [editable, items.length, motion]);

  useEffect(() => {
    if (!running || !visible) return;
    const timer = window.setTimeout(() => setActive((current + 1) % items.length), workflowStepDuration);
    return () => window.clearTimeout(timer);
  }, [current, items.length, running, visible]);

  function select(index: number) {
    setActive(index);
    setPaused(true);
  }

  function togglePlayback() {
    setPaused(running);
    const widget = root.current;
    if (running || !widget) return;
    const bounds = widget.getBoundingClientRect();
    if (bounds.top < 0 || bounds.bottom > window.innerHeight) {
      widget.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  return <div className="ws-workflow" ref={root} data-playing={running && visible || undefined}
    style={{ "--workflow-step-time": `${workflowStepDuration}ms` } as CSSProperties} onFocusCapture={event => {
    if ((event.target as HTMLElement).closest(".ws-workflow-panels")) setPaused(true);
  }}>
    {!editable && items.length > 1 && <ol className="ws-workflow-steps" aria-label={text.steps}>
      {items.map((item, index) => <li key={item.id}>
        <button type="button" aria-current={index === current ? "step" : undefined} onClick={() => select(index)}>
          <span className="ws-workflow-number" aria-hidden="true">{index < current ? <Check size={15} /> : index + 1}</span>
          <span>{item.title || `${text.step} ${index + 1}`}</span>
        </button>
      </li>)}
    </ol>}
    <div className="ws-workflow-panels" aria-live={!editable && !running ? "polite" : "off"}>
      {items.map((item, index) => <article key={item.id} className="ws-workflow-panel" data-item-id={item.id}
        hidden={!editable && current !== index}>
        <div className="ws-workflow-copy">{copy(item, index)}</div>
        {(item.image?.src || editable) && <div className="ws-workflow-media">{media(item, index)}</div>}
      </article>)}
    </div>
    {!editable && items.length > 1 && <div className="ws-workflow-controls">
      <span>{current + 1} / {items.length}</span>
      <div className="ws-workflow-actions">
        {canPlay && <button type="button" onClick={togglePlayback}>{running ? <Pause size={16} /> : <Play size={16} />}{running ? text.pause : text.play}</button>}
        <button type="button" aria-label={text.next} onClick={() => select((current + 1) % items.length)}><ArrowRight size={16} /><span className="ws-workflow-next-label">{text.next}</span><span className="ws-workflow-next-short">{text.compactNext}</span></button>
        <button type="button" className="ws-workflow-reset" aria-label={text.reset} onClick={() => select(0)}><RotateCcw size={16} /></button>
      </div>
    </div>}
  </div>;
}
