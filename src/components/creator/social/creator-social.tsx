"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, Camera, Check, Headphones, Heart, MessageCircle, Play, Radio, Send, Volume2 } from "lucide-react";
import type { ContentItem, ImageValue, SectionContent } from "@/lib/types";
import type { CreatorSectionProps } from "@/lib/creator/types";
import { ContentLink, EditableImage, EditableText } from "@/components/site/editable";
import { useSectionHeadingLevel } from "@/components/site/heading-level";
import { useActionMotion, useEditorialMotion, useFlipMotion } from "../motion/creator-motion";
import styles from "./social.module.css";
import {isolatedImage,isolatedMediaUrl} from "@/lib/isolated-media";
import {socialExampleItem} from "@/lib/creator/social-sources";

const names: Record<string, string> = { youtube: "YouTube", instagram: "Instagram", tiktok: "TikTok", twitch: "Twitch", spotify: "Spotify", discord: "Discord" };
const local = (value?: string) => isolatedMediaUrl(value,'video') || isolatedMediaUrl(value,'audio') || isolatedMediaUrl(value,'captions');
const localImage = (value?: string) => isolatedMediaUrl(value);
const handleFor = (item: ContentItem) => item.tags?.find(tag => tag.startsWith("handle:"))?.slice(7) || "Creator-Demo";

export function CreatorSocial(props: CreatorSectionProps) {
  return props.section.content.caption === "videos" ? <VideoHub {...props} /> : <SocialGrid {...props} />;
}

function SocialGrid({ section, editable = false, onChange }: CreatorSectionProps) {
  const root = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState("all");
  useEditorialMotion(root, editable, section.id);
  useFlipMotion(root, filter, editable);
  useActionMotion(root, editable);
  const c = section.content;
  const heading = useSectionHeadingLevel(section.id);
  const items = (c.items ?? []).map(socialExampleItem);
  const platforms = [...new Set(items.map(item => item.platform).filter(Boolean))] as string[];
  const set = (key: keyof SectionContent, value: string) => onChange?.({ ...section, content: { ...c, [key]: value } });
  const update = (id: string, next: ContentItem) => onChange?.({ ...section, content: { ...c, items: items.map(item => item.id === id ? next : item) } });
  const visible = items.filter(item => filter === "all" || item.platform === filter);
  return <div ref={root} className={`${styles.social} ${c.caption === "live" ? styles.livePage : ""}`}>
    <div className={styles.intro}><EditableText as={heading} value={c.heading} editable={editable} onChange={value => set("heading", value)} className={styles.heading} /><div><EditableText as="p" value={c.text} editable={editable} onChange={value => set("text", value)} className={styles.introText} />{c.primaryLabel && <ContentLink href={c.primaryHref} editField="primaryHref" editable={editable} className={styles.textLink}>{c.primaryLabel}<ArrowUpRight size={19} /></ContentLink>}</div></div>
    {platforms.length > 2 && <div className={styles.filters} role="group" aria-label="Plattform-Beispiele filtern"><button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>Alle Feeds<ArrowDown size={13} /></button>{platforms.map(platform => <button type="button" aria-pressed={filter === platform} key={platform} onClick={() => setFilter(platform)}>{names[platform]}</button>)}</div>}
    <div className={styles.grid} data-mode={c.caption || "home"}>{visible.map(item => <PlatformCard key={item.id} item={item} images={c.images?.map(isolatedImage).filter((image):image is ImageValue=>Boolean(image))} editable={editable} onChange={next => update(item.id, next)} onImagesChange={images => onChange?.({ ...section, content: { ...c, images } })} />)}</div>
    {visible.length === 0 && <p className={styles.empty}>Für diesen Filter gibt es noch kein Beispiel. Wähle einen anderen Feed.</p>}
    <EditableText as="p" value={c.subheading} editable={editable} onChange={value => set("subheading", value)} className={styles.footnote} />
  </div>;
}

