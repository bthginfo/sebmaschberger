import type { ContentItem, CreatorLensPreset, SectionContent } from "../types";

export function lensPreset(item?: Pick<ContentItem, "lens">): CreatorLensPreset {
  const clamp = (value: unknown, fallback: number, min: number, max: number) => typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  return { x: clamp(item?.lens?.x, 50, 0, 100), y: clamp(item?.lens?.y, 50, 0, 100), radius: clamp(item?.lens?.radius, 25, 8, 100) };
}

export function createLensContent(): SectionContent {
  return { heading: "WECHSEL\nDEN BLICK.", text: "Ein Bild. Mehr als eine Perspektive.", subheading: "DEIN\nAUFTRITT.", image: { src: "/media/placeholder-landscape.svg", alt: "Eigenes freigegebenes Foto für das Portal einsetzen", position: "50% 50%" }, items: [
    { id: "lens-quiet", title: "Leise", text: "", lens: { x: 25, y: 52, radius: 17 } },
    { id: "lens-mix", title: "Im Mix", text: "", lens: { x: 55, y: 46, radius: 29 }, tags: ["default"] },
    { id: "lens-full", title: "Volle Farbe", text: "", lens: { x: 50, y: 50, radius: 100 } },
    { id: "lens-ui", title: "Portal-Bedienung", text: "", tags: ["ui"], details: ["position|Portal verschieben", "scene|Interaktive Bildkomposition", "hint|Am Bild tippen oder den Regler bewegen."] },
  ] };
}

export function createOrbitContent(): SectionContent {
  const placeholder = { src: "/media/placeholder-landscape.svg", alt: "Eigenes freigegebenes Creator-Motiv einsetzen", position: "50% 50%" as const };
  return { heading: "ALLES IN\nDEINEM ORBIT.", text: "Wähle einen Inhalt. Bring deine Welt zusammen.", subheading: "Dein Orbit.", primaryLabel: "Zusammenbringen", secondaryLabel: "Wieder verteilen", items: [
    { id: "orbit-photo", title: "Dein Blick.", text: "", image: { ...placeholder }, label: "Foto", icon: "Camera" },
    { id: "orbit-clip", title: "Dein Content.", text: "", image: { ...placeholder }, label: "Clip", icon: "Video" },
    { id: "orbit-live", title: "Deine Leute.", text: "", image: { ...placeholder }, label: "Live", icon: "Users" },
    { id: "orbit-drop", title: "Dein Drop.", text: "", image: { ...placeholder }, label: "Drop", icon: "Store" },
    { id: "orbit-kit", title: "Dein nächstes Kapitel.", text: "", image: { ...placeholder }, label: "Media Kit", icon: "FileText" },
    { id: "orbit-ui", title: "Orbit-Bedienung", text: "", tags: ["ui"], details: ["selectedLabel|Ausgewählt", "openLabel|Ansehen", "emptyLabel|Füge eigene Inhalte hinzu."] },
  ] };
}
