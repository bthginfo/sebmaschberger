"use client";

import { useEffect, useId, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ArrowRight, ArrowUpRight, Check, CheckCheck, ChevronRight, FileText, Minus, Pencil, Plus, RotateCcw, ShoppingBag, Trash2, X } from "lucide-react";
import type { CreatorSectionProps } from "@/lib/creator/types";
import type { ContentItem } from "@/lib/types";
import { ContentLink, EditableText } from "@/components/site/editable";
import { useSectionHeadingLevel } from "@/components/site/heading-level";
import { CreatorBrowserFrame } from "../marketing/creator-browser-frame";
import { creatorCopy, itemCopy, updateCreatorItem } from "../marketing/creator-copy";
import { useActionMotion, useEditorialMotion, useFlipMotion } from "../motion/creator-motion";
import { creatorTool, postPlannerCopy } from "@/lib/creator/tools";
import { PostPlannerDemo, PostPlannerInfo } from "./post-planner-demo";
import postStyles from "./post-planner.module.css";
import styles from "./tools.module.css";

type Copy = (key: string) => string;
type PlanItem = { id: string; title: string; channel: string; date: string; stage: number };
type Campaign = { brand: string; deadline: string; budget: number; reels: number; stories: number; rights: number; stage: number };
type Drop = { price: number; cost: number; stock: number; date: string; reserved: number };
const euros = (value: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);

function parseSeed<T,>(value: string, fallback: T): T { try { return JSON.parse(value) as T; } catch { return fallback; } }

function useSessionState<T,>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>, () => void] {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { try { const saved = window.sessionStorage.getItem(key); if (saved) setValue(JSON.parse(saved) as T); } catch { /* Session storage is optional; the tool still works. */ } setLoaded(true); }, [key]);
  useEffect(() => { if (loaded) try { window.sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* No remote fallback. */ } }, [key, value, loaded]);
  return [value, setValue, () => { setValue(initial); try { window.sessionStorage.removeItem(key); } catch { /* Optional local persistence. */ } }];
}

function ToolHeading({ title, note, reset, onReset }: { title: string; note: string; reset: string; onReset: () => void }) {
  return <div className={styles.toolHeading}><div><h3>{title}</h3><span><i />{note}</span></div><button type="button" className={styles.reset} onClick={onReset}><RotateCcw size={15} /><span>{reset}</span></button></div>;
}