function VideoHub(props: CreatorSectionProps) {
  const { section, editable = false, onChange } = props;
  const c = section.content;
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  const heading = useSectionHeadingLevel(section.id);
  const clips = (c.items ?? []).map(socialExampleItem).filter(item => item.platform === "youtube");
  const categoryFor = (item: ContentItem) => item.tags?.find(tag => tag.startsWith("category:"))?.slice(9) || "Clips";
  const categories = [...new Set(clips.map(categoryFor))];
  const filtered = clips.filter(item => category === "all" || categoryFor(item) === category);
  const active = filtered.find(item => item.id === selected) || filtered[0];
  const extra = (c.items ?? []).map(socialExampleItem).filter(item => item.platform !== "youtube");
  useEditorialMotion(root, editable, section.id);
  useActionMotion(root, editable);
  useFlipMotion(stage, active?.id, editable);
  const update = (next: ContentItem) => onChange?.({ ...section, content: { ...c, items: c.items?.map(item => item.id === next.id ? next : item) } });
  return <div ref={root} className={styles.videoHub}><div className={styles.hubHeading}><EditableText as={heading} value={c.heading} editable={editable} onChange={value => onChange?.({ ...section, content: { ...c, heading: value } })} /><EditableText value={c.text} editable={editable} onChange={value => onChange?.({ ...section, content: { ...c, text: value } })} /></div><div className={styles.clipFilters} role="group" aria-label="Clips nach Thema filtern"><button type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")}>Alle Clips</button>{categories.map(value => <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)}>{value}</button>)}</div><div className={styles.hubLayout}><div className={styles.featuredClip} ref={stage}>{active ? <div key={active.id} data-flip-key={active.id} data-item-id={active.id}><div className={styles.featuredBar}><span><Play size={15} fill="currentColor" />YouTube</span><span>Platzhalter</span></div><LocalVideo item={active} editable={editable} onChange={update} /><div className={styles.featuredCopy}><span>{categoryFor(active)} · Eigener Demo-Clip</span><EditableText as="h3" value={active.title} editable={editable} onChange={title => update({ ...active, title })} /><EditableText value={active.text} editable={editable} onChange={text => update({ ...active, text })} /><div><span>Beispielwerte: {active.meta}</span><button type="button" aria-pressed={saved.includes(active.id)} onClick={() => setSaved(values => values.includes(active.id) ? values.filter(id => id !== active.id) : [...values, active.id])}>{saved.includes(active.id) ? <Check size={16} /> : <Bookmark size={16} />}{saved.includes(active.id) ? "Lokal gemerkt" : "Clip merken"}</button></div></div></div> : <p>Für dieses Thema gibt es noch keinen Clip.</p>}</div><div className={styles.clipQueue}><div><span>{c.primaryLabel || "Noch eine gute Idee"}</span><span>{filtered.length} Clips</span></div>{filtered.map((item, index) => <article key={item.id} data-item-id={item.id}><button type="button" className={`${styles.queueButton} ${active?.id === item.id ? styles.queueActive : ""}`} aria-pressed={active?.id === item.id} onClick={() => setSelected(item.id)}><span className={styles.queueNumber}>{String(index + 1).padStart(2, "0")}</span><span className={styles.queueImage}>{item.image && <img src={localImage(item.image.src)} alt={item.image.alt} width={160} height={100} loading="lazy" />}{active?.id === item.id && <Play size={14} fill="currentColor" />}</span><span className={styles.queueCopy}><b>{item.title}</b><small>{categoryFor(item)} · {item.label || "6 Sekunden"}</small></span></button></article>)}<div className={styles.queueNote}><ArrowDown size={23} /><span>{c.quote}</span></div></div></div>{Boolean(extra.length) && <div className={styles.shortHub}><div><EditableText as="h3" value={c.secondaryLabel} editable={editable} onChange={value => onChange?.({ ...section, content: { ...c, secondaryLabel: value } })} /><span>Plattform-Beispiele · lokal abgespielt</span></div><div className={styles.shortHubGrid}>{extra.map(item => <PlatformCard key={item.id} item={item} images={c.images?.map(isolatedImage).filter((image):image is ImageValue=>Boolean(image))} editable={editable} onChange={update} onImagesChange={images => onChange?.({ ...section, content: { ...c, images } })} />)}</div></div>}<EditableText value={c.subheading} editable={editable} onChange={value => onChange?.({ ...section, content: { ...c, subheading: value } })} className={styles.hubNotice} /></div>;
}

