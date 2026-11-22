"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Bookmark, Check, ChevronRight, Clock3, Gamepad2, Heart, MessageCircle, Plus, Radio, Send, Sparkles, Zap } from "lucide-react";
import type { ContentItem, SectionContent } from "@/lib/types";
import type { CreatorSectionProps } from "@/lib/creator/types";
import { ContentLink, EditableChoice, EditableImage, EditableText } from "@/components/site/editable";
import { useSectionHeadingLevel } from "@/components/site/heading-level";
import { useActionMotion, useEditorialMotion, useFlipMotion } from "../motion/creator-motion";
import styles from "./editorial.module.css";

function useContent(props: CreatorSectionProps) {
  const { section, onChange, editable = false } = props;
  const content = section.content;
  return { c: content, editable, heading: useSectionHeadingLevel(section.id), set: (key: keyof SectionContent, value: string) => onChange?.({ ...section, content: { ...content, [key]: value } }), update: (item: ContentItem) => onChange?.({ ...section, content: { ...content, items: content.items?.map(current => current.id === item.id ? item : current) } }) };
}

/** Existing editable section fields compose a complete creator story, not a second content system. */
export function CreatorEditorial(props: CreatorSectionProps) {
  const root = useRef<HTMLDivElement>(null);
  const { editable = false, section } = props;
  useEditorialMotion(root, editable, section.id);
  useActionMotion(root, editable);
  const mode = section.content.caption;
  return <div ref={root} data-motion={editable ? "off" : "on"}>{mode === "program" ? <Program {...props} /> : mode === "community" ? <CommunityVote {...props} /> : mode === "chapters" ? <Chapters {...props} /> : mode === "partnership" ? <Partnership {...props} /> : <Statement {...props} />}</div>;
}

function Statement(props: CreatorSectionProps) {
  const { c, heading, editable, set, update } = useContent(props);
  return <div className={`${styles.statement} ${c.caption === "drop-story" ? styles.dropStory : ""}`}>
    <div className={styles.statementCopy} data-creator-reveal="poster"><EditableText as={heading} value={c.heading} editable={editable} onChange={value => set("heading", value)} /><EditableText value={c.text} editable={editable} onChange={value => set("text", value)} /><div className={styles.topicLinks}>{c.items?.map(item => <div key={item.id} data-item-id={item.id}><ContentLink href={item.href} editField="href" editItemId={item.id} editable={editable}><span><EditableText as="span" value={item.title} editable={editable} onChange={title => update({ ...item, title })} /><EditableText as="span" className={styles.itemDescription} value={item.text} editable={editable} onChange={text => update({ ...item, text })} /></span><ArrowUpRight size={25} /></ContentLink></div>)}</div>{c.primaryLabel && <ContentLink className={styles.solidLink} href={c.primaryHref} editField="primaryHref" editable={editable}>{c.primaryLabel}<ArrowRight size={20} /></ContentLink>}</div>
    <div className={styles.statementArtwork} data-creator-reveal="media"><EditableImage image={c.image} editable={editable} onChange={image => props.onChange?.({ ...props.section, content: { ...c, image } })} /><div className={styles.photoStamp}><Zap size={25} fill="currentColor" /><EditableText as="span" value={c.quote} editable={editable} onChange={value => set("quote", value)} /></div><EditableText as="p" value={c.subheading} editable={editable} onChange={value => set("subheading", value)} className={styles.photoCaption} /></div>
  </div>;
}

