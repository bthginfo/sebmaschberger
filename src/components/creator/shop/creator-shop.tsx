"use client";

import { useContext, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Download, Minus, Package, Plus, RotateCcw, ShieldCheck, ShoppingBag, Trash2, Truck } from "lucide-react";
import type { ContentItem, ImageValue, SectionContent } from "@/lib/types";
import type { CreatorSectionProps } from "@/lib/creator/types";
import { ContentLink, EditableImage, EditableText, SiteInteractionContext } from "@/components/site/editable";
import { useSectionHeadingLevel } from "@/components/site/heading-level";
import { creatorBase, creatorMoney, useCreatorCart } from "./cart-state";
import { useActionMotion, useEditorialMotion, useFlipMotion } from "../motion/creator-motion";
import styles from "./shop.module.css";

export function CreatorShop(props: CreatorSectionProps) {
  const { isolated } = useContext(SiteInteractionContext);
  if (!isolated && !props.editable) return <div className={styles.shop}><p>Dieses Shop-Beispiel ist nur im isolierten Demo-Modus verfügbar.</p></div>;
  const mode = props.section.content.caption;
  return mode === "product" ? <Product {...props} /> : mode === "cart" ? <Cart {...props} /> : mode === "confirmation" ? <Confirmation {...props} /> : <Catalog {...props} />;
}

function useCopy({ section, onChange }: CreatorSectionProps) {
  const c = section.content;
  return { c, heading: useSectionHeadingLevel(section.id), set: (key: keyof SectionContent, value: string) => onChange?.({ ...section, content: { ...c, [key]: value } }), item: (next: ContentItem) => onChange?.({ ...section, content: { ...c, items: c.items?.map(item => item.id === next.id ? next : item) } }) };
}

function Catalog(props: CreatorSectionProps) {
  const root = useRef<HTMLDivElement>(null);
  const { site, editable = false } = props;
  const { c, heading, set, item: changeItem } = useCopy(props);
  const products = site.modules?.commerce?.products.filter(p => p.active) ?? [];
  const base = creatorBase(site);
  useEditorialMotion(root, editable, props.section.id);
  return <div ref={root} className={styles.shop}><div className={styles.intro}><div><span className={styles.demoLabel}><ShoppingBag size={13} />Demo-Shop · kein echter Kauf</span><EditableText as={heading} value={c.heading} editable={editable} onChange={value => set("heading", value)} /></div><EditableText value={c.text} editable={editable} onChange={value => set("text", value)} /></div><div className={styles.catalog}>{products.map(product => {
    const entry = c.items?.find(item => item.productId === product.id);
    return <article key={product.id} data-item-id={entry?.id} data-creator-reveal="product" className={styles.productCard}><ContentLink href={entry?.href || `${base}/shop/${product.slug}`} editable={editable} className={styles.productImageLink}><EditableImage image={entry?.image || product.image} editable={editable} onChange={image => entry && changeItem({ ...entry, image })} className={styles.productImage} /><span className={styles.openProduct}><ArrowUpRight size={25} /></span></ContentLink><div className={styles.productMeta}><div><span className={styles.productKind}>{entry?.meta || (product.kind === "digital" ? "Digitaler Download" : "Creator-Merch")}</span><EditableText as="h3" value={entry?.title || product.title} editable={editable} onChange={title => entry && changeItem({ ...entry, title })} /></div><span className={styles.price}>{creatorMoney(product.priceCents)}</span></div><div className={styles.productBottom}><EditableText value={entry?.text || product.description} editable={editable} onChange={text => entry && changeItem({ ...entry, text })} /><ContentLink href={entry?.href || `${base}/shop/${product.slug}`} editable={editable}>{entry?.label || c.primaryLabel}<ArrowRight size={16} /></ContentLink></div></article>;
  })}</div>{products.length === 0 && <div className={styles.empty}><Package size={35} /><p>Für diesen Demo-Shop sind noch keine Produkte angelegt.</p></div>}<div className={styles.shopNote}><ShieldCheck size={25} /><EditableText value={c.subheading} editable={editable} onChange={value => set("subheading", value)} /></div></div>;
}