type CardProps = { item: ContentItem; images?: ImageValue[]; editable: boolean; onChange: (item: ContentItem) => void; onImagesChange: (images: ImageValue[]) => void };
function PlatformCard(props: CardProps) {
  const { item, editable, onChange } = props;
  const platform = item.platform || "youtube";
  return <article className={`${styles.card} ${styles[platform] || ""}`} data-item-id={item.id} data-platform={platform} data-flip-key={item.id} data-creator-reveal={platform === "tiktok" ? "media" : "artifact"}>
    <div className={styles.platformBar}><span className={styles.platformName}>{platform === "youtube" ? <Play size={16} fill="currentColor" /> : platform === "instagram" ? <Camera size={16} /> : platform === "twitch" ? <Radio size={16} /> : platform === "spotify" ? <Headphones size={16} /> : platform === "discord" ? <MessageCircle size={16} /> : <Play size={16} />}{names[platform]}</span><span className={styles.placeholder}>Platzhalter</span></div>
    {platform === "instagram" ? <Instagram {...props} /> : platform === "tiktok" ? <Short {...props} /> : platform === "twitch" ? <Live {...props} /> : platform === "spotify" ? <Audio {...props} /> : platform === "discord" ? <Community {...props} /> : <>
      <LocalVideo item={item} editable={editable} onChange={onChange} />
      <div className={styles.cardCopy}><ItemTitle {...props} /><EditableText value={item.text} editable={editable} onChange={text => onChange({ ...item, text })} /><div className={styles.meta}><span>Beispielwerte</span><EditableText as="span" value={item.meta} editable={editable} onChange={meta => onChange({ ...item, meta })} /></div></div>
    </>}
  </article>;
}

function ItemTitle({ item, editable, onChange }: Pick<CardProps, "item" | "editable" | "onChange">) {
  return <EditableText as="h3" value={item.title} editable={editable} onChange={title => onChange({ ...item, title })} />;
}

function LocalVideo({ item, editable, onChange, vertical = false, loop = false }: Pick<CardProps, "item" | "editable" | "onChange"> & { vertical?: boolean; loop?: boolean }) {
  const [failed, setFailed] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const source = local(item.mediaUrl);
  const poster = item.image || item.poster;
  const captions = local(item.tags?.find(tag => tag.startsWith("captions:"))?.slice(9));
  useEffect(() => {
    const node = video.current;
    if (!node || editable) return;
    const observer = new IntersectionObserver(entries => { if (!entries[0].isIntersecting && !node.paused) node.pause(); }, { threshold: .05 });
    observer.observe(node);
    const visibility = () => { if (document.hidden) node.pause(); };
    document.addEventListener("visibilitychange", visibility);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", visibility); };
  }, [source, editable, failed]);
  if (editable) return <EditableImage image={poster} editable onChange={image => onChange({ ...item, image, poster: image })} className={vertical ? styles.verticalPoster : styles.videoPoster} />;
  return <div className={`${styles.video} ${vertical ? styles.vertical : ""}`}>
    {source && !failed ? <video ref={video} key={source} controls playsInline loop={loop} preload="none" poster={localImage(poster?.src)} width={vertical ? 360 : 640} height={vertical ? 640 : 360} aria-label={`${item.title} – selbst gehosteter Demo-Clip`} onError={() => setFailed(true)}><source src={source} type={/\.webm$/i.test(source)?"video/webm":"video/mp4"} />{captions && <track src={captions} kind="captions" srcLang="de" label="Deutsch" />}Dein Browser kann diesen Clip nicht abspielen.</video> : <div className={styles.mediaError}><Play size={28} /><p>Der Demo-Clip ist gerade nicht verfügbar.</p><button type="button" onClick={() => setFailed(false)}>Erneut versuchen</button></div>}
    <span className={styles.localMedia}>Eigener Demo-Clip · ohne Plattformverbindung</span>
  </div>;
}