function Program(props: CreatorSectionProps) {
  const { c, heading, editable, set, update } = useContent(props);
  const items = c.items ?? [];
  const [selected, setSelected] = useState(0);
  const [saved, setSaved] = useState<string[]>([]);
  const panel = useRef<HTMLDivElement>(null);
  const active = items[Math.min(selected, Math.max(0, items.length - 1))];
  const storageKey = `creator-program:${props.site.modules?.creator?.demoBasePath || props.site.name}:v1`;
  useEffect(() => { try { const stored = JSON.parse(sessionStorage.getItem(storageKey) || "[]"); if (Array.isArray(stored)) setSaved(stored.filter(value => typeof value === "string")); } catch { /* in-memory plan */ } }, [storageKey]);
  useFlipMotion(panel, active?.id, editable);
  const remember = () => { if (!active) return; const next = saved.includes(active.id) ? saved.filter(id => id !== active.id) : [...saved, active.id]; setSaved(next); try { sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* in-memory plan */ } };
  return <div className={styles.program}><div className={styles.sectionTop}><EditableText as={heading} value={c.heading} editable={editable} onChange={value => set("heading", value)} /><EditableText value={c.text} editable={editable} onChange={value => set("text", value)} /></div><div className={styles.programLayout}><div className={styles.programDays} aria-label="Fiktiven Programmpunkt auswählen">{items.map((item, index) => { const [day, date, time] = (item.meta || "").split("|"); return <div key={item.id} data-item-id={item.id} data-creator-reveal="row"><EditableChoice editable={editable} onChoose={() => setSelected(index)} type="button" className={`${styles.day} ${selected === index ? styles.dayActive : ""}`} aria-pressed={selected === index}><span className={styles.dayDate}><b>{day}</b><span>{date}</span></span><span className={styles.dayTitle}><EditableText as="span" value={item.title} editable={editable} onChange={title => update({ ...item, title })} /><small>{time}{saved.includes(item.id) && <Check size={13} />}</small></span><ChevronRight size={23} /></EditableChoice></div>; })}</div><div ref={panel} className={styles.programStage}>{active ? <div key={active.id} data-flip-key={active.id} className={styles.programPanel}><div className={styles.programImage}><EditableImage image={active.image || c.image} editable={editable} onChange={image => update({ ...active, image })} /><span><Radio size={14} />Fiktives Programm</span></div><div className={styles.programDetails}><span className={styles.duration}><Clock3 size={14} />{active.meta?.split("|").slice(2).join(" · ")}</span><EditableText as="h3" value={active.title} editable={editable} onChange={title => update({ ...active, title })} /><EditableText value={active.text} editable={editable} onChange={text => update({ ...active, text })} /><ol>{active.details?.map((detail, i) => <li key={i}><span>{String(i + 1).padStart(2, "0")}</span><EditableText as="span" value={detail} editable={editable} onChange={value => update({ ...active, details: active.details?.map((d, j) => j === i ? value : d) })} /></li>)}</ol><div className={styles.programActions}><button type="button" className={styles.remember} onClick={remember} aria-pressed={saved.includes(active.id)}>{saved.includes(active.id) ? <Check size={18} /> : <Bookmark size={18} />}{saved.includes(active.id) ? c.secondaryLabel || "In diesem Tab gemerkt" : c.primaryLabel || "Im Demo-Plan merken"}</button><ContentLink href={active.href} editable={editable}>{active.label}<ArrowUpRight size={18} /></ContentLink></div></div></div> : <p>Lege einen Programmpunkt im CMS an.</p>}</div></div><EditableText value={c.subheading} editable={editable} onChange={value => set("subheading", value)} className={styles.localNotice} /></div>;
}

function CommunityVote(props: CreatorSectionProps) {
  const { c, heading, editable, set, update } = useContent(props);
  const items = c.items ?? [];
  const [vote, setVote] = useState("");
  const [idea, setIdea] = useState("");
  const [submitted, setSubmitted] = useState("");
  const key = `creator-poll:${props.site.modules?.creator?.demoBasePath || props.site.name}:v1`;
  useEffect(() => { try { setVote(sessionStorage.getItem(key) || ""); } catch { /* local memory */ } }, [key]);
  const choose = (id: string) => { const next = vote === id ? "" : id; setVote(next); try { sessionStorage.setItem(key, next); } catch { /* local memory */ } };
  const total = items.reduce((sum, item) => sum + Math.max(0, Number(item.meta) || 0), 0) + (vote ? 1 : 0);
  return <div className={styles.community}><div className={styles.communityIntro} data-creator-reveal="poster"><MessageCircle size={48} strokeWidth={1.4} /><EditableText as={heading} value={c.heading} editable={editable} onChange={value => set("heading", value)} /><EditableText value={c.text} editable={editable} onChange={value => set("text", value)} /><div className={styles.communityQuestion}><EditableText as="h3" value={c.quote} editable={editable} onChange={value => set("quote", value)} /><span>Lokale Demo-Abstimmung · Beispielwerte</span></div></div><div className={styles.communityWork}><div className={styles.poll} role="group" aria-label={c.quote || "Demo-Abstimmung"}>{items.map((item, index) => { const percent = total ? Math.round(((Number(item.meta) || 0) + (vote === item.id ? 1 : 0)) / total * 100) : 0; return <div key={item.id} data-item-id={item.id} data-creator-reveal="row"><EditableChoice editable={editable} onChoose={() => choose(item.id)} type="button" aria-pressed={vote === item.id} className={`${styles.pollChoice} ${vote === item.id ? styles.voted : ""}`}><span className={styles.pollIcon}>{index === 0 ? <Gamepad2 size={22} /> : index === 1 ? <Sparkles size={22} /> : <Heart size={22} />}</span><span className={styles.pollText}><EditableText as="span" value={item.title} editable={editable} onChange={title => update({ ...item, title })} /><EditableText as="span" className={styles.itemDescription} value={item.text} editable={editable} onChange={text => update({ ...item, text })} /></span><span className={styles.pollPercent}>{vote === item.id && <Check size={17} />}{percent}%</span><i style={{ "--vote-width": `${percent}%` } as CSSProperties} /></EditableChoice></div>; })}</div><form className={styles.ideaForm} onSubmit={event => { event.preventDefault(); if (idea.trim()) { setSubmitted(idea.trim()); setIdea(""); } }}><label htmlFor={`idea-${props.section.id}`}>{c.primaryLabel}</label><div><input id={`idea-${props.section.id}`} value={idea} maxLength={140} placeholder={c.attribution || "Deine Idee …"} onChange={event => setIdea(event.target.value)} /><button type="submit" aria-label="Idee nur lokal vormerken" disabled={!idea.trim()}><Send size={19} /></button></div>{submitted && <p role="status"><Check size={15} />Lokal vorgemerkt: „{submitted}“</p>}</form><EditableText value={c.subheading} editable={editable} onChange={value => set("subheading", value)} className={styles.communityNotice} /></div></div>;
}

