"use client";

import { useAdminLanguage } from "./admin-language";
import type { AdminLanguage, AdminMessage, AdminTranslator } from "@/lib/admin-i18n/locale";
import { cloneElement, createContext, isValidElement, useContext, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactElement, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, BriefcaseBusiness, Building2, CalendarDays, Check, CheckCheck, ChevronDown, ChevronRight, CircleHelp, Clock3, Columns3, Copy, Download, ExternalLink, Eye, EyeOff, FileText, GripVertical, Image, Layers3, LayoutDashboard, Link, List, LoaderCircle, Mail, MapPin, Menu, MessageSquare, Minus, MoreHorizontal, Move, PanelLeft, PanelRight, Pencil, Phone, Plus, RefreshCw, Search, Settings2, ShieldCheck, Sparkles, Square, Trash2, Type, Upload, Users, X, type LucideIcon } from "lucide-react";

export const icons: Record<string, LucideIcon> = { "arrow-up-right": ArrowUpRight, briefcase: BriefcaseBusiness, building: Building2, calendar: CalendarDays, check: Check, clock: Clock3, document: FileText, mail: Mail, "map-pin": MapPin, message: MessageSquare, phone: Phone, shield: ShieldCheck, users: Users, link: Link, image: Image, list: List, columns: Columns3, layers: Layers3, square: Square, help: CircleHelp };
export { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Check, CheckCheck, ChevronDown, ChevronRight, CircleHelp, Copy, Download, ExternalLink, Eye, EyeOff, FileText, GripVertical, Image, Layers3, LayoutDashboard, LoaderCircle, Mail, MapPin, Menu, MessageSquare, Minus, MoreHorizontal, Move, PanelLeft, PanelRight, Pencil, Phone, Plus, RefreshCw, Search, Settings2, ShieldCheck, Sparkles, Trash2, Type, Upload, Users, X };

export function Icon({ name, size = 18 }: { name?: string; size?: number }) { const Component = icons[name || ""] || ArrowUpRight; return <Component size={size} aria-hidden="true" strokeWidth={1.7} />; }

export function Button({ children, variant = "default", busy, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "quiet" | "danger"; busy?: boolean }) {
  return <button type="button" {...props} disabled={props.disabled || busy} className={`cms-button cms-button--${variant} ${className}`} aria-busy={busy || undefined}>{busy && <LoaderCircle size={16} className="cms-spin" aria-hidden="true" />}{children}</button>;
}

export function IconButton({ label, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) { return <button type="button" {...props} className={`cms-icon-button ${props.className || ""}`} aria-label={label} title={label}>{children}</button>; }

const FieldContext = createContext<{ labelId: string; hintId?: string } | null>(null);
export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  const id = useId(); const labelId = `${id}-label`; const hintId = hint ? `${id}-hint` : undefined;
  const child = isValidElement(children) && typeof children.type === "string" && ["input", "select", "textarea"].includes(children.type) ? cloneElement(children as ReactElement<InputHTMLAttributes<HTMLInputElement>>, { "aria-labelledby": labelId, "aria-describedby": hintId }) : children;
  return <div className={`cms-field ${className}`}><span id={labelId} className="cms-label">{label}</span><FieldContext.Provider value={{ labelId, hintId }}>{child}</FieldContext.Provider>{hint && <span id={hintId} className="cms-hint">{hint}</span>}</div>;
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) { const field = useContext(FieldContext); return <input aria-labelledby={props["aria-label"] ? undefined : field?.labelId} aria-describedby={field?.hintId} {...props} className={`cms-input ${props.className || ""}`} />; }
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) { const field = useContext(FieldContext); return <textarea rows={3} aria-labelledby={props["aria-label"] ? undefined : field?.labelId} aria-describedby={field?.hintId} {...props} className={`cms-input cms-textarea ${props.className || ""}`} />; }
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) { const field = useContext(FieldContext); return <span className="cms-select-wrap"><select aria-labelledby={props["aria-label"] ? undefined : field?.labelId} aria-describedby={field?.hintId} {...props} className={`cms-input cms-select ${props.className || ""}`} /><ChevronDown size={15} aria-hidden="true" /></span>; }
export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (value: boolean) => void; label: string; hint?: string }) { return <label className="cms-toggle-row"><span><span className="cms-label">{label}</span>{hint && <span className="cms-hint">{hint}</span>}</span><input type="checkbox" role="switch" checked={checked} onChange={event => onChange(event.target.checked)} /><span className="cms-toggle" aria-hidden="true" /></label>; }

export function SearchField({ value, onChange, placeholder = "Suchen …", label = "Suchen" }: { value: string; onChange: (value: string) => void; placeholder?: string; label?: string }) {
  const { t: adminText } = useAdminLanguage(); return <label className="cms-search"><Search size={17} aria-hidden="true" /><input type="search" aria-label={adminText(label)} value={value} onChange={event => onChange(event.target.value)} placeholder={adminText(placeholder)} />{value && <button type="button" aria-label={adminText("Suche löschen")} onClick={() => onChange("")}><X size={14} /></button>}</label>; }

