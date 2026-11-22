"use client";

import {useContext, useEffect, useState} from 'react';
import type {ContentItem} from '@/lib/types';
import {isolatedMediaUrl} from '@/lib/isolated-media';
import {SiteInteractionContext} from '@/components/site/editable';
import {Field, Input, Notice, Select} from './admin-ui';
import styles from './social-source-help.module.css';
import { useAdminLanguage } from "@/components/admin/admin-language";

const platforms = {youtube:'YouTube', instagram:'Instagram', tiktok:'TikTok', twitch:'Twitch', spotify:'Spotify', discord:'Discord'} as const;

export function SocialSectionHelp() {
  const { t } = useAdminLanguage();
  const {localMediaOnly} = useContext(SiteInteractionContext);
  return <div className={`cms-inspector-group ${styles.help}`}><h3>{t("Plattformbeispiele pflegen")}</h3><p className="cms-hint">{t("Diese Karten zeigen eigene Inhalte als gekennzeichnete Beispiele. Sie verbinden kein Konto und laden keinen Plattform-Feed.")}</p><details className="cms-details"><summary>{t("Welche Einbindung passt?")}</summary><p className="cms-hint">{t("Bilder wählen Sie aus der Mediathek. Die Plattform bestimmt den Aufbau der Beispielkarte.") + " "}{localMediaOnly ? t("Eigene Demo-Bilder bleiben in diesem Browser-Tab.") : t("Eigene Clips und Audio verwenden einen vorhandenen öffentlichen Dateipfad dieser Website.")}</p><p className="cms-hint">{t("Ein echtes YouTube- oder Vimeo-Video fügen Sie als „Video“-Abschnitt hinzu; es lädt erst nach Einwilligung. Automatische Feeds benötigen eine gesonderte offizielle Anbindung. Das private Social-Studio und der Post-Planer sind eigene CMS-Bereiche.")}</p></details></div>;
}

export function SocialItemFields({item, onChange}: {item:ContentItem; onChange:(item:ContentItem)=>void}) {
  const { t } = useAdminLanguage();
  const [source, setSource] = useState(item.mediaUrl ?? '');
  const [error, setError] = useState('');
  useEffect(() => { setSource(item.mediaUrl ?? ''); setError(''); }, [item.id, item.mediaUrl, item.platform]);
  const usesMedia = !['instagram', 'discord'].includes(item.platform ?? 'youtube') || Boolean(item.mediaUrl);
  function commit() {
    if (source && !isolatedMediaUrl(source, item.platform === 'spotify' ? 'audio' : 'video')) { setError('Verwenden Sie eine eigene Datei unter /assets/ oder /media/. Plattform-Links werden hier nicht abgespielt.'); return; }
    setError(''); onChange({...item, mediaUrl:source, placeholder:true});
  }
  return <><Field label={t("Plattform der Beispielkarte")} hint={t("Die Plattform bestimmt die Darstellung. Alle Karten bleiben als Platzhalter gekennzeichnet.")}><Select value={item.platform ?? 'youtube'} onChange={event => onChange({...item, platform:event.target.value as ContentItem['platform'], placeholder:true})}>{Object.entries(platforms).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>{usesMedia && <Field label={item.platform === 'spotify' ? t("Eigene Audiodatei") : t("Eigene Videodatei")} hint={item.platform === 'spotify' ? t("Öffentlicher Dateipfad dieser Website, zum Beispiel /assets/hoerprobe.mp3. Kein Spotify-Link.") : t("Eigener MP4- oder WebM-Dateipfad dieser Website, zum Beispiel /assets/clip.mp4. Kein Plattform-Link.")}><Input className={styles.sourceInput} value={source} onChange={event => {setSource(event.target.value); setError('');}} onBlur={commit}/></Field>}{error && <Notice tone="error">{error}</Notice>}</>;
}
