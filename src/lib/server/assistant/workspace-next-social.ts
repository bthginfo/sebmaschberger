import 'server-only';
import { z } from 'zod';
import type { SiteConfig } from '@/lib/types';
import type { WorkspaceArea, WorkspaceQuery } from '@/lib/assistant/workspace';
import { socialSuggestionSchema } from '@/lib/assistant/model';
import { socialProjectFromSuggestion } from '@/lib/social/assistant';
import { publishingModuleEnabled } from '@/lib/social/publishing/activation';
import { archiveSocialProject, loadSocialProject, loadSocialWorkspace, readSocialBrand, saveSocialProject } from '../social/store';
import { approvePlannerEntry, cancelPlannerEntry, completePlannerEntry, loadPlannerEntry, loadPlannerWorkspace } from '../social/publishing/service';
import { selectWorkspaceFacts, workspaceField as field, type WorkspaceAction } from './workspace-core';

const socialArea: WorkspaceArea = {
  id: 'social', label: 'Social-Studio', href: '/admin/social', description: 'Vorhandene Social-Entwürfe, Caption und Formate'
};
const plannerArea: WorkspaceArea = {
  id: 'publications', label: 'Post-Planer', href: '/admin/social/planner', description: 'Geplante Beiträge, Status, Termine und Kanäle'
};

export function nextSocialWorkspace(config: SiteConfig) {
  const enabled = config.modules?.socialStudio?.enabled === true;
  const planner = publishingModuleEnabled(config);
  const areas = [...(enabled ? [socialArea] : []), ...(planner ? [plannerArea] : [])];
  const target = z.object({ id: z.uuid() }).strict();
  const actions: WorkspaceAction[] = enabled ? [
    {
      info: { id: 'social.create', area: 'social', label: 'Social-Entwurf anlegen', effect: 'Speichert Bildtext und Caption im Social-Studio.' },
      schema: socialSuggestionSchema,
      prepare: async payload => {
        const input = socialSuggestionSchema.parse(payload);
        const { brand } = await readSocialBrand(config);
        return { payload: input, fields: [field('Marke', brand.name), field('Titel', input.headline), field('Bildtext', input.body), field('Caption', input.caption)] };
      },
      execute: async (payload, key) => {
        const input = socialSuggestionSchema.parse(payload);
        const { brand } = await readSocialBrand();
        const project = socialProjectFromSuggestion(brand, input);
        project.id = key;
        await saveSocialProject({ project, baseRevision: 0, idempotencyKey: key });
        return { message: 'Social-Entwurf im Studio gespeichert.', href: '/admin/social' };
      }
    },
    {
      info: { id: 'social.archive', area: 'social', label: 'Social-Entwurf archivieren', effect: 'Entfernt den Entwurf aus der aktiven Studioliste.' },
      schema: target,
      prepare: async payload => {
        const { id } = target.parse(payload);
        const snapshot = await loadSocialProject(id);
        return { payload: { id, baseRevision: snapshot.revision }, fields: [field('Entwurf', snapshot.project.title)] };
      },
      execute: async (payload, key) => {
        await archiveSocialProject({ ...(payload as { id: string; baseRevision: number }), idempotencyKey: key });
        return { message: 'Social-Entwurf archiviert.', href: '/admin/social' };
      }
    }
  ] : [];

  if (planner) {
    const operations = [
      { id: 'approve', label: 'Beitrag zur Veröffentlichung freigeben', effect: 'Gibt den gespeicherten Beitrag für seinen Kanal und Termin frei.', run: approvePlannerEntry },
      { id: 'cancel', label: 'Geplanten Beitrag anhalten', effect: 'Stoppt die ausstehende Veröffentlichung.', run: cancelPlannerEntry },
      { id: 'complete', label: 'Manuelle Veröffentlichung vermerken', effect: 'Markiert einen bereits veröffentlichten Beitrag als erledigt.', run: completePlannerEntry }
    ];
    for (const operation of operations) actions.push({
      info: { id: 'planner.' + operation.id, area: 'publications', label: operation.label, effect: operation.effect },
      schema: target,
      prepare: async payload => {
        const { id } = target.parse(payload);
        const { entry } = await loadPlannerEntry(id);
        const workspace = entry.accountId ? await loadPlannerWorkspace() : null;
        const account = workspace?.connections.find(account => account.id === entry.accountId);
        return {
          payload: { id, baseRevision: entry.revision },
          fields: [field('Beitrag', entry.source.title), field('Kanal', entry.platform || 'instagram'),
            field('Konto', account?.username || account?.label || entry.targetLabel), field('Termin', entry.scheduledAt),
            field('Zeitzone', entry.timeZone), field('Status', entry.status), field('Caption', entry.caption)]
        };
      },
      execute: async (payload, key) => {
        const result = await operation.run({ ...(payload as { id: string; baseRevision: number }), idempotencyKey: key }, 'CMS-Assistent');
        return { message: 'Post-Planer aktualisiert. Status: ' + result.status + '.', href: '/admin/social/planner' };
      }
    });
  }

  async function read(query: WorkspaceQuery) {
    if (query.area === 'publications') {
      const workspace = await loadPlannerWorkspace();
      return selectWorkspaceFacts(plannerArea, query, workspace.entries.map(entry => ({
        id: entry.id, label: entry.source.title, status: entry.status, date: entry.scheduledAt || entry.createdAt,
        fields: [field('Kanal', entry.platform || 'instagram'), field('Termin', entry.scheduledAt), field('Caption', entry.caption)]
      })));
    }
    const workspace = await loadSocialWorkspace();
    return selectWorkspaceFacts(socialArea, query, workspace.projects.map(project => ({
      id: project.id, label: project.title, date: project.updatedAt ?? undefined,
      fields: [field('Format', project.formatId), field('Folien', project.slides), field('Revision', project.revision)]
    })));
  }
  return { areas, actions, read };
}