function ContentPlanner({ item, ui, disabled = false }: { item: ContentItem; ui: Copy; disabled?: boolean }) {
  const copy = itemCopy(item);
  const seed = parseSeed<PlanItem[]>(copy("seed"), []);
  const [plans, setPlans, reset] = useSessionState<PlanItem[]>(`creator-tool-v1-planner-${item.id}`, seed);
  const [filter, setFilter] = useState("all");
  const [draft, setDraft] = useState<PlanItem | null>(null);
  const [error, setError] = useState("");
  const id = useId();
  const flipRoot = useRef<HTMLDivElement>(null);
  useFlipMotion(flipRoot, `${filter}:${JSON.stringify(plans)}`, disabled);
  const stages = [copy("stage0"), copy("stage1"), copy("stage2")];
  const channels = copy("channels").split("|").filter(Boolean);
  const filtered = plans.filter(plan => filter === "all" || plan.channel === filter);
  const movePlan = (plan: PlanItem, keyboard: boolean) => {
    setPlans(previous => previous.map(current => current.id === plan.id ? { ...current, stage: (current.stage + 1) % 3 } : current));
    if (keyboard) requestAnimationFrame(() => { const card = Array.from(flipRoot.current?.querySelectorAll<HTMLElement>("[data-flip-key]") ?? []).find(node => node.dataset.flipKey === plan.id); card?.querySelector<HTMLButtonElement>("[data-stage-move]")?.focus({ preventScroll: true }); });
  };
  const save = () => {
    if (!draft?.title.trim() || !draft.date || !draft.channel) { setError(copy("error")); return; }
    setPlans(previous => previous.some(plan => plan.id === draft.id) ? previous.map(plan => plan.id === draft.id ? { ...draft, title: draft.title.trim() } : plan) : [...previous, { ...draft, title: draft.title.trim() }]);
    setDraft(null); setError("");
  };
  return <div ref={flipRoot} className={`${styles.tool} ${styles.planner}`} data-creator-tool="planner">
    <div className={styles.inlineControls} data-inline-controls="">
      {plans[0]?<><label>{copy("titleLabel")}<input aria-label={copy("titleLabel")} value={plans[0].title} maxLength={100} onChange={event=>setPlans(previous=>previous.map((plan,n)=>n===0?{...plan,title:event.target.value}:plan))}/></label><div className={styles.quickRow}><span aria-live="polite">{copy("stageLabel")}<strong>{stages[plans[0].stage]}</strong></span><button type="button" className={styles.solid} aria-label={`${copy("move")} ${plans[0].title}: ${stages[(plans[0].stage+1)%3]}`} onClick={()=>movePlan(plans[0],false)}><ArrowRight size={17}/>{stages[(plans[0].stage+1)%3]}</button></div></>:<p>{copy("empty")}</p>}
    </div>
    <ToolHeading title={copy("appTitle")} note={ui("session")} reset={ui("reset")} onReset={() => { reset(); setDraft(null); setFilter("all"); setError(""); }} />
    <div className={styles.planToolbar}><label>{copy("filter")}<select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">{copy("all")}</option>{channels.map(channel => <option key={channel}>{channel}</option>)}</select></label><button type="button" className={styles.solid} onClick={() => { setDraft({ id: crypto.randomUUID(), title: "", channel: channels[0] ?? "", date: "2026-11-04", stage: 0 }); setError(""); }}><Plus size={17} />{copy("add")}</button></div>
    {draft && <div className={styles.planEditor}>
      <div className={styles.editorTitle}><strong>{copy("editTitle")}</strong><button type="button" className={styles.icon} aria-label={ui("close")} onClick={() => { setDraft(null); setError(""); }}><X size={18} /></button></div>
      <label className={styles.fullField} htmlFor={`${id}-title`}>{copy("titleLabel")}<input id={`${id}-title`} autoFocus value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder={copy("titlePlaceholder")} maxLength={100} /></label>
      <div className={styles.editorGrid}><label>{copy("channelLabel")}<select value={draft.channel} onChange={event => setDraft({ ...draft, channel: event.target.value })}>{channels.map(channel => <option key={channel}>{channel}</option>)}</select></label><label>{copy("dateLabel")}<input type="date" value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} /></label><label>{copy("stageLabel")}<select value={draft.stage} onChange={event => setDraft({ ...draft, stage: Number(event.target.value) })}>{stages.map((stage, n) => <option value={n} key={n}>{stage}</option>)}</select></label></div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.editorActions}>{plans.some(plan => plan.id === draft.id) && <button type="button" className={styles.textButton} onClick={() => { setPlans(plans.filter(plan => plan.id !== draft.id)); setDraft(null); }}><Trash2 size={15} />{copy("delete")}</button>}<button type="button" className={styles.solid} onClick={save}><Check size={16} />{copy("save")}</button></div>
    </div>}
    <div className={styles.kanban}>{stages.map((stage, n) => <div className={styles.planColumn} key={n}><div className={styles.columnTitle}><span><i data-stage={n} />{stage}</span><span key={filtered.filter(plan => plan.stage === n).length} className={styles.countChange}>{filtered.filter(plan => plan.stage === n).length}</span></div><div className={styles.planCards}>{filtered.filter(plan => plan.stage === n).map(plan => <article key={plan.id} data-flip-key={plan.id} className={styles.planCard}><span className={styles.channel}>{plan.channel}</span><h4>{plan.title}</h4><time dateTime={plan.date}>{new Date(`${plan.date}T12:00:00`).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}</time><div><button type="button" className={styles.icon} aria-label={`${copy("edit")} ${plan.title}`} onClick={() => { setDraft(plan); setError(""); }}><Pencil size={14} /></button><button type="button" className={styles.move} data-stage-move aria-label={`${copy("move")} ${plan.title}: ${stages[(n + 1) % 3]}`} onClick={event => movePlan(plan, event.detail === 0)}>{n === 2 ? <RotateCcw size={15} /> : <ArrowRight size={15} />}</button></div></article>)}</div>{filtered.every(plan => plan.stage !== n) && <p className={styles.empty}>{copy("empty")}</p>}</div>)}</div>
    <div className={styles.plannerPreview}><div><span>{copy("previewLabel")}</span><strong>{copy("previewTitle")}</strong></div><div>{plans.filter(plan => plan.stage === 2).length > 0 ? plans.filter(plan => plan.stage === 2).map(plan => <span key={plan.id}><Check size={14} />{plan.title}</span>) : <span>{copy("previewEmpty")}</span>}</div></div>
  </div>;
}

