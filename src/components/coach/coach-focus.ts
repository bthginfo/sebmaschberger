"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const focusable = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex="0"]';

export function useCoachFocus() {
  const [active, setActive] = useState(false);
  const surface = useRef<HTMLDivElement>(null);
  const exit = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const native = useRef(false);
  const wanted = useRef(false);

  const close = useCallback(() => {
    wanted.current = false;
    const element = surface.current;
    if (element && document.fullscreenElement === element) void document.exitFullscreen().catch(() => {});
    setActive(false);
  }, []);

  const open = useCallback((initiator?: HTMLElement) => {
    trigger.current = initiator ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    wanted.current = true;
    setActive(true);
    const element = surface.current;
    if (element?.requestFullscreen && document.fullscreenEnabled) {
      void element.requestFullscreen().then(() => {
        if (!wanted.current && document.fullscreenElement === element) return document.exitFullscreen();
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    function change() {
      if (surface.current && document.fullscreenElement === surface.current) native.current = true;
      else if (native.current) {
        native.current = false;
        wanted.current = false;
        setActive(false);
      }
    }
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);

  useEffect(() => {
    const element = surface.current;
    if (!active || !element) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => exit.current?.focus({ preventScroll: true }));

    function trap(event: KeyboardEvent) {
      if (event.key === "Escape" && !(event.target instanceof Element && event.target.closest("details[open]"))) {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(element!.querySelectorAll<HTMLElement>(focusable)).filter((control) => {
        const collapsed = control.closest("details:not([open])");
        return control.tabIndex >= 0 && control.getClientRects().length > 0 && !control.closest('[inert], [aria-hidden="true"]') &&
          (!collapsed || collapsed.querySelector(":scope > summary") === control);
      });
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) return;
      const focused = document.activeElement;
      if (!element!.contains(focused) || (event.shiftKey ? focused === first : focused === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }

    document.addEventListener("keydown", trap, true);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", trap, true);
      requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }));
    };
  }, [active, close]);

  return { active, surface, exit, open, close };
}
