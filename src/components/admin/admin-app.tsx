"use client";

import { WorkspaceNavigation, workspaceShellClass } from "./workspace-navigation";
import { AdminLanguageSwitch, useAdminLanguage } from "./admin-language";
import { DEFAULT_ADMIN_LANGUAGE, parseAdminLanguage, type AdminMessage } from "@/lib/admin-i18n/locale";
import type { AdminRole } from '@/lib/auth-session';
import { canOpenWorkspace, workspaceHome } from '@/lib/team/permissions';
import { PersonalAccount, TeamPanel } from './team-panel';
import {ModulePanel} from "./module-panel";
import {BusinessStudio} from './business-studio';


import {CreatorLibraryContext,CommerceLibraryContext,Scroll3dLibraryContext,HospitalityLibraryContext} from "./section-library-dialog";
import {downloadBrowserDraft} from "./browser-draft";
import {CommerceManager} from "./commerce-manager";
import {withCommerceVisibility} from "@/lib/commerce/pages";
import {SocialStudioLoader} from "./social-studio-loader";
import {PostPlannerLoader} from "./post-planner-loader";
import type {SocialNavigationGuard} from "@/components/social/social-workflow-nav";
import type {AssistantActionId,SocialSuggestion} from "@/lib/assistant/model";
import {AssistantLoader} from "@/components/assistant/assistant-loader";
import {applyAssistantPagePlan,assistantSectionCatalog} from "@/lib/assistant/pages";
import { AdminLinkProvider } from "./link-picker";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, CalendarDays, LogOut, Newspaper, Palette, PanelLeftClose, Users, KeyRound } from "lucide-react";
import type { AdminBootstrap, CmsState, Inquiry, MediaAsset, SiteSettings, WebsiteContent } from "@/lib/types";
import { ApiError, Button, CircleHelp, ExternalLink, IconButton, Image, LayoutDashboard, LoaderCircle, Mail, Menu, Notice, Pencil, RefreshCw, Settings2, X, api, clone, errorMessage } from "./admin-ui";
import {AppointmentsManager} from "./appointments-manager";
import { Dashboard, HelpPanel } from "./dashboard-help";
import { WorkspaceSearch } from "./workspace-search";
import { InquiryInbox } from "./inquiry-inbox";
import { MediaManager } from "./media-manager";
import { RestaurantMenuManager } from "./restaurant-menu-manager";
import { ReservationsManager } from "./reservations-manager";
import { emptyMenu } from "@/lib/restaurant-menu/model";
import type { DraftActions } from "./hospitality-draft-actions";
import { PageEditor } from "./page-editor";
import { PublicationReview } from "./publication-review";
import { hasBilingualHomepage, publishedPagePath } from "@/lib/site-languages";
import { RouteTemplateEditor } from "./route-template-editor";
import type { RouteTemplateKey } from "@/lib/route-template-keys";
import { SiteSettingsPanel } from "./site-settings";
import { BlogManager } from "./blog-manager";
import { GuidedTour, browserTourComplete, markBrowserTourComplete } from "./guided-tour";
import { WorkspaceAppSettings } from "@/components/workspace-app/workspace-app-settings";
import { siteMediaUploadedEvent } from "@/components/site/editable";

import {ShieldCheck, ClipboardList, UtensilsCrossed} from "lucide-react";
import {SecurityCenter} from "./security-center";

export type AdminView = "client-portal" | "google-ads" | "appointments" | "restaurant-menu" | "reservations" | "club" | "coach" | "security" | "newsletter" | "team" | "account" | "analytics" | "agents" | "dashboard" | "editor" | "templates" | "blog" | "media" | "inquiries" | "settings" | "documents" | "commerce" | "social" | "planner" | "help";
const nav = [{id:"client-portal",label:"Coaching-Kunden",icon:Users},{id:"google-ads",label:"Google Ads",icon:Search},{id:"appointments",label:"Termine",icon:CalendarDays},{id:"restaurant-menu",label:"Speisen & Getränke",icon:UtensilsCrossed},{id:"reservations",label:"Reservierungen",icon:CalendarDays},{id:"coach",label:"Coach Studio",icon:ClipboardList},{id:"club",label:"Vereinsverwaltung",icon:Users},{id:"analytics",label:"Webanalyse",icon:LayoutDashboard},{id:"newsletter",label:"Newsletter",icon:Mail},{id:"agents",label:"KI & Agenten",icon:Settings2},{ id: "dashboard", label: "Übersicht", icon: LayoutDashboard }, { id: "editor", label: "Seiten bearbeiten", icon: Pencil }, { id: "blog", label: "Beiträge", icon: Newspaper }, { id: "templates", label: "Seitenvorlagen", icon: LayoutDashboard }, { id: "media", label: "Medien", icon: Image }, { id: "inquiries", label: "Anfragen", icon: Mail }, { id: "settings", label: "Einstellungen", icon: Settings2 }, { id: "security", label: "Sicherheit", icon: ShieldCheck }, { id: "documents", label: "Vorlagen", icon: Newspaper }, { id: "commerce", label: "Shop", icon: Newspaper }, { id: "social", label: "Social-Studio", icon: Palette }, { id: "planner", label: "Post-Planer", icon: CalendarDays }, { id: "team", label: "Team & Zugänge", icon: Users }, { id: "account", label: "Mein Zugang", icon: KeyRound }, { id: "help", label: "Hilfe", icon: CircleHelp }] as const;
type Toast = { id: string; message: string | readonly AdminMessage[]; error: boolean };