function CampaignDesk({ item, ui }: { item: ContentItem; ui: Copy }) {
  const copy = itemCopy(item);
  const initial = parseSeed<Campaign>(copy("seed"), { brand: "", deadline: "", budget: 0, reels: 0, stories: 0, rights: 0, stage: 0 });
  const [campaign, setCampaign, reset] = useSessionState<Campaign>(`creator-tool-v1-campaign-${item.id}`, initial);
  const [offer, setOffer] = useState(false), [error, setError] = useState("");
  const update = <K extends keyof Campaign>(key: K, value: Campaign[K]) => setCampaign(previous => ({ ...previous, [key]: value }));
  const rights = campaign.budget * campaign.rights / 100, total = campaign.budget + rights;
  const stages = [copy("stage0"), copy("stage1"), copy("stage2")];
  const generate = () => { if (!campaign.brand.trim() || !campaign.deadline || campaign.budget <= 0 || campaign.reels + campaign.stories < 1) { setError(copy("error")); return; } setError(""); setOffer(true); };
  const download = () => { const content = [copy("offerTitle"), campaign.brand, `${copy("deadline")}: ${campaign.deadline}`, `${copy("reels")}: ${campaign.reels}`, `${copy("stories")}: ${campaign.stories}`, `${copy("budget")}: ${euros(campaign.budget)}`, `${copy("rightsAmount")}: ${euros(rights)}`, `${copy("total")}: ${euros(total)}`, copy("offerNote")].join("\n"); const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = "creator-beispielangebot.txt"; link.click(); URL.revokeObjectURL(url); };
  return <div className={`${styles.tool} ${styles.campaign}`} data-creator-tool="campaign">
    <div className={styles.inlineControls} data-inline-controls=""><div className={styles.quickRow}><label>{copy("brand")}<input value={campaign.brand} maxLength={80} onChange={event=>update("brand",event.target.value)}/></label><label>{copy("budget")}<input type="number" min="0" max="100000" step="50" value={campaign.budget} onChange={event=>update("budget",Math.max(0,Math.min(100000,Number(event.target.value))))}/></label></div><div className={styles.quickRow}><span>{copy("total")}<strong aria-live="polite">{euros(total)}</strong></span><button type="button" className={styles.solid} onClick={()=>update("stage",(campaign.stage+1)%3)}>{stages[campaign.stage]}<ArrowRight size={17}/></button></div></div>
    <ToolHeading title={copy("appTitle")} note={ui("session")} reset={ui("reset")} onReset={() => { reset(); setOffer(false); setError(""); }} />
    <div className={styles.campaignLayout}><div className={styles.campaignForm}>
      <label>{copy("brand")}<input value={campaign.brand} onChange={event => update("brand", event.target.value)} maxLength={80} /></label><div className={styles.twoFields}><label>{copy("deadline")}<input type="date" value={campaign.deadline} onChange={event => update("deadline", event.target.value)} /></label><label>{copy("budget")}<span className={styles.currencyField}><input type="number" min="0" max="100000" step="50" value={campaign.budget} onChange={event => update("budget", Math.max(0, Math.min(100000, Number(event.target.value))))} /><span>€</span></span></label></div>
      <div className={styles.deliverables}><span>{copy("deliverables")}</span><div>{(["reels", "stories"] as const).map(key => <label key={key}>{copy(key)}<span><button type="button" className={styles.icon} aria-label={`${copy("less")} ${copy(key)}`} disabled={campaign[key] <= 0} onClick={() => update(key, Math.max(0, campaign[key] - 1))}><Minus size={15} /></button><output>{campaign[key]}</output><button type="button" className={styles.icon} aria-label={`${copy("more")} ${copy(key)}`} disabled={campaign[key] >= 20} onClick={() => update(key, Math.min(20, campaign[key] + 1))}><Plus size={15} /></button></span></label>)}</div></div>
      <label>{copy("rights")}<div className={styles.rangeField}><input type="range" min="0" max="100" step="5" value={campaign.rights} onChange={event => update("rights", Number(event.target.value))} /><output>{campaign.rights}%</output></div></label>
    </div><div className={styles.offerSummary}><span>{copy("packageLabel")}</span><h4>{campaign.brand || copy("brandPlaceholder")}</h4><div className={styles.packageList}><p><span>{campaign.reels} × {copy("reels")}</span><Check size={16} /></p><p><span>{campaign.stories} × {copy("stories")}</span><Check size={16} /></p></div><div className={styles.moneyRow}><span>{copy("base")}</span><strong>{euros(campaign.budget)}</strong></div><div className={styles.moneyRow}><span>{copy("rightsAmount")}</span><strong>{euros(rights)}</strong></div><div className={styles.total}><span>{copy("total")}</span><strong key={total} className={styles.valueChange}>{euros(total)}</strong></div><p className={styles.mathNote}>{copy("calculationNote")}</p><button type="button" className={styles.solid} onClick={generate}><FileText size={17} />{copy("generate")}</button></div></div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.campaignStages}>{stages.map((stage, n) => <button type="button" key={n} aria-pressed={campaign.stage === n} onClick={() => update("stage", n)}>{campaign.stage >= n ? <CheckCheck size={17} /> : <span className={styles.stageDot} />}{stage}{n < 2 && <ChevronRight size={16} />}</button>)}</div>
    {offer && <div className={styles.offerDocument} role="region" aria-label={copy("offerTitle")}><div><span>{copy("offerLabel")}</span><button type="button" className={styles.icon} aria-label={ui("close")} onClick={() => setOffer(false)}><X size={18} /></button></div><h4>{copy("offerTitle")}</h4><p>{campaign.brand} · {campaign.deadline}</p><p>{campaign.reels} × {copy("reels")} + {campaign.stories} × {copy("stories")}</p><strong>{euros(total)}</strong><p>{copy("offerNote")}</p><button type="button" className={styles.textButton} onClick={download}>{copy("download")}<ArrowUpRight size={16} /></button></div>}
  </div>;
}

