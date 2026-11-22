
import { isolatedMediaUrl } from "./isolated-media";
import type { ImageValue, SectionContent } from "./types";

const studio = "/assets/motion-story/atelier-v2/";

export const motionStoryPoster: ImageValue = {
  src: studio + "standbild.webp",
  alt: "Hände kneten grauen Ton auf einer Arbeitsplatte im Keramikatelier.",
  position: "50% 50%",
};

export const motionStoryObject: ImageValue = {
  src: "/assets/motion-story/object-studio/bisque.webp",
  alt: "Freigestellter, handgetöpferter Becher aus hellem, unglasiertem Steinzeug.",
  position: "50% 50%",
};

export const motionStoryStudioPoster: ImageValue = {
  src: "/assets/motion-story/models/joinery.webp",
  alt: "Ein Sideboard aus Nussbaum mit sichtbaren Schubladen und Deckplatte.",
  position: "50% 50%",
  width: 973,
  height: 596,
};

export const motionStoryStudioModel = "/assets/motion-story/models/joinery.glb";

export function motionStoryModelUrl(value?: string) {
  return value && value.length <= 160 && /^\/assets\/motion-story\/models\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.glb$/.test(value)
    ? value : undefined;
}

export const motionStorySceneLimit = 2;

export function motionStoryScenes(content: SectionContent) {
  return (content.items ?? []).filter(item => item.image?.src).slice(0, motionStorySceneLimit);
}

/** Keep validation of previously saved media references. The animated hero uses only images. */
export function motionStoryVideoUrl(value?: string): string | undefined {
  return value && /^\/(?:assets|media)\//.test(value) ? isolatedMediaUrl(value, "video") : undefined;
}
