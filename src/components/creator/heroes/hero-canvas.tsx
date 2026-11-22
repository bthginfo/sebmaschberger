"use client";

import { useRef } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Play } from "lucide-react";
import type { ImageValue } from "@/lib/types";
import { ContentLink, EditableText } from "@/components/site/editable";
import { CreatorPhoto } from "../marketing/creator-photo";
import { useArtworkMotion } from "../motion/creator-motion";
import styles from "./heroes.module.css";

export type HeroPreset = "gaming" | "beauty" | "fitness" | "food" | "travel" | "fashion" | "music" | "tech" | "lifestyle" | "art";
export function HeroCanvas({ preset, creator, title, description, image, cta, href, secondaryCta, secondaryHref, headingTag = "h2", ui, editable, gallery=false, onTitle, onCreator, onDescription, onImage, onCta }: {
  preset: HeroPreset; creator: string; title: string; description?: string; image?: ImageValue; cta?: string; href?: string;
  secondaryCta?: string; secondaryHref?: string; headingTag?: "h1" | "h2"; ui: (key: string) => string; editable?: boolean; gallery?:boolean; onTitle?: (value: string) => void; onCreator?: (value: string) => void;
  onDescription?: (value: string) => void; onImage?: (value: ImageValue) => void; onCta?: (value: string) => void;
}) {
  const artwork = useRef<HTMLDivElement>(null);
  useArtworkMotion(artwork, artwork, Boolean(editable) || preset !== "gaming");
  const media = (className = "", override?: ImageValue) => <CreatorPhoto image={override ?? image} editable={editable} onChange={onImage} className={`${styles.heroPhoto} ${className} ${gallery&&(override??image)?.position==='50% 50%'?styles.galleryDefaultFocal:''}`} sizes="(max-width: 600px) 100vw, 60vw" />;
  const name = <EditableText as="span" value={creator} editable={editable} onChange={onCreator} className={styles.creatorName} />;
  const headline = <EditableText as={headingTag} value={title} editable={editable} onChange={onTitle} className={styles.canvasTitle} />;
  const copy = <EditableText as="p" value={description} editable={editable} onChange={onDescription} className={styles.canvasDescription} />;
  const action = <div className={styles.canvasActions} data-creator-canvas-actions=""><ContentLink href={href} editable={editable} className={styles.canvasAction}><EditableText as="span" value={cta} editable={editable} onChange={onCta} /><ArrowUpRight size={20} /></ContentLink>{secondaryCta && <ContentLink href={secondaryHref} editable={editable} className={styles.canvasSecondary}>{secondaryCta}<ArrowUpRight size={16} /></ContentLink>}</div>;
  const navigation = <div className={styles.canvasNavigation}>{ui("nav").split("·").filter(Boolean).map(label => <span key={label}>{label.trim()}</span>)}</div>;
  const top = <div className={styles.canvasTop} data-creator-canvas-top="">{name}{navigation}</div>;
  const live = ui("live");
  const hud = ui("hud");
  return <div ref={artwork} className={`${styles.heroCanvas} ${styles[preset]}`} data-hero-preset={preset} data-gallery={gallery?'true':undefined} data-motion={editable ? "off" : "hero"}>
    {preset === "gaming" && <>{media()}<div className={styles.gamingContent}>{top}<div className={styles.gamingBody} data-creator-canvas-copy="gaming">{live && <span className={styles.liveLabel}><i />{live}</span>}{headline}{copy}{action}</div>{hud && <div className={styles.gamingHud}><Play size={15} fill="currentColor" /><span>{hud}</span><ArrowRight size={22} /></div>}</div></>}
    {preset === "beauty" && <>{top}<div className={styles.beautyCopy}>{headline}{copy}{action}<span className={styles.beautyNote}>{ui("note")}</span></div>{media()}<span className={styles.beautyJournal}>{ui("badge")}</span></>}
    {preset === "fitness" && <>{media()}{top}<div className={styles.fitnessCopy}>{headline}{copy}{action}</div><div className={styles.fitnessStrip}>{ui("strip").split("·").map((value, n) => <span key={n}>{value}<ArrowUpRight size={20} /></span>)}</div></>}
    {preset === "food" && <>{top}<div className={styles.foodCopy}>{headline}{copy}{action}</div><div className={styles.foodImage}>{media()}<div className={styles.recipe}><span>{ui("recipeLabel")}</span><strong>{ui("recipe")}</strong><span>{ui("time")}<ArrowUpRight size={17} /></span></div></div></>}
    {preset === "travel" && <>{top}<div className={styles.travelTitle}>{headline}<span>{ui("coordinates")}</span></div><div className={styles.travelImage}>{media()}<div className={styles.travelRoute}><span>{ui("trip")}</span><ArrowDown size={26} /></div></div><div className={styles.travelBottom}>{copy}{action}</div></>}
    {preset === "fashion" && <><div className={styles.fashionName}>{name}</div><div className={styles.fashionNavigation}>{navigation}<span>{ui("note")}</span></div>{media()}<div className={styles.fashionCopy}>{headline}{copy}{action}</div><span className={styles.fashionEdition}>{ui("edition")}</span></>}
    {preset === "music" && <>{top}<div className={styles.album}>{media()}<span>{ui("album")}</span></div><div className={styles.musicCopy}>{headline}{copy}{action}<div className={styles.musicPlayer}><span>{ui("audioLabel")}</span><audio controls preload="none" src={ui("audio")} aria-label={ui("audioLabel")} /></div></div></>}
    {preset === "tech" && <>{top}<div className={styles.techCopy}><span className={styles.techLabel}>{ui("label")}</span>{headline}{copy}{action}<div className={styles.techSpec}>{ui("spec").split("·").map(value => <span key={value}>{value}</span>)}</div></div>{media()}<span className={styles.techImageNote}>{ui("note")}</span></>}
    {preset === "lifestyle" && <>{top}<div className={styles.lifestyleCopy}>{headline}{copy}{action}</div><div className={styles.lifestyleImage}>{media()}<span>{ui("note")}</span></div><div className={styles.lifestyleSticker}>{ui("badge")}</div></>}
    {preset === "art" && <>{top}<div className={styles.artTitle}>{headline}<span>{ui("edition")}</span></div><div className={styles.contactSheet}>{[0, 1, 2].map((n) => <div key={n}>{media("", n > 0 && ui(`image${n + 1}`) ? { src: ui(`image${n + 1}`), alt: ui(`image${n + 1}Alt`), position: "50% 50%" } : undefined)}<span>{ui("photoLabel")} {String(n + 1).padStart(2, "0")}</span></div>)}</div><div className={styles.artBottom}>{copy}{action}</div></>}
    {gallery&&<div className={styles.galleryMobileAction}>{action}</div>}
  </div>;
}
