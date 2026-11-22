"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { SiteConfig } from "@/lib/types";
import { SiteInteractionContext } from "@/components/site/editable";

export interface DemoCartLine { productId: string; variant?: string; quantity: number }
export interface DemoOrder { id: string; lines: DemoCartLine[]; createdAt: string; totalCents: number; coupon: string; shipping: string }
type CartState = { lines: DemoCartLine[]; coupon: string; shipping: string; order: DemoOrder | null };
const EMPTY: CartState = { lines: [], coupon: "", shipping: "standard", order: null };
const CartContext = createContext<{
  state: CartState; ready: boolean; storageKey:string; add: (line: DemoCartLine) => void; quantity: (productId: string, variant: string | undefined, quantity: number) => void;
  coupon: (code: string) => void; shipping: (value: string) => void; reset: () => void; order: (totalCents: number) => void;
}>({ state: EMPTY, ready: false, storageKey:'', add: () => {}, quantity: () => {}, coupon: () => {}, shipping: () => {}, reset: () => {}, order: () => {} });

export function CreatorCartProvider({ site, children }: { site: SiteConfig; children: ReactNode }) {
  const [state, setState] = useState<CartState>(EMPTY);
  const [ready, setReady] = useState(false);
  const stateRef = useRef<CartState>(EMPTY);
  const readyRef = useRef(false);
  const { isolated } = useContext(SiteInteractionContext);
  const base = creatorBase(site, isolated);
  const key = `${isolated ? "creator-demo-cart" : "creator-cart"}:${base || site.name}:v1`;
  const catalog = site.modules?.commerce?.products ?? [];
  useEffect(() => {
    readyRef.current = false;
    let restored = EMPTY;
    try {
      const raw = JSON.parse(sessionStorage.getItem(key) || "null") as CartState | null;
      if (raw && Array.isArray(raw.lines)) restored = {
        lines: raw.lines.filter(line => catalog.some(p => p.active && p.id === line.productId)).map(line => ({ productId: String(line.productId), variant: typeof line.variant === "string" ? line.variant : undefined, quantity: Math.max(1, Math.min(20, Math.floor(Number(line.quantity) || 1))) })),
        coupon: typeof raw.coupon === "string" ? raw.coupon : "", shipping: raw.shipping === "pickup" ? "pickup" : "standard", order: raw.order && typeof raw.order.id === "string" && Array.isArray(raw.order.lines) && raw.order.lines.every(line => line && typeof line.productId === "string" && Number.isInteger(line.quantity) && line.quantity > 0 && (line.variant === undefined || typeof line.variant === "string")) ? raw.order : null,
      };
    } catch { /* A blocked storage still permits a temporary in-memory cart. */ }
    stateRef.current = restored;
    setState(restored);
    readyRef.current = true;
    setReady(true);
  }, [key]); // Catalog is a published snapshot for the lifetime of this provider.
  const change = (update: (current: CartState) => CartState) => {
    if (!readyRef.current) return;
    const next = update(stateRef.current);
    stateRef.current = next;
    try { sessionStorage.setItem(key, JSON.stringify(next)); } catch { /* in-memory fallback */ }
    setState(next);
  };
  const maxFor = (id: string) => Math.max(1, Math.min(20, catalog.find(p => p.id === id)?.stock ?? 20));
  const quantity = (productId: string, variant: string | undefined, count: number) => {if(!Number.isFinite(count))return;change(s => ({ ...s, lines: count <= 0 ? s.lines.filter(line => line.productId !== productId || line.variant !== variant) : s.lines.map(line => line.productId === productId && line.variant === variant ? { ...line, quantity: Math.min(maxFor(productId), Math.max(1, Math.floor(count))) } : line) }));};
  const add = (line: DemoCartLine) => change(s => {
    if (!catalog.some(p => p.id === line.productId && p.active && (p.stock === undefined || p.stock > 0))) return s;
    const found = s.lines.find(l => l.productId === line.productId && l.variant === line.variant);
    return { ...s, lines: found ? s.lines.map(l => l === found ? { ...l, quantity: Math.min(maxFor(l.productId), l.quantity + line.quantity) } : l) : [...s.lines, { ...line, quantity: Math.min(maxFor(line.productId), Math.max(1, line.quantity)) }] };
  });
  return <CartContext.Provider value={{ state, ready, storageKey:key, add, quantity, coupon: code => change(s => ({ ...s, coupon: code })), shipping: value => change(s => ({ ...s, shipping: value })), reset: () => change(() => EMPTY), order: totalCents => { if (isolated) change(s => ({ ...s, lines: [], order: { id: `CREATOR-DEMO-${Date.now().toString(36).toUpperCase()}`, lines: s.lines.map(l => ({ ...l })), createdAt: new Date().toISOString(), totalCents, coupon: s.coupon, shipping: s.shipping } })); } }}>{children}</CartContext.Provider>;
}

export const useCreatorCart = () => useContext(CartContext);
export const creatorMoney = (cents: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
export const creatorBase = (site: SiteConfig, isolated = true) => isolated ? (site.modules?.creator?.demoBasePath || "/demo/creator").replace(/\/$/, "") : "";
