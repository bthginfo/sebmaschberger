"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LiquidGlassSettings } from "@/lib/types";

/** Optional, brand-neutral atmosphere. Foreground content keeps native scrolling. */
export function LiquidGlassLayer({ settings, editable, language }: { settings: LiquidGlassSettings; editable: boolean; language: "de" | "en" }) {
  const layer = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [paused, setPaused] = useState(false);
  const pause = useRef(false);
  const resume = useRef<() => void>(() => {});
  const [footer, setFooter] = useState<HTMLElement | null>(null);

  useEffect(() => { try { setPaused(sessionStorage.getItem("ws-liquid-glass-paused") === "1"); } catch {} }, []);
  const toggle = () => { const next = !paused; setPaused(next); try { sessionStorage.setItem("ws-liquid-glass-paused", next ? "1" : "0"); } catch {} };

  useEffect(() => {
    const element = layer.current;
    const root = element?.parentElement;
    if (!element || !root) return;
    setFooter(root.querySelector<HTMLElement>(".ws-footer-bottom"));
    const surface = canvas.current;
    const context = surface?.getContext("2d", { alpha: true });
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let width = innerWidth, height = innerHeight, scale = 1, frame = 0, last = 0, elapsed = 0;
    let target = scrollY, scroll = target;
    let currentCard: HTMLElement | null = null;
    let seed = 719;
    const random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
    const stars = Array.from({ length: 90 }, () => ({ x: random(), y: random(), depth: 0.2 + random() * 0.8, phase: random() * Math.PI * 2 }));
    const moving = () => settings.enabled && !pause.current && !editable && !preference.matches && !document.hidden;
    function paint() {
      if (!context || !surface) return;
      context.setTransform(scale, 0, 0, scale, 0, 0); context.clearRect(0, 0, width, height);
      for (const star of stars) {
        const x = (star.x * width + elapsed * (0.3 + settings.speed / 90) * star.depth) % width;
        const y = ((star.y * height - scroll * star.depth * 0.04) % height + height) % height;
        context.globalAlpha = (0.14 + star.depth * 0.28) * (0.7 + Math.sin(elapsed * 0.25 + star.phase) * 0.3);
        context.fillStyle = "#c8d8ff"; context.beginPath(); context.arc(x, y, 0.4 + star.depth * 0.65, 0, Math.PI * 2); context.fill();
      }
      context.globalAlpha = 1;
    }
    function tick(now: number) {
      frame = 0;
      if (!moving()) return;
      if (!last || now - last > 48) {
        const delta = last ? Math.min((now - last) / 1000, 0.08) : 0.016; last = now; elapsed += delta;
        scroll += (target - scroll) * (1 - Math.exp(-delta * 6));
        root!.style.setProperty("--lg-scroll", `${Math.min(scroll / Math.max(innerHeight, 1), 1) * settings.depth * 0.55}px`);
        paint();
      }
      if (settings.background === "space" || Math.abs(target - scroll) > 0.1) frame = requestAnimationFrame(tick);
    }
    const wake = () => { if (!frame && moving()) frame = requestAnimationFrame(tick); };
    const resetCard = () => { if (currentCard) { currentCard.style.removeProperty("--lg-tilt-x"); currentCard.style.removeProperty("--lg-tilt-y"); currentCard = null; } };
    const restart = () => { cancelAnimationFrame(frame); frame = 0; last = 0; element.dataset.paused = String(!moving()); if (preference.matches) { root.style.removeProperty("--lg-scroll"); resetCard(); } paint(); wake(); };
    resume.current = restart;
    const resize = new ResizeObserver(() => { width = element.clientWidth || innerWidth; height = element.clientHeight || innerHeight; scale = Math.min(1, 1100 / width); if (surface) { surface.width = Math.round(width * scale); surface.height = Math.round(height * scale); } paint(); });
    resize.observe(element);
    const onScroll = () => { target = scrollY; wake(); };
    const pointer = (event: PointerEvent) => {
      if (!moving() || !settings.feedback || event.pointerType !== "mouse") return;
      const card = (event.target as Element).closest<HTMLElement>("article[data-item-id], .ws-card, .ws-person");
      if (currentCard !== card) { resetCard(); currentCard = card; }
      if (!card) return;
      const box = card.getBoundingClientRect();
      card.style.setProperty("--lg-tilt-x", `${((event.clientX - box.left) / box.width - 0.5) * 2.4}deg`);
      card.style.setProperty("--lg-tilt-y", `${-((event.clientY - box.top) / box.height - 0.5) * 2}deg`);
    };
    window.addEventListener("scroll", onScroll, { passive: true }); root.addEventListener("pointermove", pointer, { passive: true }); root.addEventListener("pointerleave", resetCard);
    preference.addEventListener("change", restart); document.addEventListener("visibilitychange", restart); restart();
    return () => { resume.current = () => {}; cancelAnimationFrame(frame); resize.disconnect(); resetCard(); root.style.removeProperty("--lg-scroll"); window.removeEventListener("scroll", onScroll); root.removeEventListener("pointermove", pointer); root.removeEventListener("pointerleave", resetCard); preference.removeEventListener("change", restart); document.removeEventListener("visibilitychange", restart); };
  }, [editable, settings.enabled, settings.background, settings.speed, settings.depth, settings.feedback]);
  useEffect(() => { pause.current = paused; resume.current(); }, [paused]);

  return <>
    <div ref={layer} className="ws-liquid-background" data-lg-background="" data-kind={settings.background} data-paused={!settings.enabled || paused || editable ? "true" : undefined} aria-hidden="true"><div className="ws-liquid-haze" /><div className="ws-liquid-haze-secondary" />{settings.background === "space" && <canvas ref={canvas} />}</div>
    {!editable && settings.enabled && footer && createPortal(<button type="button" className="ws-liquid-motion-control" aria-pressed={paused} onClick={toggle}>{language === "en" ? paused ? "Resume motion" : "Pause motion" : paused ? "Bewegung fortsetzen" : "Bewegung pausieren"}</button>, footer)}
  </>;
}
