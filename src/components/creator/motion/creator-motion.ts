"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

const ease = "cubic-bezier(.16,1,.3,1)";
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const inEditor = (node: Element) => Boolean(node.closest(".cms-root,.ws-site-editable,[data-motion='off']"));

/** Visible-by-default: observation never installs a hidden resting state. */
export function useEditorialMotion(root: RefObject<HTMLElement | null>, disabled: boolean, pageKey: string, layout = false) {
  useEffect(() => {
    const host = root.current;
    if (!host || disabled || reduced() || typeof IntersectionObserver === "undefined" || typeof Element.prototype.animate !== "function") return;
    if (layout) {
      const groups: [string, string][] = [
        ["main > .ws-section-statement .ws-statement-heading", "poster"],
        ["main > .ws-section-statement .ws-statement-aside", "aside"],
        ["main > .ws-section-list .ws-content-list > li", "row"],
        ["main > .ws-section-split .ws-split-image", "media"],
        ["main > .ws-section-split .ws-split-copy", "aside"],
        ["main > .ws-section-steps .ws-steps > li", "step"],
        ["main > .ws-section-cta .ws-cta-heading", "poster"],
      ];
      for (const [selector, kind] of groups) host.querySelectorAll<HTMLElement>(selector).forEach(node => { node.dataset.creatorReveal = kind; });
    }
    const selector = layout ? "[data-creator-reveal='poster'],[data-creator-reveal='aside'],[data-creator-reveal='row'],[data-creator-reveal='step'],[data-creator-reveal='media'],[data-creator-reveal='footer']" : "[data-creator-reveal]";
    const animations = new Set<Animation>();
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const node = entry.target as HTMLElement;
        if (!entry.isIntersecting || inEditor(node)) continue;
        observer.unobserve(node);
        const kind = node.dataset.creatorReveal;
        const from = kind === "artifact" ? { opacity: .55 }
          : kind === "poster" || kind === "footer" ? { transform: "translate3d(-30px,0,0) rotate(-.7deg)", opacity: .86 }
          : kind === "media" ? { transform: "translate3d(0,22px,0) scale(.97)", opacity: .68 }
          : kind === "row" || kind === "step" ? { transform: "translate3d(24px,0,0)", opacity: .42 }
          : kind === "product" ? { transform: "translate3d(0,28px,0) rotate(.6deg)", opacity: .55 }
          : { transform: "translate3d(0,24px,0)", opacity: .55 };
        const animation = node.animate([from, kind === "artifact" ? { opacity: 1 } : { transform: "translate3d(0,0,0) rotate(0deg) scale(1)", opacity: 1 }], { duration: kind === "poster" ? 760 : 580, easing: ease, fill: "none" });
        animations.add(animation); animation.onfinish = () => animations.delete(animation);
        node.dataset.motionSeen = "true";
      }
    }, { threshold: .08, rootMargin: "0px 0px -20px 0px" });
    host.querySelectorAll<HTMLElement>(selector).forEach(node => {
      if (inEditor(node)) return;
      if (node.getBoundingClientRect().top < window.innerHeight - 20) return;
      observer.observe(node);
    });
    const stop = () => { if (query.matches) { observer.disconnect(); animations.forEach(animation => animation.cancel()); } };
    const engage = (event: Event) => { for (const animation of animations) { const target = (animation.effect as KeyframeEffect | null)?.target; if (target instanceof Element && target.contains(event.target as Node)) { animation.cancel(); animations.delete(animation); } } };
    query.addEventListener("change", stop);
    host.addEventListener("pointerdown", engage, { passive: true }); host.addEventListener("focusin", engage);
    return () => { observer.disconnect(); query.removeEventListener("change", stop); host.removeEventListener("pointerdown", engage); host.removeEventListener("focusin", engage); animations.forEach(animation => animation.cancel()); };
  }, [root, disabled, pageKey, layout]);
}

/** Cards keep their identity when the real React state moves them between columns. */
export function useFlipMotion(root: RefObject<HTMLElement | null>, revision: unknown, disabled = false) {
  const positions = useRef(new Map<string, { left: number; top: number }>());
  const running = useRef<Animation[]>([]);
  useEffect(() => {
    const host = root.current;
    if (!host || disabled) return;
    // Capture just before an action as well as after each commit. This includes
    // responsive reflow and interrupted animation, without storing scroll deltas.
    const capture = () => {
      const basis = host.getBoundingClientRect();
      const next = new Map<string, { left: number; top: number }>();
      host.querySelectorAll<HTMLElement>("[data-flip-key]").forEach(node => {
        const rect = node.getBoundingClientRect();
        next.set(node.dataset.flipKey!, { left: rect.left - basis.left, top: rect.top - basis.top });
      });
      positions.current = next;
    };
    host.addEventListener("click", capture, true); host.addEventListener("keydown", capture, true); host.addEventListener("change", capture, true);
    return () => { host.removeEventListener("click", capture, true); host.removeEventListener("keydown", capture, true); host.removeEventListener("change", capture, true); };
  }, [root, disabled]);
  useLayoutEffect(() => {
    const host = root.current;
    running.current.forEach(animation => animation.cancel()); running.current = [];
    if (!host) return;
    const basis = host.getBoundingClientRect();
    const next = new Map<string, { left: number; top: number }>();
    host.querySelectorAll<HTMLElement>("[data-flip-key]").forEach(node => {
      const key = node.dataset.flipKey!;
      const bounds = node.getBoundingClientRect(), previous = positions.current.get(key);
      const rect = { left: bounds.left - basis.left, top: bounds.top - basis.top };
      next.set(key, rect);
      if (disabled || reduced() || inEditor(node) || typeof node.animate !== "function") return;
      const x = previous ? previous.left - rect.left : 0, y = previous ? previous.top - rect.top : 16;
      if (Math.abs(x) + Math.abs(y) < 2) return;
      running.current.push(node.animate([{ transform: `translate3d(${x}px,${y}px,0)`, opacity: previous ? 1 : .5, zIndex: 3 }, { transform: "translate3d(0,0,0)", opacity: 1, zIndex: 3 }], { duration: previous ? 460 : 300, easing: ease }));
    });
    positions.current = next;
    return () => { running.current.forEach(animation => animation.cancel()); };
  }, [root, revision, disabled]);
}