function Product(props: CreatorSectionProps) {
  const root = useRef<HTMLDivElement>(null);
  const galleryStage = useRef<HTMLDivElement>(null);
  const { site, editable = false } = props;
  const { c, heading, set, item: changeItem } = useCopy(props);
  const product = site.modules?.commerce?.products.find(product => product.id === c.items?.[0]?.productId);
  const entry = c.items?.[0];
  const [variant, setVariant] = useState(product?.variants?.[0] || "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const { add, ready } = useCreatorCart();
  const base = creatorBase(site);
  const gallery = c.images?.length ? c.images : [c.image || entry?.image || product?.image].filter(Boolean) as ImageValue[];
  const activeIndex = Math.min(imageIndex, Math.max(0, gallery.length - 1));
  const activeImage = gallery[activeIndex];
  const related = c.items?.filter(item => item.tags?.includes("related")) ?? [];
  useEditorialMotion(root, editable, props.section.id);
  useActionMotion(root, editable);
  useFlipMotion(galleryStage, activeIndex, editable);
  if (!product) return <div className={styles.shop}><div className={styles.empty}><Package size={35} /><h1>Dieses Produkt ist nicht verfügbar.</h1><ContentLink href={`${base}/shop`} editable={editable}>Zurück zum Demo-Shop<ArrowLeft size={17} /></ContentLink></div></div>;
  const available = product.active && product.stock !== 0;
  const max = Math.min(20, product.stock ?? 20);
  return <div ref={root} className={styles.productPage}><div className={styles.breadcrumb}><ContentLink href={`${base}/shop`} editable={editable}><ArrowLeft size={15} />Zurück zum Drop</ContentLink><span>Demo-Produkt</span></div><div className={styles.productDetail}><div className={styles.detailMedia}><div ref={galleryStage} className={styles.galleryStage}><div key={activeIndex} data-flip-key={String(activeIndex)}><EditableImage image={activeImage} editable={editable} priority onChange={image => props.onChange?.({ ...props.section, content: { ...c, image: activeIndex === 0 ? image : c.image, images: gallery.map((value, index) => index === activeIndex ? image : value) } })} /></div></div>{gallery.length > 1 && <div className={styles.galleryThumbs} role="group" aria-label="Produktbilder auswählen">{gallery.map((image, index) => <button type="button" key={`${index}-${image.src}`} aria-pressed={activeIndex === index} aria-label={`Produktbild ${index + 1}: ${image.alt}`} onClick={() => setImageIndex(index)}><img src={image.src} alt="" width={100} height={75} loading="lazy" /><span>{String(index + 1).padStart(2, "0")}</span></button>)}</div>}<div className={styles.imageNote}><span>{product.kind === "digital" ? "Sofort als Demo-Download" : "Fiktiver Creator-Merch"}</span><span>{site.name}</span></div></div><div className={styles.detailCopy}><span className={styles.demoLabel}>Demo-Shop · kein echter Kauf</span><EditableText as={heading} value={c.heading || product.title} editable={editable} onChange={value => set("heading", value)} /><div className={styles.detailPrice}>{creatorMoney(product.priceCents)}<span>Illustrativer Beispielpreis</span></div><EditableText value={c.text || product.description} editable={editable} onChange={value => set("text", value)} className={styles.detailDescription} />
    {Boolean(product.variants?.length) && <fieldset className={styles.variants}><legend>Größe auswählen <span>{variant}</span></legend><div>{product.variants?.map(size => <button type="button" key={size} aria-pressed={variant === size} onClick={() => { setVariant(size); setAdded(false); }}>{size}</button>)}</div></fieldset>}
    <div className={styles.buyRow}><div className={styles.stepper}><button type="button" aria-label="Menge verringern" disabled={quantity <= 1} onClick={() => { setQuantity(n => Math.max(1, n - 1)); setAdded(false); }}><Minus size={15} /></button><output aria-label="Menge">{quantity}</output><button type="button" aria-label="Menge erhöhen" disabled={quantity >= max} onClick={() => { setQuantity(n => Math.min(max, n + 1)); setAdded(false); }}><Plus size={15} /></button></div>{editable ? <div className={styles.buyButton}><EditableText as="span" value={c.primaryLabel} editable onChange={value => set("primaryLabel", value)} /><ShoppingBag size={18} /></div> : <button className={styles.buyButton} type="button" disabled={!available || !ready} onClick={() => { add({ productId: product.id, variant: variant || undefined, quantity }); setAdded(true); }}>{added ? "Im Demo-Warenkorb" : available ? c.primaryLabel : "Im Demo-Shop vergriffen"}{added ? <Check size={19} /> : <ShoppingBag size={18} />}</button>}</div>
    {added && <div className={styles.added} role="status"><span><Check size={14} />{quantity} × {product.title}{variant ? ` · ${variant}` : ""}</span><ContentLink href={`${base}/warenkorb`}>{c.secondaryLabel || "Zum Warenkorb"}<ArrowRight size={15} /></ContentLink></div>}
    <div className={styles.productAssurances}><span><ShieldCheck size={17} />Kein Geld. Keine persönlichen Daten.</span><span>{product.kind === "digital" ? <Download size={17} /> : <Truck size={17} />}{product.kind === "digital" ? "Illustrative Dateien zum Ausprobieren" : "Versand wird im Warenkorb simuliert"}</span></div>
    {entry && <details className={styles.productDetails} open={editable || undefined}><summary>{c.subheading || "Was drinsteckt"}<Plus size={17} /></summary><div>{entry.details?.map((detail, i) => <p key={i}>{detail}</p>)}</div></details>}
    <EditableText as="p" value={entry?.text} editable={editable} onChange={text => entry && changeItem({ ...entry, text })} className={styles.smallPrint} />
  </div></div>{related.length > 0 && <div className={styles.related}><EditableText as="h2" value={c.quote} editable={editable} onChange={value => set("quote", value)} /><div>{related.map(item => { const match = site.modules?.commerce?.products.find(value => value.id === item.productId); return <article key={item.id} data-item-id={item.id} data-creator-reveal="product"><ContentLink href={item.href} editField="href" editItemId={item.id} editable={editable}><EditableImage image={item.image || match?.image} editable={editable} onChange={image => changeItem({ ...item, image })} /><span><EditableText as="span" value={item.title} editable={editable} onChange={title => changeItem({ ...item, title })} /><b>{creatorMoney(match?.priceCents || 0)}</b><ArrowUpRight size={22} /></span></ContentLink></article>; })}</div></div>}</div>;
}

function Cart(props: CreatorSectionProps) {
  const { site, editable = false } = props;
  const { c, heading, set } = useCopy(props);
  const { state, ready, quantity, coupon, shipping, order, reset } = useCreatorCart();
  const [code, setCode] = useState(state.coupon);
  const [couponMessage, setCouponMessage] = useState("");
  const [placing, setPlacing] = useState(false);
  const details = c.items?.find(item => item.tags?.includes("shop-settings"))?.details ?? [];
  const setting = (key: string, fallback: string) => details.find(detail => detail.startsWith(`${key}|`))?.slice(key.length + 1) || fallback;
  const demoCode = setting("coupon", "DEMO10").toUpperCase();
  const discountPercent = Math.min(100, Math.max(0, Number(setting("discount", "10")) || 0));
  const catalog = site.modules?.commerce?.products ?? [];
  const lines = state.lines.map(line => ({ ...line, product: catalog.find(p => p.id === line.productId && p.active) })).filter(line => line.product);
  const subtotal = lines.reduce((sum, line) => sum + line.product!.priceCents * line.quantity, 0);
  const discount = state.coupon === demoCode ? Math.round(subtotal * discountPercent / 100) : 0;
  const physical = lines.some(line => line.product!.kind === "physical");
  const shippingCents = !physical || state.shipping === "pickup" || subtotal >= (site.modules?.commerce?.freeShippingAboveCents ?? Infinity) ? 0 : site.modules?.commerce?.shippingCents ?? 490;
  const total = Math.max(0, subtotal - discount + shippingCents);
  const base = creatorBase(site);
  const place = () => {
    if (!lines.length || placing || editable) return;
    setPlacing(true);
    const snapshot = { id: `CREATOR-DEMO-${Date.now().toString(36).toUpperCase()}`, lines: state.lines, createdAt: new Date().toISOString(), totalCents: total, coupon: state.coupon, shipping: state.shipping };
    // Persist synchronously before the ordinary document navigation.
    try { sessionStorage.setItem(`creator-demo-cart:${base}:v1`, JSON.stringify({ ...state, lines: [], order: snapshot })); } catch { /* In-memory fallback below. */ }
    order(total);
    window.location.assign(`${base}/bestellung`);
  };
  return <div className={styles.shop}><div className={styles.cartIntro}><span className={styles.demoLabel}>Demo-Shop · kein echter Kauf</span><EditableText as={heading} value={c.heading} editable={editable} onChange={value => set("heading", value)} /><EditableText value={c.text} editable={editable} onChange={value => set("text", value)} /></div>{!ready ? <div className={styles.empty} role="status"><ShoppingBag size={35} /><p>Dein Demo-Warenkorb wird geladen …</p></div> : lines.length === 0 ? <div className={styles.empty}><ShoppingBag size={40} /><h2>Hier ist noch Platz für deinen Drop.</h2><p>Wähle etwas aus dem fiktiven Shop. Ausprobieren kostet nichts.</p><ContentLink href={`${base}/shop`} editable={editable} className={styles.primaryLink}>Zum Demo-Shop<ArrowRight size={18} /></ContentLink></div> : <div className={styles.cartLayout}><div className={styles.cartItems}><div className={styles.listHeader}><span>Produkt</span><span>Menge & Preis</span></div>{lines.map(line => <article key={`${line.productId}-${line.variant}`} className={styles.cartLine}><ContentLink href={`${base}/shop/${line.product!.slug}`} editable={editable} className={styles.cartImage}><EditableImage image={line.product!.image} /></ContentLink><div className={styles.cartLineCopy}><ContentLink href={`${base}/shop/${line.product!.slug}`} editable={editable}>{line.product!.title}</ContentLink><span>{line.variant ? `Größe ${line.variant}` : line.product!.kind === "digital" ? "Digitaler Demo-Download" : "Einheitsgröße"}</span><span>{creatorMoney(line.product!.priceCents)} / Stück</span><button type="button" onClick={() => quantity(line.productId, line.variant, 0)}><Trash2 size={12} />Entfernen</button></div><div className={styles.lineTotal}><div className={styles.stepper}><button type="button" aria-label={`${line.product!.title}: Menge verringern`} onClick={() => quantity(line.productId, line.variant, line.quantity - 1)}><Minus size={13} /></button><output>{line.quantity}</output><button type="button" aria-label={`${line.product!.title}: Menge erhöhen`} disabled={line.quantity >= Math.min(20, line.product!.stock ?? 20)} onClick={() => quantity(line.productId, line.variant, line.quantity + 1)}><Plus size={13} /></button></div><strong>{creatorMoney(line.product!.priceCents * line.quantity)}</strong></div></article>)}<div className={styles.cartContinue}><ContentLink href={`${base}/shop`} editable={editable}><ArrowLeft size={15} />Weiter stöbern</ContentLink><button type="button" onClick={reset}><RotateCcw size={13} />Demo-Warenkorb leeren</button></div></div><aside className={styles.summary}><h2>Dein Demo-Drop</h2><form className={styles.coupon} onSubmit={event => { event.preventDefault(); const normalized = code.trim().toUpperCase(); coupon(normalized === demoCode ? normalized : ""); setCouponMessage(normalized === demoCode ? `${demoCode} ist aktiv: ${discountPercent} % Demo-Rabatt.` : `Dieser Demo-Code ist nicht gültig. Probiere ${demoCode}.`); }}><label htmlFor="mika-coupon">Gutscheincode</label><div><input id="mika-coupon" value={code} onChange={event => setCode(event.target.value)} placeholder={demoCode} autoComplete="off" maxLength={24} /><button type="submit">Einlösen</button></div><p role="status">{couponMessage || (state.coupon ? `${demoCode} ist aktiv: ${discountPercent} % Demo-Rabatt.` : `Teste ${demoCode} für ${discountPercent} % Beispielrabatt.`)}</p></form>{physical && <div className={styles.shipping}><label htmlFor="mika-shipping">Lieferoption simulieren</label><select id="mika-shipping" value={state.shipping} onChange={event => shipping(event.target.value)}><option value="standard">Standardversand · {creatorMoney(site.modules?.commerce?.shippingCents ?? 490)}</option><option value="pickup">Demo-Abholung · kostenlos</option></select></div>}<dl className={styles.totals}><div><dt>Zwischensumme</dt><dd>{creatorMoney(subtotal)}</dd></div>{discount > 0 && <div className={styles.discount}><dt>Demo-Rabatt · {demoCode}</dt><dd>−{creatorMoney(discount)}</dd></div>}<div><dt>{physical ? "Versand" : "Digitaler Download"}</dt><dd>{shippingCents ? creatorMoney(shippingCents) : "Kostenlos"}</dd></div><div className={styles.total}><dt>Beispielsumme</dt><dd>{creatorMoney(total)}</dd></div><div className={styles.realTotal}><dt>Jetzt zu zahlen</dt><dd>0,00 €</dd></div></dl><p className={styles.checkoutNote}><ShieldCheck size={17} /><span>Du testest einen fiktiven Einkauf. Es wird nichts abgebucht oder verschickt. Du brauchst keine Adresse oder Zahlungsdaten.</span></p><button type="button" className={styles.checkout} disabled={placing || editable} onClick={place}>{placing ? "Demo-Bestellung wird erstellt …" : c.primaryLabel}<ArrowRight size={19} /></button><EditableText as="p" value={c.subheading} editable={editable} onChange={value => set("subheading", value)} className={styles.smallPrint} /></aside></div>}</div>;
}

function Confirmation(props: CreatorSectionProps) {
  const { site, editable = false } = props;
  const { c, heading, set } = useCopy(props);
  const { state, ready } = useCreatorCart();
  const catalog = site.modules?.commerce?.products ?? [];
  const base = creatorBase(site);
  const digital = state.order?.lines.some(line => catalog.some(p => p.id === line.productId && p.kind === "digital"));
  return <div className={styles.confirmation}><div className={styles.confirmIcon}><Check size={45} strokeWidth={1.5} /></div><span className={styles.demoLabel}>Demo abgeschlossen · 0,00 € bezahlt</span><EditableText as={heading} value={state.order || editable ? c.heading : "Deine Demo-Bestellung wartet noch."} editable={editable} onChange={value => set("heading", value)} /><EditableText value={c.text} editable={editable} onChange={value => set("text", value)} />{ready && state.order ? <div className={styles.receipt}><div className={styles.receiptHead}><span>Demo-Bestellnummer</span><strong>{state.order.id}</strong></div>{state.order.lines.map((line, i) => { const product = catalog.find(p => p.id === line.productId); return <div className={styles.receiptLine} key={i}><span>{line.quantity} × {product?.title || line.productId}{line.variant ? ` · ${line.variant}` : ""}</span><span>{creatorMoney((product?.priceCents || 0) * line.quantity)}</span></div>; })}<div className={styles.receiptTotal}><span>Tatsächlich bezahlt</span><strong>0,00 €</strong></div><p><ShieldCheck size={14} />Keine echte Bestellung. Kein Versand. Keine Datenübermittlung.</p></div> : <div className={styles.noOrder}><p>{ready ? "Lege ein Produkt in den Warenkorb und schließe den kostenlosen Demo-Einkauf ab." : "Dein Demo-Status wird geladen …"}</p></div>}{digital && <ContentLink href={c.primaryHref} editField="primaryHref" editable={editable} download className={styles.primaryLink}>{c.primaryLabel}<Download size={19} /></ContentLink>}<ContentLink href={`${base}/shop`} editable={editable} className={styles.confirmContinue}>{c.secondaryLabel || "Zurück zum Demo-Shop"}<ArrowRight size={17} /></ContentLink><EditableText as="p" value={c.subheading} editable={editable} onChange={value => set("subheading", value)} className={styles.smallPrint} /></div>;
}
