"use client";

import Link from "next/link";
import { useSectionContentEditable } from "./heading-level";
import {isClientPageLink,siteNavigationEvent} from "@/lib/navigation";
import { pageConsentScriptsActive } from "@/lib/consent/runtime";
import { createContext, useContext, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type DetailsHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
import { Check, ImagePlus, Link2, LoaderCircle, Maximize2, Upload, X } from "lucide-react";
import type { ContentItem, ImagePosition, ImageValue, MediaAsset } from "@/lib/types";
import { textWithBreaks } from "./text-wrap";
import {isolatedImage, isolatedMediaUrl} from '@/lib/isolated-media';
import { useAdminLanguage } from "@/components/admin/admin-language";

export const SiteInteractionContext = createContext<{isolated:boolean;localMediaOnly?:boolean}>({isolated:false});
export const SiteMediaContext = createContext<MediaAsset[] | undefined>(undefined);
export const SiteMediaAdapterContext = createContext<{upload:(file:File)=>Promise<MediaAsset>;isolated?:boolean}|undefined>(undefined);
export const siteMediaUploadedEvent = "hp:media-uploaded";

export function teamEmailLabel(item: Pick<ContentItem, "title" | "label" | "email">) {
  const visible = `${item.label === "Sekretariat" ? "Sekretariat: " : ""}${item.email || ""}`;
  return `${visible} – ${item.label === "Sekretariat" ? `E-Mail an das Sekretariat von ${item.title}` : `E-Mail an ${item.title}`}`;
}

type TextTag = "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div" | "figcaption" | "blockquote";

export function EditableText({ as: Tag = "p", value, editable, onChange, className = "", label, style, id }: {
  as?: TextTag; value?: string; editable?: boolean; onChange?: (value: string) => void;
  className?: string; label?: string; style?: CSSProperties; id?: string;
}) {
  const { t } = useAdminLanguage();
  editable = useSectionContentEditable(editable);
  if (!value && !editable) return null;
  const nativeHeading = /^h[1-4]$/.test(Tag);
  return <Tag id={id} className={`${className}${editable ? " ws-editable-text" : ""}`} style={style}
    contentEditable={editable || undefined} suppressContentEditableWarning={editable}
    role={editable && !nativeHeading ? "textbox" : undefined} tabIndex={editable ? 0 : undefined}
    aria-label={editable && !nativeHeading ? t(label ?? "Text direkt bearbeiten") : undefined}
    aria-multiline={editable && !nativeHeading ? true : undefined} spellCheck={editable ? true : undefined}
    onPaste={editable ? (event) => {
      event.preventDefault();
      const text = event.clipboardData.getData("text/plain");
      const selection = window.getSelection();
      if (selection?.rangeCount) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const node = document.createTextNode(text);
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } : undefined}
    onBlur={editable ? (event) => {
      const element = event.currentTarget;
      const transform = element.style.getPropertyValue("text-transform");
      const priority = element.style.getPropertyPriority("text-transform");
      element.style.setProperty("text-transform", "none", "important");
      const nextValue = element.innerText.replace(/\r\n/g, "\n").trim();
      if (transform) element.style.setProperty("text-transform", transform, priority);
      else element.style.removeProperty("text-transform");
      if (nextValue !== (value ?? "")) onChange?.(nextValue);
    } : undefined}>{editable ? value : textWithBreaks(value)}</Tag>;
}

/** Canvas fields must not sit inside another interactive control. */
export function EditableChoice({ editable, onChoose, elementRef, children, ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "onFocus" | "onSelect" | "ref"> & {
  editable?: boolean; onChoose: () => void; elementRef?: (node: HTMLElement | null) => void;
}) {
  if (!editable) return <button {...props} ref={elementRef} onClick={onChoose}>{children}</button>;
  const { type: _type, role: _role, tabIndex: _tabIndex, disabled: _disabled, onKeyDown: _onKeyDown,
    "aria-selected": selected, "aria-expanded": _expanded, "aria-pressed": _pressed, ...group } = props;
  return <div {...group as HTMLAttributes<HTMLDivElement>} ref={elementRef} role="group" data-editable-choice=""
    data-selected={selected ? "" : undefined} onClick={onChoose} onFocusCapture={onChoose}>{children}</div>;
}

export function ContentDisclosure({ editable, summary, children, ...props }: Omit<DetailsHTMLAttributes<HTMLDetailsElement>, "children"> & {
  editable?: boolean; summary: ReactNode; children: ReactNode;
}) {
  if (!editable) return <details {...props}><summary>{summary}</summary>{children}</details>;
  const { open: _open, name: _name, onToggle: _onToggle, ...group } = props;
  return <div {...group as HTMLAttributes<HTMLDivElement>} data-editable-disclosure="" data-open="" role="group">
    <div data-editable-summary="">{summary}</div>{children}
  </div>;
}

export function safeHref(href?: string) {
  if (!href) return "#";
  const value = href.trim();
  if (/^(?:https?:\/\/|mailto:|tel:|\/|#)/i.test(value) && !value.startsWith("//")) return value;
  return "#";
}

export function ContentLink({ href, editable, children, className = "", label, download, target, current, editField, editItemId, sponsored }: {
  href?: string; editable?: boolean; children: ReactNode; className?: string; label?: string;
  download?: boolean; target?: "_blank"; current?: "page"; sponsored?: boolean;
  editField?: "primaryHref" | "secondaryHref" | "href"; editItemId?: string;
}) {
  const {t} = useAdminLanguage();
  const canEdit = useSectionContentEditable(editable);
  if (editable) return <div className={className} data-content-link="">{children}
    {canEdit && editField && <button type="button" className="cms-canvas-link" data-canvas-link={editField}
      data-canvas-link-item={editItemId} aria-label={t("Linkziel bearbeiten")} title={t("Linkziel bearbeiten")}>
      <Link2 size={15} aria-hidden="true" />
    </button>}
  </div>;
  const destination=safeHref(href);
  if(isClientPageLink(destination,{download,target}))return <Link href={destination} onNavigate={event => {
    if (pageConsentScriptsActive()) {
      event.preventDefault();
      window.location.assign(destination);
      return;
    }
    window.dispatchEvent(new CustomEvent(siteNavigationEvent, { detail: { href: destination } }));
  }} className={className} aria-label={label} aria-current={current}>{children}</Link>;
  return <a href={destination} className={className} aria-label={label} aria-current={current}
    download={download || undefined} target={target} rel={sponsored ? "sponsored noopener noreferrer" : target ? "noopener noreferrer" : undefined}
  >{children}</a>;
}

const positions: ImagePosition[] = ["0% 0%", "50% 0%", "100% 0%", "0% 50%", "50% 50%", "100% 50%", "0% 100%", "50% 100%", "100% 100%"];
const positionLabels = ["Oben links", "Oben mittig", "Oben rechts", "Mitte links", "Bildmitte", "Mitte rechts", "Unten links", "Unten mittig", "Unten rechts"];

export function EditableImage({ image, editable: canEdit, onChange, className = "", priority = false, sizes, caption = false, onOpen, openLabel, editLabel = "Bild bearbeiten" }: {
  image?: ImageValue; editable?: boolean; onChange?: (image: ImageValue) => void; className?: string;
  priority?: boolean; sizes?: string; caption?: boolean; onOpen?: (button: HTMLButtonElement) => void; editLabel?: string; openLabel?: string;
}) {
  const { t } = useAdminLanguage();
  const editable = useSectionContentEditable(canEdit);
  const {localMediaOnly} = useContext(SiteInteractionContext);
  const [open, setOpen] = useState(false);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const providedMedia = useContext(SiteMediaContext);
  const mediaAdapter = useContext(SiteMediaAdapterContext);
  const uploadedMedia = useRef<MediaAsset[]>([]);
  const panelId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    if (providedMedia !== undefined) {
      const known = new Set(providedMedia.map((asset) => asset.id));
      setMedia([...uploadedMedia.current.filter((asset) => !known.has(asset.id)), ...providedMedia]);
      setBusy(false); setError("");
      return;
    }
    if(mediaAdapter?.isolated){setMedia([]);setBusy(false);return;}
    const controller = new AbortController();
    setBusy(true);
    setError("");
    fetch("/api/admin/media", { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("Die Mediathek konnte nicht geladen werden.");
      const data = await response.json();
      setMedia(data.media ?? []);
    }).catch((reason: Error) => { if (reason.name !== "AbortError") setError(reason.message); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [open, providedMedia, mediaAdapter]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  if (!image && !editable) return null;
  const displayImage = localMediaOnly ? isolatedImage(image) : image;
  const current = displayImage ?? { src: "", alt: "", position: "50% 50%" as ImagePosition };
  async function upload(file?: File) {
    if (!file) return;
    setUploadError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setUploadError("Bitte wählen Sie ein JPG-, PNG- oder WebP-Bild."); return; }
    if (!file.size || file.size > 4 * 1024 * 1024) { setUploadError("Bitte verwenden Sie ein Bild mit höchstens 4 MB."); return; }
    setUploading(true);
    try {
      let asset:MediaAsset;
      if(mediaAdapter)asset=await mediaAdapter.upload(file);
      else {const form = new FormData(); form.append("file", file); form.append("alt", "");
      const response = await fetch("/api/admin/media", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok || !data.asset) throw new Error(data.error ?? "Das Bild konnte nicht hochgeladen werden.");
      asset = data.asset as MediaAsset;}
      uploadedMedia.current = [asset, ...uploadedMedia.current];
      setMedia((previous) => [asset, ...previous]);
      if(!mediaAdapter?.isolated)window.dispatchEvent(new CustomEvent<MediaAsset>(siteMediaUploadedEvent, { detail: asset }));
      onChange?.({ src: asset.url, alt: asset.alt, position: asset.position });
    } catch (reason) { setUploadError(reason instanceof Error ? reason.message : "Bitte versuchen Sie es erneut."); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }
  return <figure className={`ws-image ${className}${editable ? " ws-image-editable" : ""}`}>
    {current.src ? <img src={current.src} alt={current.alt} width={displayImage?.width||1300} height={displayImage?.height||900} srcSet={displayImage?.srcSet}
      style={{ objectPosition: current.position }} loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined} decoding="async" sizes={sizes||image?.sizes} />
      : <div className="ws-image-empty"><ImagePlus aria-hidden="true" /><span>{t("Bild hinzufügen")}</span></div>}
    {!editable && current.src && onOpen && <button type="button" className="ws-gallery-open-image" aria-label={openLabel ? `${openLabel} – ${current.alt || current.caption || "Photo"}` : `${current.alt || current.caption || "Bild"} – Großansicht öffnen`} aria-haspopup="dialog" onClick={event => { event.preventDefault(); event.stopPropagation(); onOpen(event.currentTarget); }}><span className="ws-gallery-open-cue" aria-hidden="true"><Maximize2 size={20} /></span></button>}
    {caption && current.caption && <figcaption>{current.caption}</figcaption>}
    {editable && <button type="button" className="ws-image-edit-button" aria-controls={panelId}
      onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpen(true); }}><ImagePlus size={16} /> {t(editLabel)}</button>}
    {editable && <dialog ref={dialogRef} id={panelId} className="ws-image-dialog" aria-labelledby={`${panelId}-title`}
      onCancel={() => setOpen(false)} onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="ws-image-dialog-head"><h2 id={`${panelId}-title`}>{t("Bild bearbeiten")}</h2><button type="button" className="ws-icon-button" aria-label={t("Schließen")} onClick={() => setOpen(false)}><X size={21} /></button></div>
      <div className="ws-image-settings">
        <div className="ws-crop-preview">{current.src && <img src={current.src} alt={t("Vorschau des gewählten Bildausschnitts")} style={{ objectPosition: current.position }} />}</div>
        <div><p className="ws-field-label">{t("Bildausschnitt")}</p><div className="ws-position-grid">{positions.map((position, index) => <button key={position} type="button" aria-label={t(positionLabels[index])} aria-pressed={current.position === position}
          onClick={() => onChange?.({ ...current, position })}>{current.position === position ? <Check size={14} /> : <span />}</button>)}</div><p className="ws-field-help">{t("Wählen Sie, welcher Teil des Fotos sichtbar bleibt.")}</p></div>
      </div>
      <label className="ws-edit-field">{t("Bildbeschreibung")}<input value={current.alt} onChange={(event) => onChange?.({ ...current, alt: event.target.value })} placeholder={t("Was ist auf dem Bild zu sehen?")} /></label>
      <div className="ws-inline-upload"><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => void upload(event.target.files?.[0])} />
        <button type="button" className="ws-button ws-button-outline" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? <><LoaderCircle size={17} className="ws-spin" /> {t("Wird hochgeladen …")}</> : <><Upload size={17} /> {t("Neues Bild hochladen")}</>}</button><span>{t("JPG, PNG oder WebP · höchstens 4 MB")}</span>
      </div>
      {uploadError && <p role="alert" className="ws-form-error">{t(uploadError)}</p>}
      <p className="ws-field-label">{t("Aus der Mediathek auswählen")}</p>
      {busy && <p role="status" className="ws-inline-status"><LoaderCircle size={18} className="ws-spin" /> {t("Mediathek wird geladen …")}</p>}
      {error && <p role="alert" className="ws-form-error">{t(error)}</p>}
      {!busy && !error && media.length === 0 && <p className="ws-field-help">{t("Laden Sie zuerst ein Bild in der Mediathek des CMS hoch.")}</p>}
      <div className="ws-image-picker">{media.filter((asset) => asset.type.startsWith("image/") && (!localMediaOnly || Boolean(isolatedMediaUrl(asset.url)))).map((asset) => <button type="button" key={asset.id} className={current.src === asset.url ? "is-selected" : ""}
        aria-label={t("{p1} auswählen", { p1: asset.name })} aria-pressed={current.src === asset.url}
        onClick={() => onChange?.({ src: asset.url, alt: asset.alt, position: asset.position })}>
        <img src={asset.url} alt={asset.alt} loading="lazy" /><span>{asset.name}</span>
      </button>)}</div>
      <button type="button" className="ws-button ws-button-dark" onClick={() => setOpen(false)}>{t("Übernehmen")} <Check size={17} /></button>
    </dialog>}
  </figure>;
}