function Instagram({ item, images = [], editable, onChange, onImagesChange }: CardProps) {
  const [index, setIndex] = useState(0);
  const start = useRef<number | null>(null);
  const slides = images.length ? images : item.image ? [item.image] : [];
  const length = slides.length + (item.mediaUrl ? 1 : 0);
  const active = Math.min(index, Math.max(0, length - 1));
  const move = (step: number) => { if(length) setIndex((active + step + length) % length); };
  return <>
    <div className={styles.instaHandle}><span className={styles.avatar}>{handleFor(item).replace("@", "").slice(0, 1).toUpperCase()}</span><span>{handleFor(item)}<small>Fiktives Profil</small></span><span className={styles.slideCount}>{length ? `${active + 1} / ${length}` : "Kein Bild"}</span></div>
    <div className={styles.carousel} onPointerDown={event => { start.current = event.clientX; }} onPointerUp={event => { if (start.current !== null && Math.abs(event.clientX - start.current) > 45) move(event.clientX > start.current ? -1 : 1); start.current = null; }}>
      {active < slides.length ? <EditableImage image={slides[active]} editable={editable} onChange={image => onImagesChange(slides.map((slide, i) => i === active ? image : slide))} className={styles.instaImage} /> : <LocalVideo item={item} editable={editable} onChange={onChange} loop />}
      {length > 1 && <div className={styles.carouselControls}><button type="button" aria-label="Vorheriger Instagram-Platzhalter" onClick={() => move(-1)}><ArrowLeft size={17} /></button><button type="button" aria-label="Nächster Instagram-Platzhalter" onClick={() => move(1)}><ArrowRight size={17} /></button></div>}
    </div>
    <div className={styles.cardCopy}><div className={styles.instaReactions}><Heart size={19} /><MessageCircle size={19} /><Send size={18} /><span className={styles.dots}>{Array.from({ length }).map((_, i) => <button key={i} type="button" aria-label={`Beispiel ${i + 1} anzeigen`} aria-current={active === i ? "true" : undefined} onClick={() => setIndex(i)} />)}</span></div><ItemTitle item={item} editable={editable} onChange={onChange} /><EditableText value={item.text} editable={editable} onChange={text => onChange({ ...item, text })} /><div className={styles.meta}><span>Beispielwerte</span><EditableText as="span" value={item.meta} editable={editable} onChange={meta => onChange({ ...item, meta })} /></div></div>
  </>;
}

function Short({ item, editable, onChange }: CardProps) {
  return <><div className={styles.shortFrame}><LocalVideo item={item} editable={editable} onChange={onChange} vertical loop /><div className={styles.shortCaption}><span>{handleFor(item)}</span><ItemTitle item={item} editable={editable} onChange={onChange} /></div><div className={styles.shortReactions} aria-hidden="true"><Heart size={23} /><MessageCircle size={23} /><Send size={21} /></div></div><div className={styles.cardCopy}><EditableText value={item.text} editable={editable} onChange={text => onChange({ ...item, text })} /><div className={styles.meta}><span>Beispielwerte</span><EditableText as="span" value={item.meta} editable={editable} onChange={meta => onChange({ ...item, meta })} /></div></div></>;
}