export function AdminApp({initialView="dashboard",initialSocialProject,initialPlannerProject,initialRouteError,role="owner"}:{role?:AdminRole;initialView?:AdminView;initialSocialProject?:string;initialPlannerProject?:string;initialRouteError?:string}) {
  const { t: adminText, language, setWorkspaceLanguage } = useAdminLanguage();
  const owner = role === "owner";
  const [data, setData] = useState<AdminBootstrap | null>(null); const dataRef = useRef<AdminBootstrap | null>(null); const [content, setContent] = useState<WebsiteContent | null>(null); const contentRef = useRef<WebsiteContent | null>(null); const saved = useRef(""); const allowedLeave = useRef(false); const bootstrapRequest = useRef<Promise<AdminBootstrap> | null>(null); const history = useRef<{ past: WebsiteContent[]; future: WebsiteContent[] }>({ past: [], future: [] }); const [historyState, setHistoryState] = useState({ undo: false, redo: false }); const [view, setView] = useState<AdminView>(initialView); const [mobileNav, setMobileNav] = useState(false); const [busy, setBusy] = useState<string | null>(null); const [loadingError, setLoadingError] = useState(""); const [conflict, setConflict] = useState(false); const [toasts, setToasts] = useState<Toast[]>([]); const [settingsDirty, setSettingsDirty] = useState(false); const [inquiryDirty,setInquiryDirty]=useState(false); const [settingsEntry,setSettingsEntry]=useState<"general"|"email">("general"); const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const assistantDraft=useRef({snapshot:"",token:""}); const assistantSnapshot=content?JSON.stringify(content):"";if(assistantDraft.current.snapshot!==assistantSnapshot)assistantDraft.current={snapshot:assistantSnapshot,token:crypto.randomUUID()};
  const [tourOpen,setTourOpen]=useState(false);
  const [tourComplete,setTourComplete]=useState(false);
  const [socialDirty,setSocialDirty]=useState(false);
  const [plannerDirty,setPlannerDirty]=useState(false);
  const [plannerSource,setPlannerSource]=useState<string|undefined>(initialPlannerProject);
  const [connectionRequest,setConnectionRequest]=useState('');
  const [requestedSocialProject,setRequestedSocialProject]=useState<{id:string;requestId:string}|undefined>(()=>(initialSocialProject||initialPlannerProject)?{id:(initialSocialProject||initialPlannerProject)!,requestId:"initial"}:undefined);
  const socialGuard=useRef<SocialNavigationGuard|null>(null),plannerGuard=useRef<SocialNavigationGuard|null>(null);
  const registerSocialGuard=useCallback((guard:SocialNavigationGuard|null)=>{socialGuard.current=guard;},[]);
  const registerPlannerGuard=useCallback((guard:SocialNavigationGuard|null)=>{plannerGuard.current=guard;},[]);
  const [templateStart, setTemplateStart] = useState<RouteTemplateKey>("blog-index");
  const [assistantPost,setAssistantPost]=useState<{id:string;post:SocialSuggestion}|undefined>();
  const [mobileViewport, setMobileViewport] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const navOpener = useRef<HTMLButtonElement | null>(null);
  const drawerOpen = mobileViewport && mobileNav && !tourOpen;
  const drawerState = useRef({ open: false, tour: false });
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1180px)");
    const update = () => {
      const focusMovesToHiddenNav = query.matches && sidebarRef.current?.contains(document.activeElement);
      setMobileViewport(query.matches); if (!query.matches) setMobileNav(false);
      if (focusMovesToHiddenNav) requestAnimationFrame(() => {
        if (!drawerState.current.open && !drawerState.current.tour) document.querySelector<HTMLElement>(".cms-nav-toggle")?.focus({ preventScroll: true });
      });
    };
    update(); query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => { drawerState.current = { open: drawerOpen, tour: tourOpen }; if (tourOpen) setMobileNav(false); }, [drawerOpen, tourOpen]);
  useEffect(() => {
    if (!drawerOpen) return;
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const bodyOverflow = document.body.style.overflow; const pageOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden"; document.documentElement.style.overflow = "hidden";
    const getFocusable = () => Array.from(sidebar.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [tabindex='0']")).filter(element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden" && !element.closest("[inert]"));
    const focusFirst = () => (sidebar.querySelector<HTMLElement>(".cms-nav-close") || getFocusable()[0] || sidebar).focus({ preventScroll: true });
    const frame = requestAnimationFrame(focusFirst);
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setMobileNav(false); return; }
      if ((event.ctrlKey || event.metaKey) && ["s", "z", "y"].includes(event.key.toLowerCase())) { event.preventDefault(); event.stopPropagation(); return; }
      if (event.key !== "Tab") return;
      const focusable = getFocusable(); const first = focusable[0]; const last = focusable.at(-1);
      if (!first || !last) { event.preventDefault(); sidebar.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !focusable.includes(document.activeElement as HTMLElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !focusable.includes(document.activeElement as HTMLElement))) { event.preventDefault(); first.focus(); }
    };
    const onFocus = (event: FocusEvent) => { if (event.target instanceof Node && !sidebar.contains(event.target)) focusFirst(); };
    document.addEventListener("keydown", onKeydown, true); document.addEventListener("focusin", onFocus, true);
    return () => {
      cancelAnimationFrame(frame); document.removeEventListener("keydown", onKeydown, true); document.removeEventListener("focusin", onFocus, true);
      document.body.style.overflow = bodyOverflow; document.documentElement.style.overflow = pageOverflow;
      requestAnimationFrame(() => {
        if (drawerState.current.open || drawerState.current.tour) return;
        const target = window.matchMedia("(max-width: 1180px)").matches ? navOpener.current || document.querySelector<HTMLElement>(".cms-nav-toggle") : sidebar.querySelector<HTMLElement>('nav [aria-current="page"]');
        if (target?.isConnected && target.getClientRects().length && !target.closest("[inert]")) target.focus({ preventScroll: true });
      });
    };
  }, [drawerOpen]);
  const dirty = Boolean(content && JSON.stringify(content) !== saved.current);
  const commitData = useCallback((next: AdminBootstrap) => {
    dataRef.current = next;
    setData(next);
    setWorkspaceLanguage(parseAdminLanguage(next.state.draft.config.defaultAdminLanguage) ?? DEFAULT_ADMIN_LANGUAGE);
  }, [setWorkspaceLanguage]);
  function replaceContent(next: WebsiteContent) { contentRef.current = next; setContent(next); }
  const toast = useCallback((message: Toast["message"], error = false) => { const id = crypto.randomUUID(); setToasts(previous => [...previous.slice(-2), { id, message, error }]); const timer = setTimeout(() => setToasts(previous => previous.filter(item => item.id !== id)), error ? 11000 : 6000); timers.current.push(timer); }, []);
  useEffect(()=>{if(initialRouteError)toast(initialRouteError,true);},[initialRouteError,toast]);
  useEffect(() => {
    let active = true;
    const request = bootstrapRequest.current ||= api<AdminBootstrap>("/api/admin/bootstrap");
    void request.then(result => {
      if (!active) return;
      commitData(result);
      contentRef.current = clone(result.state.draft);
      setContent(contentRef.current);
      saved.current = JSON.stringify(result.state.draft);
      const complete = browserTourComplete();
      setTourComplete(complete);
      if (!complete) setTourOpen(true);
    }).catch(error => { if (active) setLoadingError(errorMessage(error)); });
    return () => { active = false; timers.current.forEach(clearTimeout); };
  }, [initialView, commitData]);
  useEffect(() => {
    const handleUpload = (event: Event) => {
      const asset = (event as CustomEvent<MediaAsset>).detail; const current = dataRef.current;
      if (!current || !asset?.id || !asset.url || current.media.some(item => item.id === asset.id)) return;
      const next = { ...current, media: [asset, ...current.media] };
      dataRef.current = next; setData(next);
    };
    window.addEventListener(siteMediaUploadedEvent, handleUpload);
    return () => window.removeEventListener(siteMediaUploadedEvent, handleUpload);
  }, []);
  function updateContent(next: WebsiteContent) { const previous = contentRef.current; if (previous && JSON.stringify(previous) === JSON.stringify(next)) return; if (previous) history.current.past = [...history.current.past.slice(-69), clone(previous)]; history.current.future = []; setHistoryState({ undo: history.current.past.length > 0, redo: false }); replaceContent(next); }
  function undo() { const previous = history.current.past.pop(); if (!previous || !contentRef.current) return; history.current.future.push(clone(contentRef.current)); replaceContent(previous); setHistoryState({ undo: history.current.past.length > 0, redo: true }); }
  function redo() { const next = history.current.future.pop(); if (!next || !contentRef.current) return; history.current.past.push(clone(contentRef.current)); replaceContent(next); setHistoryState({ undo: true, redo: history.current.future.length > 0 }); }
  function handleMutationError(error: unknown) { if (error instanceof ApiError && error.status === 409) { setConflict(true); toast("Der Entwurf wurde zwischenzeitlich geändert. Laden Sie den aktuellen Stand neu, bevor Sie weiter speichern.", true); } else toast(error instanceof ApiError && error.messages?.length ? error.messages : errorMessage(error), true); }
  async function saveDraft() { const currentData = dataRef.current; const currentContent = contentRef.current; if (!currentData || !currentContent || busy) return; setBusy("save"); const submitted = clone(currentContent); try { const result = await api<{ state: CmsState }>("/api/admin/content", { method: "PUT", body: JSON.stringify({ content: submitted, revision: currentData.state.revision }) }); commitData({ ...dataRef.current!, state: result.state }); saved.current = JSON.stringify(result.state.draft); if (JSON.stringify(contentRef.current) === JSON.stringify(submitted)) replaceContent(clone(result.state.draft)); setConflict(false); toast("Der Entwurf wurde gespeichert."); } catch (error) { handleMutationError(error); } finally { setBusy(null); } }
  const [publicationReview, setPublicationReview] = useState(false);
  async function publish() {
    if (JSON.stringify(contentRef.current) !== saved.current) { toast("Speichern Sie zuerst den Entwurf.", true); return; }
    setPublicationReview(true);
  }
  async function confirmPublication() { const currentData = dataRef.current; if (!currentData || busy) return; if (JSON.stringify(contentRef.current) !== saved.current) { toast("Speichern Sie zuerst den Entwurf.", true); return; } setBusy("publish"); try { const result = await api<{ state: CmsState }>("/api/admin/publish", { method: "POST", body: JSON.stringify({ revision: currentData.state.revision }) }); commitData({ ...dataRef.current!, state: result.state }); saved.current = JSON.stringify(result.state.draft); setConflict(false); setPublicationReview(false); toast("Ihre Änderungen wurden veröffentlicht."); } catch (error) { handleMutationError(error); } finally { setBusy(null); } }
  async function restore(id: string) { if (!dataRef.current || busy) return; setBusy("restore"); try { const result = await api<{ state: CmsState }>("/api/admin/restore", { method: "POST", body: JSON.stringify({ id, revision: dataRef.current.state.revision }) }); if (contentRef.current) history.current.past.push(clone(contentRef.current)); history.current.future = []; commitData({ ...dataRef.current!, state: result.state }); saved.current = JSON.stringify(result.state.draft); replaceContent(clone(result.state.draft)); setHistoryState({ undo: history.current.past.length > 0, redo: false }); setConflict(false); toast("Die Version wurde als Entwurf wiederhergestellt."); } catch (error) { handleMutationError(error); throw error; } finally { setBusy(null); } }
  async function changeShopVisibility(enabled: boolean) {
    const current = dataRef.current;
    if (!current || busy) return;
    setBusy("commerce-visibility");
    try {
      const {state} = await api<{state: CmsState}>("/api/admin/commerce-visibility", {
        method: "POST", body: JSON.stringify({enabled, revision: current.state.revision}),
      });
      commitData({...dataRef.current!, state});
      saved.current = JSON.stringify(state.draft);
      if (contentRef.current) replaceContent(withCommerceVisibility(contentRef.current, enabled));
      history.current.past = history.current.past.map(snapshot => withCommerceVisibility(snapshot, enabled));
      history.current.future = history.current.future.map(snapshot => withCommerceVisibility(snapshot, enabled));
      setConflict(false);
      toast(enabled ? "Der Shop ist jetzt online." : "Der Shop ist jetzt ausgeblendet.");
    } catch (error) {
      handleMutationError(error);
    } finally {
      setBusy(null);
    }
  }
  async function saveSettings(settings: SiteSettings) { const result = await api<{ settings: SiteSettings }>("/api/admin/settings", { method: "PUT", body: JSON.stringify({ settings }) }); const previous = dataRef.current!; commitData({ ...previous, settings: result.settings, system: { ...previous.system, smtp: result.settings.smtp.enabled && Boolean(result.settings.smtp.host) } }); toast("Die Einstellungen wurden gespeichert."); return result.settings; }
  async function persistBlogDraft() {
    const currentData=dataRef.current!; const submitted=clone(contentRef.current!);
    if(JSON.stringify(submitted)===saved.current)return;
    const result=await api<{state:CmsState}>("/api/admin/content",{method:"PUT",body:JSON.stringify({content:submitted,revision:currentData.state.revision})});
    commitData({...dataRef.current!,state:result.state}); saved.current=JSON.stringify(result.state.draft);
    if(JSON.stringify(contentRef.current)!==JSON.stringify(submitted))throw new Error("Es gibt weitere Änderungen. Bitte speichern Sie den aktuellen Stand erneut.");
    replaceContent(clone(result.state.draft)); setConflict(false);
  }
  async function saveBlog() {
    if(busy)return;setBusy("blog-save");
    try{await persistBlogDraft();toast("Der Entwurf wurde gespeichert.");}catch(error){handleMutationError(error);throw error;}finally{setBusy(null);}
  }
  async function blogAction(action:"publish"|"unpublish"|"delete"|"settings",id?:string) {
    if(busy)return;setBusy("blog");
    try{
      await persistBlogDraft();
      const result=await api<{state:CmsState}>(`/api/admin/blog/${action}`,{method:"POST",body:JSON.stringify({id,revision:dataRef.current!.state.revision})});
      commitData({...dataRef.current!,state:result.state});saved.current=JSON.stringify(result.state.draft);replaceContent(clone(result.state.draft));
      history.current={past:[],future:[]};setHistoryState({undo:false,redo:false});setConflict(false);
      toast(action==="publish"?"Der Beitrag wurde veröffentlicht.":action==="unpublish"?"Der Beitrag ist jetzt ein Entwurf.":action==="delete"?"Der Beitrag wurde gelöscht.":"Die Blog-Einstellungen wurden übernommen.");
    }catch(error){handleMutationError(error);throw error;}finally{setBusy(null);}
  }
  function startTour() { setTourOpen(true); }
  function closeTour() { markBrowserTourComplete(); setTourComplete(true); setTourOpen(false); }
  async function upload(file: File) { if (file.size > 4 * 1024 * 1024) throw new Error("Diese Datei ist größer als 4 MB. Bitte verkleinern Sie sie vor dem Hochladen."); const form = new FormData(); form.append("file", file); form.append("alt", ""); const result = await api<{ asset: MediaAsset }>("/api/admin/media", { method: "POST", body: form }); commitData({ ...dataRef.current!, media: [result.asset, ...dataRef.current!.media] }); toast([{ message: "„{p1}“ wurde hochgeladen.", values: { p1: file.name } }]); return result.asset; }
  async function updateMedia(asset: MediaAsset) { const result = await api<{ asset: MediaAsset }>("/api/admin/media", { method: "PATCH", body: JSON.stringify({ id: asset.id, alt: asset.alt, position: asset.position }) }); commitData({ ...dataRef.current!, media: dataRef.current!.media.map(item => item.id === asset.id ? result.asset || asset : item) }); toast("Die Dateiangaben wurden gespeichert."); }
  async function deleteMedia(asset: MediaAsset) { if (JSON.stringify(contentRef.current).includes(asset.url)) throw new Error("Diese Datei wird im aktuellen Entwurf verwendet. Entfernen oder ersetzen Sie sie dort zuerst und speichern Sie den Entwurf."); await api("/api/admin/media", { method: "DELETE", body: JSON.stringify({ id: asset.id }) }); commitData({ ...dataRef.current!, media: dataRef.current!.media.filter(item => item.id !== asset.id) }); toast("Die Datei wurde gelöscht."); }
  async function updateInquiry(inquiry: Inquiry, changes: { status?: Inquiry["status"]; note?: string }) { const result = await api<{ inquiry?: Inquiry }>("/api/admin/inquiries", { method: "PATCH", body: JSON.stringify({ id: inquiry.id, ...changes }) }); commitData({ ...dataRef.current!, inquiries: dataRef.current!.inquiries.map(item => item.id === inquiry.id ? result.inquiry || { ...item, ...changes } : item) }); toast(changes.note !== undefined ? "Die Notiz wurde gespeichert." : "Der Status wurde geändert."); }
  async function retryWithdrawal(id:string) {
    const result=await api<{inquiry:Inquiry}>("/api/admin/inquiries/withdrawal-receipt", {method:"POST",body:JSON.stringify({id})});
    commitData({...dataRef.current!,inquiries:dataRef.current!.inquiries.map(item=>item.id===id?result.inquiry:item)});
    if(result.inquiry.emailStatus!=="sent")throw new Error("Der Versand konnte noch nicht bestätigt werden. Prüfen Sie die SMTP-Einstellungen.");
    toast("Die Eingangsbestätigung wurde gesendet.");
  }
  async function deleteInquiry(inquiry: Inquiry) { await api("/api/admin/inquiries", { method: "DELETE", body: JSON.stringify({ id: inquiry.id }) }); commitData({ ...dataRef.current!, inquiries: dataRef.current!.inquiries.filter(item => item.id !== inquiry.id) }); toast("Die Anfrage wurde gelöscht."); }
  function navigate(next: AdminView,after?:()=>void,toolApproved=false) {
    if (!canOpenWorkspace(role,next)) return false;
    if(inquiryDirty && view === "inquiries" && next !== view && !window.confirm(adminText("Die interne Notiz ist noch nicht gespeichert. Diesen Bereich verlassen und die Notiz verwerfen?"))) return false;
    if (next === "social" && dataRef.current?.state.draft.config.modules?.socialStudio?.enabled !== true) return false;
    if (next === "planner" && (!dataRef.current?.state.draft.config.modules?.socialPublishing?.enabled || !dataRef.current?.state.draft.config.modules?.socialStudio?.enabled)) return false;
    const toolGuard=view==="social"?socialGuard.current:view==="planner"?plannerGuard.current:null;
    if(next!==view&&!toolApproved&&toolGuard){toolGuard(()=>navigate(next,after,true));return false;}
    if (!toolApproved && plannerDirty && view === "planner" && next !== view && !window.confirm(adminText("Im Post-Planer gibt es ungespeicherte Änderungen. Den Bereich verlassen und diese Änderungen verwerfen?"))) return false;
    if (!toolApproved && socialDirty && view === "social" && next !== view && !window.confirm(adminText("Im Social-Studio gibt es ungespeicherte Änderungen. Möchten Sie diesen Bereich verlassen und die Änderungen verwerfen?"))) return false;
    if (settingsDirty && (view === "settings" || view === "documents") && next !== view && !window.confirm(view === "documents" ? adminText("Die Vorlagen wurden noch nicht gespeichert. Den Bereich verlassen und die Änderungen verwerfen?") : adminText("Die technischen Einstellungen wurden noch nicht gespeichert. Den Bereich verlassen und die Änderungen verwerfen?"))) return false;
    if (owner && (next === "client-portal" || next === "google-ads")) {
      after?.();
      window.location.assign(next === "client-portal" ? "/admin/coaching" : "/admin/google-ads");
      return true;
    }
    if (next === "coach" || next === "club") {
      const modules = dataRef.current?.state.draft.config.modules;
      const enabled = next === "coach" ? modules?.coachStudio?.enabled : modules?.clubManagement?.enabled;
      if (enabled !== true) return false;
      after?.();
      window.location.assign("/admin/" + next);
      return true;
    }
    if (next !== view) {setSocialDirty(false);setPlannerDirty(false);}
    setSettingsDirty(false); setView(next); setMobileNav(false);
    if(next!==view&&(view==="social"||view==="planner"||next==="social"||next==="planner")){const context=requestedSocialProject?.id,params=context?new URLSearchParams({[next==="planner"?"source":"project"]:context}):null;window.history.replaceState(null,"",next==="social"?"/admin/social"+(params?"?"+params:""):next==="planner"?"/admin/social/planner"+(params?"?"+params:""):"/admin");}
    if (next === "restaurant-menu" || next === "reservations") {
      window.history.replaceState(null, "", "/admin?view=" + next);
    } else if (view === "restaurant-menu" || view === "reservations") {
      if (next !== "social" && next !== "planner") window.history.replaceState(null, "", "/admin");
    }
    after?.(); return true;
  }
  function assistantNavigate(id:AssistantActionId){navigate(id==="pages"?"editor":id==="shop"?"commerce":id==="social"?(dataRef.current?.state.draft.config.modules?.socialPublishing?.enabled?"planner":"settings"):id);}
  async function logout(toolApproved=false) { const toolGuard=view==="social"?socialGuard.current:view==="planner"?plannerGuard.current:null;if(!toolApproved&&toolGuard){toolGuard(()=>void logout(true));return;}if ((dirty || inquiryDirty || settingsDirty || !toolApproved&&(socialDirty || plannerDirty)) && !window.confirm(adminText("Es gibt ungespeicherte Änderungen. Möchten Sie sich trotzdem abmelden und diese Änderungen verwerfen?"))) return; setBusy("logout"); try { await api("/api/admin/logout", { method: "POST", body: "{}" }); allowedLeave.current = true; window.location.assign("/admin/login"); } catch (error) { toast(errorMessage(error), true); setBusy(null); } }
  useEffect(() => { const handler = (event: BeforeUnloadEvent) => { if (!allowedLeave.current && (dirty || inquiryDirty || settingsDirty || socialDirty || plannerDirty)) { event.preventDefault(); event.returnValue = ""; } }; window.addEventListener("beforeunload", handler); return () => window.removeEventListener("beforeunload", handler); }, [dirty, inquiryDirty, settingsDirty, socialDirty, plannerDirty]);
  useEffect(() => { const handler = (event: KeyboardEvent) => { if (view === "social" || view === "planner" || !(event.ctrlKey || event.metaKey)) return; const target = event.target as HTMLElement; const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable; if (event.key.toLowerCase() === "s") { event.preventDefault(); if (contentRef.current && JSON.stringify(contentRef.current) !== saved.current) void saveDraft(); } if (!typing && event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); } }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); });
  if (!data || !content) return <main className="cms-root cms-loading">{loadingError ? <><h1>{adminText("Die Verwaltung konnte nicht geladen werden.")}</h1><Notice tone="error">{adminText(loadingError)}</Notice><Button onClick={() => window.location.reload()}><RefreshCw size={16} />{adminText("Erneut laden")}</Button><a href="/" className="cms-text-link">{adminText("Zur Website")}</a></> : <><div className="cms-loading-brand">Website <span>CMS</span></div><LoaderCircle className="cms-spin" size={25} /><p>{adminText("Verwaltung wird geladen …")}</p></>}</main>;
  const newInquiries = data.inquiries.filter(item => item.status === "new").length;
  const aiEnabled = owner && data.state.draft.config.modules?.aiAssistant?.enabled === true;
  const coachEnabled = owner && data.state.draft.config.modules?.coachStudio?.enabled === true;
  const clubEnabled = owner && data.state.draft.config.modules?.clubManagement?.enabled === true;
  const socialEnabled = owner && data.state.draft.config.modules?.socialStudio?.enabled === true;
  const publishingEnabled = socialEnabled && data.state.draft.config.modules?.socialPublishing?.enabled === true;
  const restaurantMenu = content.config.modules?.restaurantMenu;
  const reservations = content.config.modules?.reservations;
  const hospitalityActions: DraftActions = {
    dirty, busy, onSave: saveDraft, onPublish: owner ? publish : undefined, undo, redo,
    canUndo: historyState.undo, canRedo: historyState.redo,
  };
  const visibleNav = nav.filter(item => canOpenWorkspace(role,item.id) && (item.id!=="account"||!owner) &&
    (item.id!=="appointments"||content.config.modules?.consultations?.enabled) && (item.id!=="restaurant-menu"||restaurantMenu?.enabled) && (item.id!=="reservations"||reservations) &&
    (item.id!=="commerce"||role==="shop"||Boolean(content.config.modules?.commerce||content.config.modules?.creator?.enabled)) &&
    (item.id!=="coach"||coachEnabled) && (item.id!=="club"||clubEnabled) && (item.id!=="social"||socialEnabled) && (item.id!=="planner"||publishingEnabled))
    .map(item => ({ ...item, label: adminText(item.label) }));
  const staffDock = visibleNav.filter(item => item.id==="editor"||item.id==="media"||item.id==="commerce"||item.id==="account");
  return <CreatorLibraryContext.Provider value={content.config.modules?.creator?.enabled===true}><CommerceLibraryContext.Provider value={Boolean(content.config.modules?.commerce)}><Scroll3dLibraryContext.Provider value={content.config.modules?.scroll3d?.enabled===true}><HospitalityLibraryContext.Provider value={content.config.modules}><AdminLinkProvider content={content}><div className={`cms-root cms-app ${workspaceShellClass} cms-app--saas ${(view === "editor" || view === "templates" || view === "blog" || view === "social" || view === "planner") ? "cms-app--editor" : ""}`}><a href="#cms-main" className="cms-skip-link" inert={drawerOpen || tourOpen}>{adminText("Zum Inhalt springen")}</a>{drawerOpen && <button className="cms-nav-backdrop" type="button" tabIndex={-1} aria-hidden="true" aria-label={adminText("Menü schließen")} onClick={() => setMobileNav(false)} />}<aside ref={sidebarRef} id="cms-admin-navigation" inert={tourOpen || (mobileViewport && !mobileNav)} aria-hidden={tourOpen || (mobileViewport && !mobileNav) || undefined} role={drawerOpen ? "dialog" : undefined} aria-modal={drawerOpen || undefined} tabIndex={-1} className={`cms-sidebar ${drawerOpen ? "cms-sidebar--open" : ""}`} aria-label={adminText("Hauptnavigation")}><div className="cms-sidebar-brand"><button type="button" className="cms-brand-home" onClick={()=>navigate(workspaceHome(role))}><span className="cms-brand-initial">{content.config.name.slice(0,1).toLocaleUpperCase("de")}</span><span><strong>{content.config.name}</strong><small>{adminText("Arbeitsbereich")}</small></span></button><IconButton className="cms-nav-close" label={adminText("Menü schließen")} onClick={() => setMobileNav(false)}><PanelLeftClose size={20} /></IconButton></div><WorkspaceSearch items={visibleNav} onNavigate={navigate}/><WorkspaceNavigation items={visibleNav} view={view} onNavigate={navigate} language={language} tourOpen={tourOpen} newInquiries={newInquiries} channels={publishingEnabled ? { label: adminText("Kanäle"), open: () => navigate("planner", () => setConnectionRequest(crypto.randomUUID())) } : undefined} /><div className="cms-sidebar-bottom"><a href="/" target="_blank" rel="noopener noreferrer"><ExternalLink size={17} />{adminText("Website öffnen")}</a><button type="button" disabled={busy === "logout"} onClick={() => void logout()}><LogOut size={17} />{busy === "logout" ? adminText("Wird abgemeldet …") : adminText("Abmelden")}</button><div className="cms-session"><span />{data.account?.name || adminText("Angemeldet als Inhaber")}</div></div></aside>{publicationReview && owner && <PublicationReview state={data.state} t={adminText} pathFor={(page,snapshot)=>publishedPagePath(page.slug,hasBilingualHomepage(snapshot.pages))} busy={busy === "publish"} onClose={()=>setPublicationReview(false)} onConfirm={()=>void confirmPublication()}/>}<div className="cms-workspace" inert={tourOpen || drawerOpen}><header className="cms-app-header"><div><IconButton className="cms-nav-toggle" label={adminText("Hauptmenü öffnen")} aria-expanded={drawerOpen} aria-controls="cms-admin-navigation" aria-haspopup="dialog" onClick={event => { navOpener.current = event.currentTarget; setMobileNav(true); }}><Menu size={21} /></IconButton><span>{content.config.name}</span><span className="cms-header-separator">/</span><strong>{adminText(nav.find(item => item.id === view)?.label ?? "")}</strong></div><div className="cms-header-end"><AdminLanguageSwitch compact /><IconButton label={adminText("Bereich suchen")} onClick={()=>window.dispatchEvent(new Event("cms:open-search"))}><Search size={19}/></IconButton>{owner&&<IconButton label={adminText("Hilfe öffnen")} onClick={()=>navigate("help")}><CircleHelp size={19}/></IconButton>}<span className="cms-environment">{data.system.mode === "development" ? adminText("Entwicklungsumgebung") : adminText("Website-Verwaltung")}</span><span className="cms-avatar" aria-label={adminText("Unternehmen-Zugang")}>CMS</span></div></header>{conflict && <Notice tone="error"><div className="cms-conflict"><span>{adminText("Der Entwurf wurde in einer anderen Sitzung geändert. Laden Sie den aktuellen Stand neu, um unbeabsichtigtes Überschreiben zu vermeiden.")}</span><Button onClick={()=>downloadBrowserDraft(content)}>{adminText("Browser-Entwurf sichern")}</Button><Button onClick={() => { if (!dirty || window.confirm(adminText("Beim Neuladen gehen die ungespeicherten Änderungen dieser Sitzung verloren. Aktuellen Stand laden?"))) window.location.reload(); }}>{adminText("Aktuellen Stand laden")}</Button></div></Notice>}<main id="cms-main" className={`cms-main ${(view === "editor" || view === "templates" || view === "blog" || view === "social" || view === "planner") ? "cms-main--editor" : ""}`} tabIndex={-1}>{view === "dashboard" && <Dashboard onOperation={action=>{if(action==="email"){setSettingsEntry("email");navigate("settings");}else if(action==="channels")navigate("planner",()=>setConnectionRequest(crypto.randomUUID()));else navigate(action);}} onStartTour={startTour} data={{...data,settings:{...data.settings,onboardingComplete:tourComplete}}} content={content} dirty={dirty} onNavigate={navigate} onCompleteOnboarding={async () => closeTour()} />}{view === "editor" && <PageEditor emphasizeNextAction onAssistantNavigate={assistantNavigate} assistantMode={aiEnabled?"real":undefined} onSocialSuggestion={socialEnabled?post=>{setAssistantPost({id:crypto.randomUUID(),post});navigate("social");}:undefined} content={content} cmsState={data.state} onChange={updateContent} media={data.media} onUpload={upload} dirty={dirty} busy={busy} onSave={saveDraft} onPublish={owner?publish:undefined} onRestore={owner?restore:undefined} undo={undo} redo={redo} canUndo={historyState.undo} canRedo={historyState.redo} />}{view === "templates" && <RouteTemplateEditor key={templateStart} initialPageId={templateStart} content={content} cmsState={data.state} onChange={updateContent} media={data.media} onUpload={upload} dirty={dirty} busy={busy} onSave={saveDraft} onPublish={owner?publish:undefined} onRestore={owner?restore:undefined} undo={undo} redo={redo} canUndo={historyState.undo} canRedo={historyState.redo} />}{view === "blog" && <div className="cms-blog-view" inert={busy === "blog" || busy === "blog-save"}><BlogManager onOpenTemplates={() => navigate("templates", () => setTemplateStart("blog-index"))} content={content} onChange={updateContent} media={data.media} onUpload={upload} onSave={saveBlog} onAction={owner?blogAction:undefined} busy={Boolean(busy)} dirty={dirty} /></div>}{view === "media" && <MediaManager media={data.media} onUpload={upload} onUpdate={updateMedia} onDelete={owner?deleteMedia:undefined} />}{view === "inquiries" && <InquiryInbox proposalsEnabled={data.state.draft.config.modules?.proposals?.enabled===true} onProposal={(id,proposal)=>{const current=dataRef.current!;commitData({...current,inquiries:current.inquiries.map(inquiry=>inquiry.id===id?{...inquiry,proposal}:inquiry)});}} inquiries={data.inquiries} onRetryWithdrawal={retryWithdrawal} onUpdate={updateInquiry} onDelete={deleteInquiry} onDirtyChange={setInquiryDirty} />}{view === "commerce" && <CommerceManager liveStatus={data.state.published.config.modules?.commerce?.enabled} onSetLive={changeShopVisibility} liveBusy={Boolean(busy)} ordersOnly={role==="shop"} onOpenTemplates={content.config.modules?.commerce ? () => navigate("templates", () => setTemplateStart("shop-product")) : undefined} content={content} savedContent={data.state.draft} media={data.media} onUpload={upload} onChange={updateContent} onSave={saveDraft} onOpenEditor={()=>navigate("editor")} onOpenSettings={owner?()=>{setSettingsEntry("email");navigate("settings");}:undefined} dirty={dirty} busy={Boolean(busy)} />}{view === "social" && socialEnabled && <SocialStudioLoader onAssistantNavigate={assistantNavigate} publishingEnabled={publishingEnabled} onOpenPlanner={(id,contextId)=>navigate("planner",()=>{setPlannerSource(id);if(id||contextId)setRequestedSocialProject({id:(id||contextId)!,requestId:crypto.randomUUID()});const context=id||contextId||requestedSocialProject?.id;window.history.replaceState(null,"","/admin/social/planner"+(context?"?"+new URLSearchParams({[id?"project":"source"]:context}):""));},true)} onGuardReady={registerSocialGuard} requestedProject={requestedSocialProject} assistantEnabled={aiEnabled} suggestion={assistantPost} onDirtyChange={setSocialDirty}/>}
{view === "restaurant-menu" && <RestaurantMenuManager menu={restaurantMenu ?? emptyMenu} actions={hospitalityActions} onChange={value => updateContent({ ...content, config: { ...content.config, modules: { ...content.config.modules, restaurantMenu: value } } })} />}
{view === "reservations" && reservations && <ReservationsManager module={reservations} brand={content.config.name} actions={hospitalityActions} onOpenMailSettings={()=>navigate("settings",()=>setSettingsEntry("email"))} onChange={value => updateContent({ ...content, config: { ...content.config, modules: { ...content.config.modules, reservations: value } } })} />}
{view === "planner" && publishingEnabled && <PostPlannerLoader initialProjectId={plannerSource} connectionRequest={connectionRequest} onDirtyChange={setPlannerDirty} onGuardReady={registerPlannerGuard} onBack={()=>navigate("social",undefined,true)} onOpenSource={id=>navigate("social",()=>{setAssistantPost(undefined);setRequestedSocialProject({id,requestId:crypto.randomUUID()});window.history.replaceState(null,"","/admin/social?"+new URLSearchParams({project:id}));},true)}/>}
{(view === "agents" || view === "analytics" || view === "newsletter") && <ModulePanel kind={view}/>}
{view === "security" && <SecurityCenter/>}
{owner && view==="team" && <TeamPanel/>}
{!owner && view==="account" && <>
  <PersonalAccount name={data.account?.name} />
  <section className="cms-page cms-workspace-app-settings" aria-label={adminText("App & Benachrichtigungen")}>
    <WorkspaceAppSettings scope="cms" language={language} onRestartTour={startTour} />
  </section>
</>}
{view === "documents" && <BusinessStudio onDirtyChange={setSettingsDirty}/>}
{view === "appointments" && content.config.modules?.consultations?.enabled && <AppointmentsManager/>}
{view === "settings" && <SiteSettingsPanel onOpenDocuments={()=>navigate("documents")} initialTab={settingsEntry} onOpenCommerce={()=>navigate("commerce")} savedPublishingEnabled={publishingEnabled} savedAiEnabled={aiEnabled} savedSocialEnabled={socialEnabled} savedClubManagementEnabled={clubEnabled} onStartTour={startTour} config={content.config} settings={data.settings} onConfigChange={config => updateContent({ ...content, config })} onSaveConfig={saveDraft} configDirty={dirty} configBusy={busy === "save"} onSaveSettings={saveSettings} onDirtyChange={setSettingsDirty} />}{view === "help" && <HelpPanel onNavigate={navigate} onStartTour={startTour} commerce={Boolean(content.config.modules?.commerce)}
      appointments={Boolean(content.config.modules?.consultations?.enabled)} onEmail={()=>{navigate("settings");setSettingsEntry("email");}} />}</main><nav className="cms-mobile-dock" aria-label={adminText("Schnellzugriff")} style={!owner?{gridTemplateColumns:`repeat(${staffDock.length+1},1fr)`}:undefined}>{owner?<><button type="button" aria-current={view==="dashboard"?"page":undefined} onClick={()=>navigate("dashboard")}><LayoutDashboard size={20}/><span>{adminText("Übersicht")}</span></button><button type="button" aria-current={view==="editor"?"page":undefined} onClick={()=>navigate("editor")}><Pencil size={20}/><span>Website</span></button><button type="button" aria-current={view==="planner"||view==="social"||(!socialEnabled&&!publishingEnabled&&view==="media")?"page":undefined} onClick={()=>navigate(publishingEnabled?"planner":socialEnabled?"social":"media")}><CalendarDays size={20}/><span>{socialEnabled?"Social":adminText("Medien")}</span></button></>:staffDock.map(item=><button key={item.id} type="button" aria-current={view===item.id?"page":undefined} onClick={()=>navigate(item.id)}><item.icon size={20}/><span>{item.id==="account"?adminText("Zugang"):item.id==="editor"?"Website":item.label}</span></button>)}<button type="button" aria-expanded={drawerOpen} onClick={event=>{navOpener.current=event.currentTarget;setMobileNav(true);}}><Menu size={20}/><span>{adminText("Mehr")}</span></button></nav>{owner&&(view!=="editor"||!aiEnabled)&&!tourOpen&&!drawerOpen&&<AssistantLoader mode="real" workspaceOnly={!aiEnabled} tone={content.config.modules?.creator?.enabled?"du":"sie"} initialTask="help" context={{brandName:content.config.name,pageTitle:nav.find(item=>item.id===view)?.label,addressing:content.config.modules?.creator?.enabled?"du":"sie",availableSections:assistantSectionCatalog(content),pageList:content.pages.map(({title,slug})=>({title,slug})),draftToken:assistantDraft.current.token,helpTopic:view==="inquiries"?"inquiries":view==="commerce"?"shop":view==="planner"?"social":"cms"}} onNavigate={assistantNavigate} onCreatePage={(plan,captured)=>{if(busy)return{ok:false,error:"Bitte warten Sie, bis der aktuelle CMS-Vorgang abgeschlossen ist."};const current=contentRef.current;if(!current||assistantDraft.current.snapshot!==JSON.stringify(current))return{ok:false,error:"Der Entwurf wurde inzwischen geändert. Bitte erstellen Sie einen neuen Vorschlag."};try{const result=applyAssistantPagePlan(current,plan,captured.draftToken,assistantDraft.current.token);updateContent(result.content);toast("Die neue Seite liegt im ungespeicherten Entwurf. Navigation und Veröffentlichung bleiben unverändert.");return{ok:true};}catch(error){return{ok:false,error:error instanceof Error?error.message:"Die Seite konnte nicht angelegt werden."};}}} onCreatePost={socialEnabled?post=>{setAssistantPost({id:crypto.randomUUID(),post});navigate("social");}:undefined}/>}</div>{tourOpen && <GuidedTour availableViews={visibleNav.map(item => item.id)} owner={owner} onNavigate={navigate} onClose={closeTour} />}<div className="cms-toasts" aria-live="polite" aria-relevant="additions">{toasts.map(item => <div key={item.id} role={item.error ? "alert" : "status"} className={`cms-toast ${item.error ? "cms-toast--error" : ""}`}><span style={{ whiteSpace: "pre-line" }}>{typeof item.message === "string" ? adminText(item.message) : item.message.map(({ message, values }) => adminText(message, values)).join("\n")}</span><IconButton label={adminText("Meldung schließen")} onClick={() => setToasts(previous => previous.filter(toast => toast.id !== item.id))}><X size={15} /></IconButton></div>)}</div></div></AdminLinkProvider></HospitalityLibraryContext.Provider></Scroll3dLibraryContext.Provider></CommerceLibraryContext.Provider></CreatorLibraryContext.Provider>;
}