function MerchPlanner({ item, ui }: { item: ContentItem; ui: Copy }) {
  const copy = itemCopy(item);
  const initial = parseSeed<Drop>(copy("seed"), { price: 45, cost: 22, stock: 100, date: "2026-11-20", reserved: 0 });
  const [drop, setDrop, reset] = useSessionState<Drop>(`creator-tool-v1-merch-${item.id}`, initial);
  const [quantity, setQuantity] = useState(1), [feedback, setFeedback] = useState("");
  const remaining = Math.max(0, drop.stock - drop.reserved);
  const update = <K extends keyof Drop>(key: K, value: Drop[K]) => setDrop(previous => ({ ...previous, [key]: value }));
  const reserve = () => { if (quantity < 1 || quantity > remaining) { setFeedback(copy("stockError")); return; } update("reserved", drop.reserved + quantity); setFeedback(copy("reservedFeedback")); };
  return <div className={`${styles.tool} ${styles.merch}`} data-creator-tool="merch">
    <div className={styles.inlineControls} data-inline-controls=""><div className={styles.quickRow}>{item.image&&<img src={item.image.src} alt="" width="44" height="44"/>}<span><strong>{copy("productTitle")}</strong><span role="status">{feedback||`${copy("available")}: ${remaining} / ${drop.stock}`}</span></span></div><div className={styles.quickRow}><label>{copy("quantity")}<input type="number" min="1" max={Math.max(1,remaining)} value={quantity} onChange={event=>setQuantity(Math.max(1,Math.floor(Number(event.target.value))))}/></label><button type="button" className={styles.solid} disabled={remaining===0} onClick={reserve}><ShoppingBag size={17}/>{remaining===0?copy("soldOut"):copy("reserve")}</button></div></div>
    <ToolHeading title={copy("appTitle")} note={ui("session")} reset={ui("reset")} onReset={() => { reset(); setQuantity(1); setFeedback(""); }} />
    <div className={styles.merchLayout}><div className={styles.dropProduct}><div className={styles.productImage}>{item.image && <img src={item.image.src} alt={item.image.alt} width="600" height="600" loading="lazy" /> }<span>{copy("edition")}</span></div><div><span>{copy("productType")}</span><h4>{copy("productTitle")}</h4><p>{copy("productNote")}</p></div></div><div className={styles.dropControls}>
      <div className={styles.twoFields}><label>{copy("price")}<span className={styles.currencyField}><input type="number" min="1" max="500" value={drop.price} onChange={event => update("price", Math.max(1, Math.min(500, Number(event.target.value))))} /><span>€</span></span></label><label>{copy("unitCost")}<span className={styles.currencyField}><input type="number" min="0" max="500" value={drop.cost} onChange={event => update("cost", Math.max(0, Math.min(500, Number(event.target.value))))} /><span>€</span></span></label></div>
      <label>{copy("stock")}<div className={styles.rangeField}><input type="range" min="10" max="500" step="10" value={drop.stock} onChange={event => update("stock", Number(event.target.value))} /><output>{drop.stock}</output></div></label><label>{copy("date")}<input type="date" value={drop.date} onChange={event => update("date", event.target.value)} /></label>
      <div className={styles.stockStatus}><span>{copy("available")}</span><strong key={`${remaining}-${drop.stock}`} className={styles.valueChange}>{remaining} / {drop.stock}</strong></div><div className={styles.stockBar}><span style={{ transform: `scaleX(${Math.min(1, drop.reserved / drop.stock)})` }} /></div>
      <div className={styles.reserveRow}><label>{copy("quantity")}<input type="number" value={quantity} min="1" max={Math.max(1, remaining)} onChange={event => setQuantity(Math.max(1, Math.floor(Number(event.target.value))))} /></label><button type="button" className={styles.solid} disabled={remaining === 0} onClick={reserve}><ShoppingBag size={17} />{remaining === 0 ? copy("soldOut") : copy("reserve")}</button></div>
      {feedback && <p key={`${feedback}-${drop.reserved}`} className={styles.feedback} role="status">{feedback}</p>}{drop.reserved > 0 && <button type="button" className={styles.cartNote} onClick={() => { update("reserved", 0); setFeedback(copy("cartCleared")); }}><ShoppingBag size={15} />{drop.reserved} {copy("cartLabel")}<Trash2 size={14} /></button>}
    </div></div>
    <div className={styles.dropMath}><div><span>{copy("revenue")}</span><strong>{euros(drop.price * drop.stock)}</strong></div><div><span>{copy("cost")}</span><strong>{euros(drop.cost * drop.stock)}</strong></div><div><span>{copy("difference")}</span><strong>{euros((drop.price - drop.cost) * drop.stock)}</strong></div></div><p className={styles.mathNote}>{copy("mathNote")}</p>
  </div>;
}

