"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { colorModeStorageKey, themeColors, type SiteColorMode } from "@/lib/site-color-mode";
import type { SiteLanguage } from "@/lib/types";

function showColorMode(mode: SiteColorMode) {
  document.documentElement.dataset.sebMode = mode;
  document.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.setAttribute("content", themeColors[mode]));
}

export function ColorModeSwitch({ language }: { language: SiteLanguage }) {
  const [mode, setMode] = useState<SiteColorMode>("dark");
  const isLight = mode === "light";

  useEffect(() => {
    const initialMode = document.documentElement.dataset.sebMode === "light" ? "light" : "dark";
    setMode(initialMode);
    showColorMode(initialMode);
    const sync = (event: StorageEvent) => {
      if (event.key !== colorModeStorageKey && event.key !== null) return;
      const next = event.newValue === "light" ? "light" : "dark";
      setMode(next);
      showColorMode(next);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const toggle = () => {
    const next = isLight ? "dark" : "light";
    setMode(next);
    showColorMode(next);
    try { window.localStorage.setItem(colorModeStorageKey, next); } catch { /* Keep the selected view for this visit. */ }
  };
  const label = language === "en" ? "Light appearance" : "Helle Ansicht";
  const hint = language === "en"
    ? isLight ? "Switch to dark appearance" : "Switch to light appearance"
    : isLight ? "Zur dunklen Ansicht wechseln" : "Zur hellen Ansicht wechseln";
  return <button type="button" className="ws-color-mode" aria-label={label} aria-pressed={isLight} title={hint} onClick={toggle}>
    {isLight ? <Moon size={19} aria-hidden="true" /> : <Sun size={19} aria-hidden="true" />}
  </button>;
}