function Chapters(props: CreatorSectionProps) {
  const { c, heading, editable, set, update } = useContent(props);
  return <div className={styles.chapters}><div className={styles.sectionTop}><EditableText as={heading} value={c.heading} editable={editable} onChange={value => set("heading", value)} /><EditableText value={c.text} editable={editable} onChange={value => set("text", value)} /></div>{c.items?.map((item, index) => <article key={item.id} data-item-id={item.id} className={styles.chapter}><div className={styles.chapterImage} data-creator-reveal="media"><EditableImage image={item.image} editable={editable} onChange={image => update({ ...item, image })} /><span>{item.meta}</span></div><div className={styles.chapterText} data-creator-reveal="aside"><span className={styles.chapterNumber}>{String(index + 1).padStart(2, "0")}<ArrowDown size={23} /></span><EditableText as="h3" value={item.title} editable={editable} onChange={title => update({ ...item, title })} /><EditableText value={item.text} editable={editable} onChange={text => update({ ...item, text })} />{item.href && <ContentLink href={item.href} editField="href" editItemId={item.id} editable={editable}>{item.label}<ArrowUpRight size={20} /></ContentLink>}</div></article>)}</div>;
}

function Partnership(props: CreatorSectionProps) {
  const { c, heading, editable, set, update } = useContent(props);
  const [selected, setSelected] = useState(0);
  const active = c.items?.[selected];
  return <div className={styles.partnership}><div className={styles.sectionTop}><EditableText as={heading} value={c.heading} editable={editable} onChange={value => set("heading", value)} /><EditableText value={c.text} editable={editable} onChange={value => set("text", value)} /></div><div className={styles.partnershipLayout}><div className={styles.formatList}>{c.items?.map((item, index) => <div key={item.id} data-item-id={item.id} data-creator-reveal="row"><EditableChoice editable={editable} onChoose={() => setSelected(index)} className={`${styles.format} ${selected === index ? styles.formatActive : ""}`} aria-pressed={selected === index} type="button"><span><EditableText as="span" value={item.title} editable={editable} onChange={title => update({ ...item, title })} /><EditableText as="span" className={styles.itemDescription} value={item.text} editable={editable} onChange={text => update({ ...item, text })} /></span><ArrowUpRight size={25} /></EditableChoice></div>)}</div>{active && <div className={styles.briefPreview} key={active.id}><div><span>{c.quote}</span><span>Fiktives Beispiel</span></div><EditableText as="h3" value={active.title} editable={editable} onChange={title => update({ ...active, title })} /><ul>{active.details?.map((detail, index) => <li key={index}><Check size={17} /><EditableText as="span" value={detail} editable={editable} onChange={value => update({ ...active, details: active.details?.map((d, i) => i === index ? value : d) })} /></li>)}</ul><EditableText value={active.meta} editable={editable} onChange={meta => update({ ...active, meta })} /><ContentLink href={c.primaryHref} editField="primaryHref" editable={editable} className={styles.solidLink}>{c.primaryLabel}<ArrowUpRight size={20} /></ContentLink></div>}</div><EditableText value={c.subheading} editable={editable} onChange={value => set("subheading", value)} className={styles.localNotice} /></div>;
}