export function CreatorTools({ section, editable, onChange }: CreatorSectionProps) {
  const c = section.content, ui = creatorCopy(section);
  const heading = useSectionHeadingLevel(section.id);
  const motionRoot = useRef<HTMLDivElement>(null);
  useEditorialMotion(motionRoot, Boolean(editable), section.id);
  useActionMotion(motionRoot, Boolean(editable));
  const items = c.items?.filter(item => creatorTool(item)) ?? [];
  const update = (key: string, value: unknown) => onChange?.({ ...section, content: { ...c, [key]: value } });
  return <div ref={motionRoot} className={styles.tools} data-motion={editable ? "off" : "tools"}>
    <header className={styles.intro} data-creator-reveal="section"><EditableText as={heading} value={c.heading} editable={editable} onChange={value => update("heading", value)} /><EditableText as="p" value={c.text} editable={editable} onChange={value => update("text", value)} /></header>
    {items.map(item => { const kind = creatorTool(item); const copy = kind === "publishing" ? postPlannerCopy(item) : itemCopy(item); const index = c.items?.findIndex(current => current.id === item.id) ?? -1; const edit = (key: keyof ContentItem, value: string) => { if (index >= 0) onChange?.(updateCreatorItem(section, index, { [key]: value })); }; return <article className={styles.toolStory} key={item.id} id={item.id} data-item-id={item.id}>
      <div className={styles.toolStoryCopy} data-creator-reveal="tool"><span className={styles.toolType}>{item.meta}</span><EditableText as="h3" value={item.title} editable={editable} onChange={value => edit("title", value)} /><EditableText as="p" value={item.text} editable={editable} onChange={value => edit("text", value)} />{kind === "publishing" && <PostPlannerInfo item={item} editable={editable} onChange={next => { if(index >= 0) onChange?.(updateCreatorItem(section,index,next)); }} />}<ContentLink href={item.href} editField="href" editItemId={item.id} editable={editable} className={styles.inquiry}><EditableText as="span" value={item.label} editable={editable} onChange={value => edit("label", value)} /><ArrowUpRight size={20} /></ContentLink></div>
      <div className={styles.toolArtifact} data-creator-reveal="artifact"><CreatorBrowserFrame className={kind === "publishing" ? postStyles.frame : undefined} editable={editable} title={copy("frameTitle")} caption={copy("frameCaption")} expandLabel={ui("expand")} collapseLabel={ui("collapse")}>{kind === "publishing" ? <PostPlannerDemo key={`${item.id}:${copy("seed")}`} item={item} editable={Boolean(editable)} /> : kind === "planner" ? <ContentPlanner item={item} ui={ui} disabled={Boolean(editable)} /> : kind === "campaign" ? <CampaignDesk item={item} ui={ui} /> : <MerchPlanner item={item} ui={ui} />}</CreatorBrowserFrame></div>
    </article>; })}
    <div className={styles.toolsClose}><EditableText as="h2" value={c.subheading} editable={editable} onChange={value => update("subheading", value)} /><EditableText as="p" value={c.caption} editable={editable} onChange={value => update("caption", value)} /><ContentLink href={c.primaryHref} editField="primaryHref" editable={editable} className={styles.inquiry}><EditableText as="span" value={c.primaryLabel} editable={editable} onChange={value => update("primaryLabel", value)} /><ArrowUpRight size={22} /></ContentLink></div>
  </div>;
}