function Live({ item, editable, onChange }: CardProps) {
  const messages = item.details?.length ? item.details : ["pixelpilz: Das Setup sieht gut aus!", "heyjules: Team Nachtschicht ist da.", "mod_lime: Das ist ein simulierter Demo-Chat."];
  const [cursor, setCursor] = useState(0);
  const chatRoot = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const [own, setOwn] = useState<string[]>([]);
  useEffect(() => {
    if (editable || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let visible = false;
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, { threshold: .1 });
    if (chatRoot.current) observer.observe(chatRoot.current);
    const timer = window.setInterval(() => { if (visible && !document.hidden) setCursor(n => (n + 1) % messages.length); }, 4200);
    return () => { observer.disconnect(); window.clearInterval(timer); };
  }, [editable, messages.length]);
  return <><div ref={chatRoot} className={styles.liveGrid}><div className={styles.liveStream}><div className={styles.liveMarker}><span />Simulierter Stream</div><LocalVideo item={item} editable={editable} onChange={onChange} loop /><div className={styles.cardCopy}><ItemTitle item={item} editable={editable} onChange={onChange} /><EditableText value={item.text} editable={editable} onChange={text => onChange({ ...item, text })} /><div className={styles.meta}><span>Beispielwerte</span><EditableText as="span" value={item.meta} editable={editable} onChange={meta => onChange({ ...item, meta })} /></div></div></div><div className={styles.chat}><div className={styles.chatHead}><MessageCircle size={15} />Demo-Chat<span>LOKAL</span></div><div className={styles.messages} aria-live="off">{Array.from({ length: Math.min(4, messages.length) }).map((_, i) => { const message = messages[(cursor + i) % messages.length]; const [user, ...text] = message.split(":"); return <p key={`${cursor}-${i}`}><b>{user}</b>{text.join(":") || message}</p>; })}{own.slice(-3).map((message, i) => <p className={styles.ownMessage} key={`${i}-${message}`}><b>du.demo</b>{message}</p>)}</div><form onSubmit={event => { event.preventDefault(); if (draft.trim()) { setOwn(values => [...values, draft.trim().slice(0, 140)]); setDraft(""); } }}><label htmlFor={`chat-${item.id}`}>Schreib in den Demo-Chat</label><div><input id={`chat-${item.id}`} value={draft} maxLength={140} placeholder="Nur in deinem Browser …" onChange={event => setDraft(event.target.value)} /><button type="submit" aria-label="Demo-Nachricht senden" disabled={!draft.trim()}><Send size={17} /></button></div></form><small>Simulation. Keine echte Twitch-Verbindung.</small></div></div><div className={styles.schedule}><Radio size={17} /><EditableText as="span" value={item.label} editable={editable} onChange={label => onChange({ ...item, label })} /></div></>;
}

function Audio({ item, editable, onChange }: CardProps) {
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const src = local(item.mediaUrl);
  return <><div className={styles.audioTop}><EditableImage image={item.image} editable={editable} onChange={image => onChange({ ...item, image })} className={styles.audioArt} /><div><span className={styles.audioType}>Eigener Audio-Loop</span><ItemTitle item={item} editable={editable} onChange={onChange} /><EditableText value={item.text} editable={editable} onChange={text => onChange({ ...item, text })} /></div></div><div className={styles.audioPlayer}><div className={`${styles.wave} ${playing ? styles.playing : ""}`} aria-hidden="true">{Array.from({ length: 36 }).map((_, i) => <i key={i} style={{ height: `${18 + ((i * 37 + 11) % 70)}%`, animationDelay: `${i * .04}s` }} />)}</div>{src && !failed ? <audio ref={audio} controls preload="none" src={src} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setFailed(true)} aria-label={`${item.title} – eigene 20-Sekunden-Hörprobe`} /> : <p role="status">Die Hörprobe ist gerade nicht verfügbar.</p>}</div><div className={styles.audioBottom}><Volume2 size={15} /><span>20 Sekunden · selbst komponierte Demo-Hörprobe</span></div></>;
}

function Community({ item, editable, onChange }: CardProps) {
  const [joined, setJoined] = useState(false);
  return <><div className={styles.communityBody}><div className={styles.communityVisual} aria-hidden="true"><MessageCircle size={95} strokeWidth={1.2} /><span>{item.meta || "Creator community"}</span><div><i /><i /><i /><b>+42</b></div></div><ItemTitle item={item} editable={editable} onChange={onChange} /><EditableText value={item.text} editable={editable} onChange={text => onChange({ ...item, text })} /><ul>{item.details?.map((detail, i) => <li key={i}><Check size={15} />{detail}</li>)}</ul><button type="button" className={styles.communityButton} onClick={() => setJoined(!joined)}>{joined ? "Demo-Einladung geöffnet" : item.label || "Demo-Einladung ansehen"}{joined ? <Check size={18} /> : <ArrowUpRight size={19} />}</button>{joined && <p role="status" className={styles.inviteNote}>Hier könnte deine eigene Community starten. Dieses Beispiel öffnet keinen echten Discord-Server.</p>}</div></>;
}
