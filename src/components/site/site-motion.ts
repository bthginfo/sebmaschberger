import type { SectionType } from "@/lib/types";

// These scenes have their own timelines or handle interactive media and forms.
const dedicatedMotion = new Set<SectionType>([
  "hero", "showcase-hero", "editorial-hero", "cinematic-hero", "noir-hero", "navy-hero",
  "scroll-story", "scene-sequence", "workflow-demo", "project-stage", "project-index", "editorial-index",
  "motion-story", "scroll-3d", "stacked-panels", "case-deck", "image-curtain", "portrait-rail",
  "creator-hero", "creator-hero-stack", "creator-scroll-story", "creator-lens", "creator-orbit",
  "creator-remix", "creator-engagement", "creator-journey", "creator-demo",
  "restaurant-menu", "reservation", "contact", "navy-contact", "map", "video", "assistant-showcase",
]);

const copy = ".ws-section-intro, h2, .ws-statement-aside, .ws-cta-text, .ws-section-text";
const cards = "article[data-item-id], li[data-item-id], figure[data-item-id], .ws-person, .ws-editorial-card, .ws-blog-card";
const excluded = "button, [role='tablist'], [role='tabpanel'], details, form, [aria-hidden='true']";

export function sectionEntrance(type: SectionType, animation: "none" | "reveal" | "parallax", editable?: boolean) {
  return !editable && animation !== "none" && !dedicatedMotion.has(type) ? "" : undefined;
}

export function installSiteMotion(root: HTMLElement) {
  const view = root.ownerDocument.defaultView;
  if (!view || typeof IntersectionObserver === "undefined" || typeof view.matchMedia !== "function") return;
  const preference = view.matchMedia("(prefers-reduced-motion: reduce)");
  const targets = new Map<Element, { kind: "legacy" | "copy" | "card"; order: number }>();

  function clear() {
    for (const node of targets.keys()) {
      node.classList.remove("ws-in-view");
      node.removeAttribute("data-ws-entered");
      (node as HTMLElement).style.removeProperty("--ws-enter-delay");
    }
    targets.clear();
  }

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting || preference.matches) continue;
      observer.unobserve(entry.target);
      const target = targets.get(entry.target);
      if (!target) continue;
      if (target.kind === "legacy") entry.target.classList.add("ws-in-view");
      else {
        const element = entry.target as HTMLElement;
        element.style.setProperty("--ws-enter-delay", target.order * 36 + "ms");
        element.dataset.wsEntered = target.kind;
      }
    }
  }, { threshold: .06 });

  function connect() {
    observer.disconnect();
    clear();
    if (preference.matches) return;
    for (const node of root.querySelectorAll<HTMLElement>("[data-ws-reveal]")) {
      targets.set(node, { kind: "legacy", order: 0 });
    }
    for (const section of root.querySelectorAll<HTMLElement>("[data-ws-section-entrance]")) {
      const nodes = Array.from(section.querySelectorAll<HTMLElement>(copy + ", " + cards));
      let cardOrder = 0;
      for (const node of nodes) {
        if (node.closest("[data-ws-section-entrance]") !== section || node.closest(excluded)) continue;
        const isCard = node.matches(cards);
        if (node.parentElement?.closest(cards) || !isCard && node.parentElement?.closest(copy)) continue;
        const rect = node.getBoundingClientRect();
        // Initial text, media and focused content stay fully visible while hydration completes.
        if (!rect.width || !rect.height || rect.top < view!.innerHeight || node.contains(root.ownerDocument.activeElement)) continue;
        targets.set(node, { kind: isCard ? "card" : "copy", order: isCard ? cardOrder++ % 4 : 0 });
      }
    }
    for (const node of targets.keys()) observer.observe(node);
  }

  connect();
  preference.addEventListener("change", connect);
  return () => {
    preference.removeEventListener("change", connect);
    observer.disconnect();
    clear();
  };
}
