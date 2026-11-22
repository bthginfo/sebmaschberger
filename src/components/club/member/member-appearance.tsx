import type { CSSProperties, ReactNode } from "react";
import type { ClubAppearance, ClubHomeBlock, ClubLayout, ClubTheme } from "@/lib/club/appearance-model";
import "./member.css";

export const memberThemes = {
  pitch: { paper: "#f3f4ef", surface: "#ffffff", line: "#dce3d8", ink: "#0c1620", muted: "#52606a", accent: "#d8f871", accentHover: "#c9ed59", tint: "#e7efdb", link: "#304f37", feature: "#132a32" },
  coast: { paper: "#edf3f7", surface: "#ffffff", line: "#d4e0e9", ink: "#132b3d", muted: "#4a6173", accent: "#aee5ff", accentHover: "#93d8f8", tint: "#dfeef7", link: "#215678", feature: "#153653" },
  dusk: { paper: "#f1eef6", surface: "#fefcff", line: "#e0d8eb", ink: "#261b35", muted: "#61556d", accent: "#e2caf8", accentHover: "#d9bbf4", tint: "#eae1f2", link: "#614285", feature: "#342344" },
  sand: { paper: "#f8f2e7", surface: "#fffdf8", line: "#e9ddcb", ink: "#31251d", muted: "#675a4b", accent: "#ffd68c", accentHover: "#ffca6c", tint: "#f3e5ce", link: "#784b27", feature: "#3c2a21" },
} satisfies Record<ClubTheme, Record<string, string>>;

export const defaultMemberCover = "/placeholders/visual-starter/editorial.webp";

export function memberThemeStyle(theme: ClubTheme) {
  const palette = memberThemes[theme] ?? memberThemes.pitch;
  return {
    "--club-paper": palette.paper, "--club-card": palette.surface, "--club-rule": palette.line, "--club-ink": palette.ink,
    "--club-muted": palette.muted, "--club-accent": palette.accent, "--club-accent-hover": palette.accentHover,
    "--club-accent-muted": palette.tint, "--club-link": palette.link, "--club-feature": palette.feature,
  } as CSSProperties;
}

export function memberCoverSource(appearance: Pick<ClubAppearance, "imageMode" | "imageVersion">, owner = false) {
  if (appearance.imageMode === "default") return defaultMemberCover;
  if (appearance.imageMode !== "upload" || !appearance.imageVersion) return undefined;
  return "/api/club/appearance-image/" + encodeURIComponent(appearance.imageVersion) + (owner ? "?scope=cms" : "");
}

export function memberWelcomeTitle(title: string, name: string, language: "de" | "en") {
  const firstName = name.trim().split(/\s+/u)[0] || "";
  if (title.trim()) return title.replaceAll("{name}", () => firstName);
  if (!firstName) return language === "de" ? "Willkommen." : "Welcome.";
  return language === "de" ? `Hallo, ${firstName}.` : `Hi, ${firstName}.`;
}

export function MemberHomeGrid({ layout, blocks, render, compact = false }: {
  layout: ClubLayout; blocks: ClubHomeBlock[]; render: (block: ClubHomeBlock) => ReactNode; compact?: boolean;
}) {
  const items = (group: ClubHomeBlock[]) => group.map(block => <div className="club-member-home-block" data-block={block} key={block}>{render(block)}</div>);
  if (layout === "balanced" && !compact && blocks.length > 1) {
    const middle = Math.ceil(blocks.length / 2);
    return <div className="club-member-overview" data-layout={layout}>
      <div className="club-member-overview-column">{items(blocks.slice(0, middle))}</div>
      <div className="club-member-overview-column">{items(blocks.slice(middle))}</div>
    </div>;
  }
  return <div className="club-member-overview" data-layout={compact || blocks.length === 1 ? "stack" : layout}>{items(blocks)}</div>;
}
