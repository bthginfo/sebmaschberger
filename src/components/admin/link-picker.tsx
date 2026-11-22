"use client";

import { useAdminLanguage } from "./admin-language";
import { createContext, useContext, useId, useMemo, useState, type ReactNode } from "react";
import { Check, ChevronDown, FileText, Globe, Hash, Link2, Mail, Phone, Unlink } from "lucide-react";
import type { ImageValue, Section, WebsiteContent } from "@/lib/types";
import { defaultBlog } from "@/lib/site-config";
import { Button, Field, Input, Modal, Notice, SearchField, Select } from "./admin-ui";

type LinkPage = { id: string; title: string; href: string; sections: Section[]; image?: ImageValue; warning?: string; blog?: boolean };
type LinkSources = { pages: LinkPage[]; email: string; phone: string };
type LinkKind = "page" | "section" | "address" | "email" | "phone" | "none";
const SourcesContext = createContext<LinkSources>({ pages: [], email: "", phone: "" });
const CurrentPageContext = createContext<string | undefined>(undefined);
const pageHref = (slug: string) => `/${slug.replace(/^\/+|\/+$/g, "")}`;
const anchorFor = (section: Section) => section.anchor || section.id;
const sectionLabel = (section: Section) => section.content.heading.replace(/\u00ad/g, "").trim() || section.name;

/** Every editor uses the same already-loaded draft; choosing a link never fetches. */
export function AdminLinkProvider({ content, children }: { content: WebsiteContent; children: ReactNode }) {
  const { t: adminText } = useAdminLanguage();
  const sources = useMemo<LinkSources>(() => {
    const pages: LinkPage[] = content.pages.map(page => ({ id: page.id, title: page.title, href: pageHref(page.slug), sections: page.sections, image: page.sections.find(section => section.content.image)?.content.image }));
    const blog = content.config.blog || defaultBlog;
    const blogWarning = blog.enabled ? undefined : adminText("Der Blog ist zurzeit ausgeblendet. Dieser Link wird erreichbar, sobald Sie den Blog freigeben.");
    if (blog.slug) pages.push({ id: "blog-index", title: blog.title || adminText("Beitragsübersicht"), href: pageHref(blog.slug), sections: [], blog: true, warning: blogWarning });
    for (const post of content.posts || []) {
      if (!post.slug.trim()) continue;
      pages.push({ id: `post-${post.id}`, title: post.title || adminText("Beitrag ohne Titel"), href: pageHref(`${blog.slug}/${post.slug}`), sections: post.sections, image: post.cover, blog: true, warning: post.status !== "published" ? adminText("Dieser Beitrag ist ein Entwurf. Veröffentlichen Sie ihn, bevor Sie den Link auf der Website verwenden.") : blogWarning });
    }
    return { pages, email: content.config.email, phone: content.config.phone };
  }, [content, adminText]);
  return <SourcesContext.Provider value={sources}>{children}</SourcesContext.Provider>;
}

export function CurrentLinkPageProvider({ pageId, children }: { pageId?: string; children: ReactNode }) {
  return <CurrentPageContext.Provider value={pageId}>{children}</CurrentPageContext.Provider>;
}

function findTarget(value: string, pages: LinkPage[], currentPageId?: string) {
  const hash = value.indexOf("#");
  const path = hash < 0 ? value : value.slice(0, hash);
  const anchor = hash < 0 ? "" : value.slice(hash + 1);
  const page = path ? pages.find(page => page.href.replace(/\/$/, "") === path.replace(/\/$/, "")) : pages.find(page => page.id === currentPageId) || pages.find(page => page.sections.some(section => anchorFor(section) === anchor));
  const section = page?.sections.find(section => anchorFor(section) === anchor);
  return { page, section, anchor };
}

function describeLink(value: string, sources: LinkSources, currentPageId: string | undefined, t: ReturnType<typeof useAdminLanguage>["t"]) {
  if (!value || value === "#") return { title: t("Linkziel auswählen"), detail: t("Seite, Abschnitt oder andere Adresse"), icon: Link2 };
  const target = findTarget(value, sources.pages, currentPageId);
  if (target.page) return { title: target.anchor ? target.section ? sectionLabel(target.section) : target.anchor : target.page.title, detail: target.anchor ? t("Abschnitt auf „{p1}“", { p1: target.page.title }) : t(target.page.blog ? "Blogseite" : "Seite Ihrer Website"), icon: target.anchor ? Hash : FileText };
  if (value.startsWith("mailto:")) return { title: value.slice(7), detail: t("E-Mail schreiben"), icon: Mail };
  if (value.startsWith("tel:")) return { title: value.slice(4), detail: t("Anrufen"), icon: Phone };
  if (value.startsWith("#")) return { title: value.slice(1), detail: t("Abschnitt auf dieser Seite"), icon: Hash };
  return { title: value, detail: t("Andere Adresse"), icon: Globe };
}