/** Icon-only acknowledgement: the actual tap/focus target never moves. */
export function useActionMotion(root: RefObject<HTMLElement | null>, disabled = false) {
  useEffect(() => {
    const host = root.current;
    if (!host || disabled || typeof Element.prototype.animate !== "function") return;
    const animations = new Set<Animation>();
    const clicked = (event: MouseEvent) => {
      if (reduced()) return;
      const button = (event.target as Element).closest<HTMLButtonElement>("button");
      if (!button || button.disabled || inEditor(button)) return;
      const icon = button.querySelector<SVGElement>(":scope > svg");
      if (!icon) return;
      const animation = icon.animate([{ transform: "scale(.72) rotate(-12deg)" }, { transform: "scale(1.2) rotate(5deg)", offset: .55 }, { transform: "scale(1) rotate(0deg)" }], { duration: 340, easing: ease });
      animations.add(animation); animation.onfinish = () => animations.delete(animation);
    };
    host.addEventListener("click", clicked);
    return () => { host.removeEventListener("click", clicked); animations.forEach(animation => animation.cancel()); };
  }, [root, disabled]);
}

export function useArtworkMotion(root: RefObject<HTMLElement | null>, artwork: RefObject<HTMLElement | null>, disabled: boolean) {
  useEffect(() => {
    const host = root.current, art = artwork.current;
    if (!host || !art || disabled || reduced() || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let frame = 0, x = 0, y = 0;
    const paint = () => { art.style.setProperty("--art-x", `${x}px`); art.style.setProperty("--art-y", `${y}px`); frame = 0; };
    const move = (event: PointerEvent) => { if (reduced()) return; const bounds = host.getBoundingClientRect(); x = ((event.clientX - bounds.left) / bounds.width - .5) * 12; y = ((event.clientY - bounds.top) / bounds.height - .5) * 8; if (!frame) frame = requestAnimationFrame(paint); };
    const leave = () => { x = 0; y = 0; if (!frame) frame = requestAnimationFrame(paint); };
    host.addEventListener("pointermove", move, { passive: true }); host.addEventListener("pointerleave", leave);
    return () => { host.removeEventListener("pointermove", move); host.removeEventListener("pointerleave", leave); cancelAnimationFrame(frame); art.style.removeProperty("--art-x"); art.style.removeProperty("--art-y"); };
  }, [root, artwork, disabled]);
}

/** Directional hysteresis keeps the sticky navigation quiet around tiny scroll changes. */
export function useScrollNavigation(header: RefObject<HTMLElement | null>, pageKey: string, menuOpen: boolean, disabled = false) {
  useEffect(() => {
    const node = header.current;
    if (!node) return;
    node.dataset.navHidden = "false";
    if (disabled || menuOpen) return;
    let last = Math.max(0, window.scrollY), accumulated = 0, frame = 0;
    const paint = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY), delta = y - last;
      last = y;
      if (y < 24 || node.contains(document.activeElement)) { node.dataset.navHidden = "false"; accumulated = 0; return; }
      if (delta === 0) return;
      if (Math.sign(delta) !== Math.sign(accumulated)) accumulated = 0;
      accumulated += delta;
      if (accumulated < -18) { node.dataset.navHidden = "false"; accumulated = 0; }
      else if (accumulated > 42 && y > 160) { node.dataset.navHidden = "true"; accumulated = 0; }
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(paint); };
    const focus = () => { node.dataset.navHidden = "false"; accumulated = 0; };
    window.addEventListener("scroll", scroll, { passive: true }); window.addEventListener("popstate", focus); window.addEventListener("hashchange", focus); node.addEventListener("focusin", focus);
    return () => { window.removeEventListener("scroll", scroll); window.removeEventListener("popstate", focus); window.removeEventListener("hashchange", focus); node.removeEventListener("focusin", focus); cancelAnimationFrame(frame); node.dataset.navHidden = "false"; };
  }, [header, pageKey, menuOpen, disabled]);
}