export function Modal({ title, description, children, onClose, wide, drawer, footer, dirty = false, busy = false }: { title: string; description?: string; children: ReactNode; onClose: () => void; wide?: boolean; drawer?: boolean; footer?: ReactNode; dirty?: boolean; busy?: boolean }) {
  const { t: adminText } = useAdminLanguage();
  const ref = useRef<HTMLDialogElement>(null); const id = useId();
  const [confirming, setConfirming] = useState(false);
  const editingFocus = useRef<HTMLElement | null>(null);
  const editingScroll = useRef(0);
  const opener=useRef<HTMLElement|null>(typeof document==='undefined'?null:document.activeElement as HTMLElement);
  useEffect(() => { const dialog = ref.current; if (dialog && !dialog.open) { dialog.showModal(); dialog.querySelector<HTMLInputElement>('input[type="search"]')?.focus({preventScroll:true}); } return () => { if (dialog?.open) dialog.close();queueMicrotask(()=>{if(opener.current?.isConnected)opener.current.focus({preventScroll:true});}); }; }, []);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, [dirty]);
  useEffect(() => {
    if (confirming) { if (ref.current) ref.current.scrollTop = 0; ref.current?.querySelector<HTMLButtonElement>("[data-keep-editing]")?.focus(); }
    else if (editingFocus.current?.isConnected) { if (ref.current) ref.current.scrollTop = editingScroll.current; editingFocus.current.focus({ preventScroll: true }); }
  }, [confirming]);
  function requestClose() {
    if (busy) return;
    if (!dirty) { onClose(); return; }
    editingFocus.current = document.activeElement as HTMLElement | null;
    editingScroll.current = ref.current?.scrollTop || 0;
    setConfirming(true);
  }
  return <dialog ref={ref} className={`cms-modal ${wide ? "cms-modal--wide" : ""} ${drawer ? "cms-modal--drawer" : ""}`} aria-labelledby={id} onCancel={event => { event.preventDefault(); if (confirming) setConfirming(false); else requestClose(); }} onClick={event => { if (event.target === event.currentTarget) requestClose(); }} onClickCapture={event => { if (event.target instanceof Element && event.target.closest("[data-dialog-close]")) { event.preventDefault(); event.stopPropagation(); requestClose(); } }}><div className="cms-modal-inner"><header className="cms-modal-header"><div><h2 id={id}>{title}</h2>{description && <p>{description}</p>}</div><IconButton label={adminText("Schließen")} disabled={busy} onClick={() => confirming ? setConfirming(false) : requestClose()}><X size={20} /></IconButton></header>{confirming && <section className="cms-modal-discard" role="alertdialog" aria-labelledby={`${id}-discard`} aria-describedby={`${id}-discard-description`}><h3 id={`${id}-discard`}>{adminText("Änderungen verwerfen?")}</h3><p id={`${id}-discard-description`}>{adminText("Ihre Eingaben sind noch nicht gespeichert. Sie können weiterarbeiten oder sie verwerfen.")}</p><div className="cms-modal-discard-actions"><Button variant="primary" data-keep-editing onClick={() => setConfirming(false)}>{adminText("Weiter bearbeiten")}</Button><Button onClick={onClose}>{adminText("Änderungen verwerfen")}</Button></div></section>}<div className="cms-modal-content" hidden={confirming}>{children}</div>{footer && <footer className="cms-modal-footer" hidden={confirming}>{footer}</footer>}</div></dialog>;
}

export function EmptyState({ icon: Component = FileText, title, children, action, headingLevel: Heading = "h3" }: { icon?: LucideIcon; title: string; children?: ReactNode; action?: ReactNode; headingLevel?: "h2" | "h3" }) { return <div className="cms-empty"><Component size={32} strokeWidth={1.3} aria-hidden="true" /><Heading>{title}</Heading>{children && <p>{children}</p>}{action}</div>; }
export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" | "success" }) { return <div className={`cms-notice cms-notice--${tone}`} role={tone === "error" ? "alert" : "status"}>{children}</div>; }
export function formatDate(value?: string | null, full = true, language: AdminLanguage = "de") { if (!value) return language === "en" ? "Not published yet" : "Noch nicht veröffentlicht"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "–" : new Intl.DateTimeFormat(language === "en" ? "en-GB" : "de-DE", { dateStyle: "medium", ...(full ? { timeStyle: "short" as const } : {}), timeZone: "Europe/Berlin" }).format(date); }
export function formatBytes(bytes: number, language: AdminLanguage = "de") {
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
  return new Intl.NumberFormat(language === "en" ? "en-GB" : "de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(bytes / (1024 * 1024)) + " MB";
}
export function clone<T>(value: T): T { return structuredClone(value); }
export function newId() { return crypto.randomUUID(); }

export class ApiError extends Error {
  constructor(message: string, public status: number, public messages?: readonly AdminMessage[]) {
    super(message);
    this.name = "ApiError";
  }
}
export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { ...(options?.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...options?.headers } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && url !== "/api/admin/login") window.location.assign("/admin/login");
    const messages = Array.isArray(result.messages) ? result.messages.filter((item: unknown): item is AdminMessage =>
      typeof item === "object" && item !== null && "message" in item && typeof item.message === "string") : undefined;
    throw new ApiError(result.error || "Die Änderung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.", response.status, messages);
  }
  return result as T;
}
export function errorMessage(error: unknown, t?: AdminTranslator) {
  if (t && error instanceof ApiError && error.messages?.length) {
    return error.messages.map(({ message, values }) => t(message, values)).join("\n");
  }
  const message = error instanceof TypeError ? "Die Verbindung konnte nicht hergestellt werden. Bitte prüfen Sie Ihr Netz und versuchen Sie es erneut." : error instanceof Error ? error.message : "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.";
  return t ? t(message) : message;
}