function normalizeAddress(value: string) {
  const trimmed = value.trim();
  return /^[\w-]+(?:\.[\w-]+)+(?:[/:?#]|$)/i.test(trimmed) ? `https://${trimmed}` : trimmed;
}
function validAddress(value: string) {
  if (/^\/(?!\/)/.test(value)) return !/[\s<>]/.test(value);
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && Boolean(url.hostname); } catch { return false; }
}
function mailAddress(value: string) { const address = value.startsWith("mailto:") ? value.slice(7).split("?")[0] : ""; try { return decodeURIComponent(address); } catch { return address; } }

export function LinkPicker({ value = "", onChange, label = "Linkziel", disabled = false, allowEmpty = true }: { value?: string; onChange: (value: string) => void; label?: string; disabled?: boolean; allowEmpty?: boolean }) {
  const { t: adminText } = useAdminLanguage();
  const sources = useContext(SourcesContext); const pageId = useContext(CurrentPageContext);
  const [open, setOpen] = useState(false); const description = describeLink(value, sources, pageId, adminText); const Icon = description.icon;
  return <div className="cms-link-picker"><button type="button" className="cms-link-picker-trigger" disabled={disabled} title={adminText("{p1} auswählen", { p1: adminText(label) })} aria-haspopup="dialog" onClick={() => setOpen(true)}><Icon size={18} aria-hidden="true" /><span><strong>{description.title}</strong>{" "}<small>{description.detail}</small></span><ChevronDown size={16} aria-hidden="true" /></button>{open && <LinkTargetDialog value={value} sources={sources} currentPageId={pageId} allowEmpty={allowEmpty} onClose={() => setOpen(false)} onSelect={href => { onChange(href); setOpen(false); }} />}</div>;
}

function LinkTargetDialog({ value, sources, currentPageId, allowEmpty, onClose, onSelect }: { value: string; sources: LinkSources; currentPageId?: string; allowEmpty: boolean; onClose: () => void; onSelect: (value: string) => void }) {
  const { t: adminText } = useAdminLanguage();
  const initial = findTarget(value, sources.pages, currentPageId);
  const initialKind: LinkKind = !value || value === "#" ? "page" : initial.page || value.startsWith("#") ? value.includes("#") ? "section" : "page" : value.startsWith("mailto:") ? "email" : value.startsWith("tel:") ? "phone" : "address";
  const [kind, setKind] = useState<LinkKind>(initialKind);
  const [selectedPageId, setSelectedPageId] = useState(initial.page?.id || currentPageId || "");
  const [anchor, setAnchor] = useState(initial.anchor);
  const [search, setSearch] = useState("");
  const [address, setAddress] = useState(initialKind === "address" ? value : "");
  const [email, setEmail] = useState(value.startsWith("mailto:") ? mailAddress(value) : sources.email);
  const [phone, setPhone] = useState(value.startsWith("tel:") ? value.slice(4) : sources.phone);
  const [error, setError] = useState(""); const id = useId();
  const selectedPage = sources.pages.find(page => page.id === selectedPageId);
  const sections = selectedPage?.sections.filter(section => section.visible) || [];
  const query = search.toLocaleLowerCase("de").trim();
  const pages = sources.pages.filter(page => `${page.title} ${page.href}`.toLocaleLowerCase("de").includes(query));
  const selectedSection = sections.find(section => anchorFor(section) === anchor);
  const pageOptions = pages.some(page => page.id === selectedPageId) || !selectedPage ? pages : [selectedPage, ...pages];
  const unchangedSection = initial.page?.id === selectedPageId && initial.anchor === anchor;
  const mailSuffix = value.startsWith("mailto:") && value.includes("?") ? value.slice(value.indexOf("?")) : "";
  const target = kind === "page" ? selectedPage?.href || "" : kind === "section" ? selectedPage && selectedSection ? unchangedSection && value.includes("#") ? value : `${selectedPage.href}#${anchorFor(selectedSection)}` : "" : kind === "address" ? normalizeAddress(address) : kind === "email" ? value.startsWith("mailto:") && email.trim() === mailAddress(value) ? value : `mailto:${email.trim()}${mailSuffix}` : kind === "phone" ? value.startsWith("tel:") && phone === value.slice(4) ? value : `tel:${phone.replace(/[^+\d]/g, "")}` : "";
  const valid = kind === "none" || (kind === "page" || kind === "section") && Boolean(target) || kind === "address" && validAddress(target) || kind === "email" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || kind === "phone" && phone.replace(/\D/g, "").length >= 3;
  function changeKind(next: LinkKind) { setKind(next); setSearch(""); setError(""); }
  const modes = [{ value: "page", label: "Seite", icon: FileText }, { value: "section", label: "Abschnitt", icon: Hash }, { value: "address", label: "Adresse", icon: Globe }, { value: "email", label: "E-Mail", icon: Mail }, { value: "phone", label: "Telefon", icon: Phone }, { value: "none", label: "Kein Link", icon: Unlink }] as const;

  return <Modal title={adminText("Linkziel auswählen")} dirty={target!==value} description={adminText("Wählen Sie eine Seite oder einen Abschnitt Ihrer Website. Eine andere Adresse können Sie selbst eingeben.")} onClose={onClose} footer={<><Button data-dialog-close>{adminText("Abbrechen")}</Button><Button variant="primary" disabled={!valid} onClick={() => { if (valid) onSelect(target); else setError(adminText("Wählen Sie ein Ziel aus oder prüfen Sie die eingegebene Adresse.")); }}><Check size={16} />{kind === "none" ? adminText("Link entfernen") : adminText("Link übernehmen")}</Button></>}>
    <div className="cms-link-target-modes" role="group" aria-label={adminText("Art des Linkziels")}>{modes.filter(mode => allowEmpty || mode.value !== "none").map(mode => <button type="button" key={mode.value} aria-pressed={kind === mode.value} onClick={() => changeKind(mode.value)}><mode.icon size={17} aria-hidden="true" />{adminText(mode.label)}</button>)}</div>
    <div className="cms-link-target-content">
      {(kind === "page" || kind === "section") && <>
        {sources.pages.length > 8 && <SearchField value={search} onChange={setSearch} placeholder={adminText("Seite oder Beitrag suchen …")} label={adminText("Linkziele durchsuchen")} />}
        <Field label={adminText(kind === "page" ? "Seite auswählen" : "Seite mit dem gewünschten Abschnitt")}>
          <Select value={selectedPageId} onChange={event => { setSelectedPageId(event.target.value); setAnchor(""); setError(""); }}>
            <option value="">{adminText("Seite auswählen …")}</option>
            {pageOptions.map(page => <option key={page.id} value={page.id}>{page.title} · {page.href}</option>)}
          </Select>
        </Field>
        {!pages.length && <p className="cms-link-empty">{adminText("Keine passende Seite gefunden. Versuchen Sie einen anderen Suchbegriff.")}</p>}
        {kind === "section" && selectedPage && (sections.length > 0
          ? <Field label={adminText("Abschnitt auswählen")}><Select value={anchor} onChange={event => setAnchor(event.target.value)}>
              <option value="">—</option>{sections.map(section => <option key={section.id} value={anchorFor(section)}>{sectionLabel(section)}</option>)}
            </Select></Field>
          : <p className="cms-link-empty">{adminText("Diese Seite enthält noch keine sichtbaren Abschnitte. Sie können die ganze Seite verlinken.")}</p>)}
        {kind === "page" && selectedPage && sections.length > 0 && <Button className="cms-link-choose-section" onClick={() => changeKind("section")}><Hash size={16} />{adminText("Optional: Abschnitt auf dieser Seite wählen")}</Button>}
      </>}
      {kind === "address" && <Field label={adminText("Internet- oder Dateiadresse")} hint={adminText("Zum Beispiel https://www.beispiel.de oder /downloads/beispiel.txt")}><Input type="text" inputMode="url" autoComplete="url" placeholder="https://…" value={address} onChange={event => { setAddress(event.target.value); setError(""); }} /></Field>}
      {kind === "email" && <Field label={adminText("E-Mail-Adresse")} hint={adminText("Beim Anklicken öffnet sich das E-Mail-Programm.")}><Input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></Field>}
      {kind === "phone" && <Field label={adminText("Telefonnummer")} hint={adminText("Beim Anklicken kann die Nummer angerufen werden.")}><Input type="tel" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} /></Field>}
      {kind === "none" && <div className="cms-link-none"><Unlink size={28} aria-hidden="true" /><p>{adminText("Dieser Inhalt erhält kein Linkziel. Seine Beschriftung und übrigen Angaben bleiben erhalten.")}</p></div>}
      {(kind === "page" || kind === "section") && selectedPage?.warning && <Notice>{selectedPage.warning}</Notice>}
      {target && <div className="cms-link-target-preview" aria-live="polite" aria-atomic="true"><span id={`${id}-preview`}>{adminText("Gewähltes Ziel")}</span><strong>{target}</strong></div>}
      {error && <Notice tone="error">{adminText(error)}</Notice>}
    </div>
  </Modal>;
}

export function CanvasLinkDialog({ value = "", onClose, onSelect }: { value?: string; onClose: () => void; onSelect: (value: string) => void }) {
  const sources = useContext(SourcesContext);
  const currentPageId = useContext(CurrentPageContext);
  return <LinkTargetDialog value={value} sources={sources} currentPageId={currentPageId} allowEmpty onClose={onClose} onSelect={onSelect} />;
}
