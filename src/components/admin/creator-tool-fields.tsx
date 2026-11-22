"use client";

import type { ContentItem, CreatorTool } from '@/lib/types';
import { CREATOR_TOOLS } from '@/lib/types';
import { createPostPlannerItem, creatorTool, creatorToolLabels, parseDemoPosts, postPlannerCopy, toolDetail } from '@/lib/creator/tools';
import { Field, Input, Select, Textarea } from './admin-ui';
import { useAdminLanguage } from "@/components/admin/admin-language";

const publicLabels = [
  ['appTitle', 'Titel des Post-Planers'], ['local', 'Hinweis zur lokalen Demo'],
  ['approve', 'Schaltfläche: Freigabe'], ['simulate', 'Schaltfläche: Versand simulieren'],
  ['requirementsTitle', 'Titel der API-Erklärung'], ['requirements', 'Erklärung zu Konten, Freigabe und APIs'],
] as const;

export function CreatorToolFields({ item, templates = [], onChange }: { item: ContentItem; templates?: ContentItem[]; onChange: (item: ContentItem) => void }) {
  const { t } = useAdminLanguage();
  const kind = creatorTool(item), copy = postPlannerCopy(item), posts = parseDemoPosts(copy('seed'));
  const change = (key: string, value: string) => onChange(toolDetail(item, key, value));
  const choose = (tool: CreatorTool) => {
    const seed = tool === kind ? item : tool === 'publishing' ? createPostPlannerItem(item.id) : templates.find(candidate => creatorTool(candidate) === tool);
    if (!seed) return;
    onChange({ ...item, title: item.title || seed.title, text: item.text || seed.text, label: item.label || seed.label, href: item.href || seed.href, creatorTool: tool, tags: [...(item.tags ?? []).filter(tag => !(CREATOR_TOOLS as readonly string[]).includes(tag)), tool], details: seed.details });
  };
  return <div className="cms-inspector-group">
    <Field label={t("Werkzeug dieses Eintrags")} hint={t("Der Post-Planer bringt eigene Beispieldaten mit. Andere Werkzeuge können einen vorhandenen Eintrag dieses Abschnitts als Vorlage verwenden.")}><Select value={kind ?? ''} onChange={event => choose(event.target.value as CreatorTool)}><option value="" disabled>{t("Werkzeug auswählen")}</option>{CREATOR_TOOLS.map(tool => <option key={tool} value={tool} disabled={tool !== kind && tool !== 'publishing' && !templates.some(candidate => creatorTool(candidate) === tool)}>{creatorToolLabels[tool]}</option>)}</Select></Field>
    {kind === 'publishing' ? <>
      <p className="cms-hint">{t("Öffentliche, lokale Demo. Hier werden keine Social-Konten verbunden und keine echten Beiträge versendet. Die API-Erklärung ist normaler Seiteninhalt.")}</p>
      <details className="cms-details"><summary>{t("Post-Planer und API-Erklärung")}</summary>{publicLabels.map(([key, label]) => <Field key={key} label={label}>{key === 'requirements' ? <Textarea rows={8} value={copy(key)} onChange={event => change(key, event.target.value)} /> : <Input value={copy(key)} onChange={event => change(key, event.target.value)} />}</Field>)}</details>
      <details className="cms-details"><summary>{t("Beispielbeiträge und Beispielwoche")}</summary>
        <Field label={t("Montag der Beispielwoche")}><Input type="date" value={copy('weekStart')} onChange={event => change('weekStart', event.target.value)} /></Field>
        {posts ? posts.map((post, index) => <details key={post.id} className="cms-details"><summary>{post.title || t("Beispiel {0}", { 0: index + 1 })}</summary>
          <Field label={t("Titel in der Agenda")}><Input value={post.title} maxLength={180} onChange={event => change('seed', JSON.stringify(posts.map((value, n) => n === index ? { ...value, title: event.target.value } : value)))} /></Field>
          <Field label={t("Text im Beitragsmotiv")}><Textarea rows={3} value={post.artwork} maxLength={180} onChange={event => change('seed', JSON.stringify(posts.map((value, n) => n === index ? { ...value, artwork: event.target.value } : value)))} /></Field>
          <Field label={t("Beispiel-Caption")}><Textarea rows={4} value={post.caption} maxLength={2200} onChange={event => change('seed', JSON.stringify(posts.map((value, n) => n === index ? { ...value, caption: event.target.value } : value)))} /></Field>
        </details>) : <p className="cms-hint">{t("Die Beispielbeiträge sind ungültig. Prüfen Sie den Eintrag „seed“ in den weiteren Angaben oder wählen Sie das Werkzeug neu aus.")}</p>}
      </details>
    </> : null}
  </div>;
}
