"use client";

import type {SiteConfig} from '@/lib/types';
import {Button,Field,Notice,Select,Toggle} from './admin-ui';
import { useAdminLanguage } from "@/components/admin/admin-language";

export function CommerceModuleSettings({config,onChange,onOpen}:{config:SiteConfig;onChange:(value:SiteConfig)=>void;onOpen?:()=>void}){
  const { t } = useAdminLanguage();
 if(!config.modules?.creator?.enabled&&!config.modules?.commerce)return <section className="cms-form-section"><h3>Shop</h3><p>{t("Produkte, Downloads oder Leistungen auf Ihrer Website anbieten. Die Gestaltung Ihrer Website bleibt erhalten.")}</p><Button onClick={()=>onChange({...config,modules:{...config.modules,commerce:{enabled:false,currency:'EUR',shippingCents:0,products:[]}}})}>{t("Shop vorbereiten")}</Button></section>;
 const commerce=config.modules?.commerce??{enabled:false,currency:'EUR' as const,shippingCents:0,products:[]};
 return <section className="cms-form-section"><h3>Shop</h3><p>{t("Ein eigenes Sortiment mit Stripe Checkout und optional PayPal über Stripe. Produkte und Bestellungen verwalten Sie im Shop-Bereich.")}</p>{!onOpen&&<Toggle label={t("Neue Verkäufe auf der Website aktivieren")} checked={commerce.enabled} onChange={enabled=>onChange({...config,modules:{...config.modules,commerce:{...commerce,enabled}}})} hint={t("Speichern Sie den Entwurf und veröffentlichen Sie die Website. Die eigene Zahlungsanbindung muss zusätzlich serverseitig eingerichtet und geprüft sein.")}/>}<Field label={t("Zielgruppe für den Verkauf")} hint={t("Für Verbrauchershops erscheint „Vertrag widerrufen“ im Fußbereich. Testen Sie die Eingangsbestätigung vor dem Start.")}><Select value={commerce.consumerSales===undefined?'':commerce.consumerSales?'consumer':'business'} onChange={event=>onChange({...config,modules:{...config.modules,commerce:{...commerce,consumerSales:event.target.value===''?undefined:event.target.value==='consumer'}}})}><option value="">{t("Bitte wählen")}</option><option value="consumer">{t("Verbraucher (B2C)")}</option><option value="business">{t("Geschäftskunden (B2B)")}</option></Select></Field><Notice>{t("Das Ausschalten entfernt keine Produkte oder Bestellungen. Im Shop bleiben Einrichtung und bisherige Bestellungen erreichbar.")}</Notice>{onOpen&&<Button onClick={onOpen}>{t("Shop einrichten und verwalten")}</Button>}</section>;
}
