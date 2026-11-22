"use client";

import { useContext, useRef } from "react";
import { ArrowDownToLine, ArrowUpRight, Camera, Check, Radio, Sparkles } from "lucide-react";
import type { SectionContent } from "@/lib/types";
import type { CreatorSectionProps } from "@/lib/creator/types";
import { ContentLink, EditableImage, EditableText, SiteInteractionContext } from "@/components/site/editable";
import { ContactForm } from "@/components/site/contact-form";
import { useSectionHeadingLevel } from "@/components/site/heading-level";
import { useEditorialMotion } from "../motion/creator-motion";
import { CreatorEditorial } from "./creator-editorial";
import styles from "./sections.module.css";

export function CreatorMediaKit(props: CreatorSectionProps) {
  return ["statement", "drop-story", "program", "community", "chapters", "partnership"].includes(props.section.content.caption || "") ? <CreatorEditorial {...props} /> : <MediaKitBody {...props} />;
}

function MediaKitBody({ section, editable = false, onChange }: CreatorSectionProps) {
  const root = useRef<HTMLDivElement>(null);
  const {isolated}=useContext(SiteInteractionContext);
  useEditorialMotion(root, editable, section.id);
  const c = section.content;
  const heading = useSectionHeadingLevel(section.id);
  const about = c.caption === "about";
  const hasImage = Boolean(c.image?.src || editable);
  const download = /\.(?:pdf|txt)(?:$|\?)/i.test(c.primaryHref || '');
  const set = (key: keyof SectionContent, value: string) => onChange?.({ ...section, content: { ...c, [key]: value } });
  const updateItem = (id: string, key: string, value: string) => onChange?.({ ...section, content: { ...c, items: c.items?.map(item => item.id === id ? { ...item, [key]: value } : item) } });
  return <div ref={root} className={`${styles.mediaKit} ${about ? styles.about : ""} ${!hasImage ? styles.kitWithoutImage : ""}`}>
    <div className={styles.titleRow} data-creator-reveal="poster"><EditableText as={heading} value={c.heading} editable={editable} onChange={value => set("heading", value)} /><EditableText as="p" value={c.subheading} editable={editable} onChange={value => set("subheading", value)} /></div>
    <div className={styles.editorial}>{hasImage&&<div className={styles.portrait} data-creator-reveal="media"><EditableImage image={c.image} editable={editable} priority onChange={image => onChange?.({ ...section, content: { ...c, image } })} /><EditableText as="p" value={c.image?.caption} editable={editable} onChange={caption => c.image && onChange?.({ ...section, content: { ...c, image: { ...c.image, caption } } })} /></div>}<div className={styles.story}><EditableText as="p" value={c.text} editable={editable} onChange={value => set("text", value)} className={styles.lead} /><div className={styles.rows}>{c.items?.map((item, i) => <div key={item.id} data-item-id={item.id} className={styles.row} data-creator-reveal="row">{about ? <span className={styles.rowIcon}>{i === 0 ? <Camera size={20} /> : i === 1 ? <Radio size={20} /> : <Sparkles size={20} />}</span> : <div className={styles.metric}><EditableText as="span" value={item.meta} editable={editable} onChange={value => updateItem(item.id, "meta", value)} />{isolated||item.placeholder?<small>Beispielwert</small>:<EditableText as="p" value={item.label} editable={editable} onChange={value=>updateItem(item.id,"label",value)} className={styles.metricPeriod}/> }</div>}<div><EditableText as="h3" value={item.title} editable={editable} onChange={value => updateItem(item.id, "title", value)} /><EditableText as="p" value={item.text} editable={editable} onChange={value => updateItem(item.id, "text", value)} /></div></div>)}</div>{c.primaryLabel && <ContentLink href={c.primaryHref} editField="primaryHref" editable={editable} download={download} className={styles.primaryLink}>{c.primaryLabel}{download ? <ArrowDownToLine size={20} /> : <ArrowUpRight size={20} />}</ContentLink>}{c.secondaryLabel && <ContentLink href={c.secondaryHref} editField="secondaryHref" editable={editable} className={styles.secondaryLink}>{c.secondaryLabel}<ArrowUpRight size={17} /></ContentLink>}</div></div>
    {c.quote && <div className={styles.quote}><EditableText as="blockquote" value={c.quote} editable={editable} onChange={value => set("quote", value)} /><EditableText as="p" value={c.attribution} editable={editable} onChange={value => set("attribution", value)} /></div>}
    {c.creatorPartnership && <section className={styles.kitContact} aria-label="Kooperation anfragen">
      <h2>Kooperation anfragen</h2>
      <p>Was hast du vor? Ein paar Infos zu Marke, Format und Zeitraum reichen für den Anfang.</p>
      <ContactForm editable={editable} informal kind="partnership" copy={{
        subjectLabel:'Marke und Idee',messageLabel:'Dein Vorhaben',submitLabel:'Kooperation anfragen'
      }}/>
    </section>}
  </div>;
}

export function CreatorLinks({ section, editable = false, onChange }: CreatorSectionProps) {
  const root = useRef<HTMLDivElement>(null);
  useEditorialMotion(root, editable, section.id);
  const c = section.content;
  const heading = useSectionHeadingLevel(section.id);
  const update = (key: keyof SectionContent, value: string) => onChange?.({ ...section, content: { ...c, [key]: value } });
  return <div ref={root} className={styles.linksPage}><div className={styles.linkProfile}><EditableImage image={c.image} editable={editable} priority onChange={image => onChange?.({ ...section, content: { ...c, image } })} /><div className={styles.profileName}><EditableText as={heading} value={c.heading} editable={editable} onChange={value => update("heading", value)} /><Check size={20} /></div><EditableText value={c.text} editable={editable} onChange={value => update("text", value)} /><EditableText as="p" value={c.subheading} editable={editable} onChange={value => update("subheading", value)} className={styles.linkNotice} /></div><div className={styles.linkList}>{c.items?.map(item => <div key={item.id} data-item-id={item.id} className={styles.linkItem} data-creator-reveal="row"><ContentLink href={item.href} editField="href" editItemId={item.id} editable={editable}>{item.image && <EditableImage image={item.image} editable={editable} onChange={image => onChange?.({ ...section, content: { ...c, items: c.items?.map(i => i.id === item.id ? { ...i, image } : i) } })} className={styles.linkThumb} />}<div><EditableText as="span" value={item.title} editable={editable} onChange={title => onChange?.({ ...section, content: { ...c, items: c.items?.map(i => i.id === item.id ? { ...i, title } : i) } })} /><EditableText as="p" value={item.text} editable={editable} onChange={text => onChange?.({ ...section, content: { ...c, items: c.items?.map(i => i.id === item.id ? { ...i, text } : i) } })} /></div><span className={styles.linkEnd}>{item.platform && <small>Platzhalter</small>}<ArrowUpRight size={22} /></span></ContentLink></div>)}</div><EditableText as="p" value={c.caption} editable={editable} onChange={value => update("caption", value)} className={styles.linksFootnote} /></div>;
}
