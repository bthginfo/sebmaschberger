"use client";

import {useContext} from 'react';
import type {CommerceProduct,ContentItem,Section} from '@/lib/types';
import {SiteInteractionContext} from '@/components/site/editable';
import {Field,Notice,Select,newId} from './admin-ui';
import { useAdminLanguage } from "@/components/admin/admin-language";

export function ShopProductField({value,products,onChange}:{value:string;products:CommerceProduct[];onChange:(id:string)=>void}){
  const { t } = useAdminLanguage();
 const found=products.some(product=>product.id===value);
 return <Field label={t("Produkt aus dem Sortiment")} hint={products.length?t("Inaktive Produkte bleiben als Entwurf wählbar. Öffentlich erscheinen nur aktive veröffentlichte Produkte."):t("Legen Sie zuerst unter „Shop → Produkte“ ein Produkt an.")}><Select value={value} onChange={event=>onChange(event.target.value)} aria-invalid={Boolean(value&&!found)}><option value="">{t("Produkt auswählen …")}</option>{value&&!found&&<option value={value}>{t("Bisheriges Produkt nicht mehr im Sortiment")}</option>}{products.map(product=><option value={product.id} key={product.id}>{product.title}{product.active?'':t(" · inaktiv")}</option>)}</Select></Field>;
}

export function ShopSectionFields({section,products,onChange}:{section:Section;products:CommerceProduct[];onChange:(section:Section)=>void}){
  const { t } = useAdminLanguage();
 const {localMediaOnly}=useContext(SiteInteractionContext);
 const mode=section.content.caption||'catalog';
 function chooseProduct(id:string){const items=[...(section.content.items??[])];const product=products.find(value=>value.id===id);const item:ContentItem={...(items[0]??{id:newId(),title:product?.title??'Produkt',text:''}),productId:id};items[0]=item;onChange({...section,content:{...section.content,items}});}
 return <><Field label={t("Shop-Darstellung")} hint={localMediaOnly?t("Alle Shop-Aktionen in diesem Beispiel bleiben lokal."):t("Die echte Bestellbestätigung erscheint automatisch nach der Zahlung unter /checkout/ergebnis.")}><Select value={mode} onChange={event=>onChange({...section,content:{...section.content,caption:event.target.value}})}><option value="catalog">{t("Produktübersicht")}</option><option value="product">{t("Einzelnes Produkt")}</option><option value="cart">{t("Warenkorb")}</option>{localMediaOnly?<option value="confirmation">{t("Lokale Demo-Bestellbestätigung")}</option>:mode==='confirmation'?<option value="confirmation" disabled>{t("Bisherige Demo-Bestätigung · bitte ändern")}</option>:null}</Select></Field>{!localMediaOnly&&mode==='confirmation'&&<Notice tone="error">{t("Diese Darstellung gehört zum fiktiven Beispiel. Wählen Sie für den eigenen Shop Produktübersicht, einzelnes Produkt oder Warenkorb.")}</Notice>}{mode==='product'&&<ShopProductField products={products} value={section.content.items?.[0]?.productId??''} onChange={chooseProduct}/>}<p className="cms-hint">{t("Produkte, Preise, Bilder und Verfügbarkeit bearbeiten Sie im Shop-Bereich. Dieser Abschnitt bestimmt ihre Darstellung auf der Seite.")}</p></>;
}
