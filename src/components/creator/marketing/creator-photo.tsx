"use client";

import type { ImageValue } from "@/lib/types";
import { EditableImage } from "@/components/site/editable";

/** The authoring view keeps the real CMS image controls; public art uses local responsive files. */
export function CreatorPhoto({ image, editable, onChange, className = "", priority = false, loading, sizes = "100vw" }: {
  image?: ImageValue; editable?: boolean; onChange?: (image: ImageValue) => void; className?: string; priority?: boolean; loading?: "eager" | "lazy"; sizes?: string;
}) {
  if (editable) return <EditableImage image={image} editable onChange={onChange} className={className} priority={priority} sizes={sizes} />;
  if (!image?.src) return null;
  const responsive = /^\/media\/creator\/marketing\/.+-1600\.webp$/.test(image.src);
  return <figure className={`ws-image ${className}`}><img src={image.src} srcSet={image.srcSet ?? (responsive ? `${image.src.replace("-1600.webp", "-800.webp")} 800w, ${image.src} 1600w` : undefined)} sizes={image.sizes ?? (responsive ? sizes : undefined)} alt={image.alt} width={image.width ?? 1600} height={image.height ?? 1067} style={{ objectPosition: image.position }} loading={loading ?? (priority ? "eager" : "lazy")} fetchPriority={priority ? "high" : undefined} decoding="async" /></figure>;
}
