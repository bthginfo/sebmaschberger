import { randomUUID } from 'node:crypto';
import { after } from 'next/server';
import { z } from 'zod';
import { AppError, rateLimit } from '@/lib/db';
import { handler, ipKey, json, readJson, sameOrigin } from '@/lib/http';
import { digest } from '@/lib/security';
import { CoachConflict, createCoachPlay, getClubCoachEntry, removeCoachPlay, saveClubCoachRecord } from '@/lib/coach/store';
import { coachPlaySchema } from '@/lib/coach/validation';
import { acceptClubInvite, apiClubActor, issueClubInvite, loginToClub, logoutFromClub, revokeClubInvite } from '@/lib/club/auth';
import { readAvatar, updateAvatar } from '@/lib/club/avatar';
import { accessDenied, clubCalendar, clubCoach, clubDirectory, clubWide, updateCalendar } from '@/lib/club/data';
import { readClubAppearanceImage, saveClubAppearance } from '@/lib/club/appearance';
import { calendarDownload, calendarEventDownload, fixtureExport } from '@/lib/club/exports';
import { clubFeatures } from '@/lib/club/enabled';
import { clubMessagePage, clubMessageRead, clubNotificationRecipients, newClubMessage, sendClubMessage, setClubMessageRead } from '@/lib/club/messages';
import type { WorkspacePushCategory } from '@/lib/workspace-push/model';
import { notifyWorkspaceAccounts } from '@/lib/workspace-push/store';
import { clubInviteLink, deliverClubInvite } from '@/lib/club/invite-mail';
import { archiveClubTeam, deleteCalendarEntry, respondToTraining, saveClubAssignment, saveClubMatch, saveClubNews, saveClubTeam, saveTraining, updateClubProfile } from '@/lib/club/management';
import { clubPlayAccess, managesClubPlay } from '@/lib/club/play-access';
import { publicClubFixtures, refreshClubFixtures } from '@/lib/club/public-fixtures';
import { assignmentFields, clubId, invitationInput, joinInput, loginInput, matchFields, newsFields, profileInput, revision, revisionInput, rsvpInput, teamFields, trainingFields } from '@/lib/club/validation';
import { clubSchedule, clubWorkspace } from '@/lib/club/workspace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Context = { params: Promise<{ action: string[] }> };

async function route(request: Request, context: Context) {
  const [resource, itemId, action, extra] = (await context.params).action;
  const feature = await clubFeatures();
  if (!feature.enabled || (resource === 'plays' || resource === 'assignments') && !feature.coachStudio) throw new AppError('Not found.', 404);
  const method = request.method;
  const query = new URL(request.url).searchParams;
  const mode = query.get('mode') === 'manage' ? 'manage' : 'member';
  if (extra || action && (resource !== 'trainings' || action !== 'rsvp')) return json({ error: 'Not found.' }, 404);
  if (method !== 'GET') sameOrigin(request);
  if (method === 'GET' && resource === 'fixtures' && !itemId) return json({ fixtures: await publicClubFixtures() });

  if (method === 'POST' && !itemId) {
    if (resource === 'login') {
      const data = loginInput.parse(await readJson(request, 4_000));
      await rateLimit(ipKey(request, 'club-login'), 18, 900);
      await rateLimit(digest('club-login:' + data.email), 9, 900);
      await loginToClub(data.email, data.password);
      return json({ ok: true });
    }
    if (resource === 'join') {
      await rateLimit(ipKey(request, 'club-join'), 15, 900);
      const data = joinInput.parse(await readJson(request, 4_000));
      await acceptClubInvite(data.token, data.password);
      return json({ ok: true });
    }
    if (resource === 'logout') {
      await logoutFromClub();
      return json({ ok: true });
    }
  }

  const memberOnly = resource === 'plays' || resource === 'calendar' || resource === 'workspace' && mode === 'member' || action === 'rsvp';
  const actor = await apiClubActor(request, memberOnly);
  const id = itemId === undefined ? undefined : clubId.parse(itemId);
  if (resource === 'messages') {
    const language = (query.get('lang') ?? request.headers.get('accept-language'))?.startsWith('de') ? 'de' : 'en';
    if (method === 'GET' && !id) return json(await clubMessagePage(actor, query.get('tab') === 'sent' ? 'sent' : 'inbox', query.get('before') ?? undefined, language));
    if (method === 'POST' && !id) {
      const input = newClubMessage.parse(await readJson(request, 27_000));
      await rateLimit(digest('club-messages:' + actor.id), 60, 3600);
      if (input.audience.kind !== 'person') await rateLimit(digest('club-announcements:' + actor.id), 10, 3600);
      const { message, recipientIds } = await sendClubMessage(actor, input, language);
      after(async () => {
        await Promise.all([
          notifyWorkspaceAccounts('member', recipientIds.filter(id => id !== 'cms-owner'), 'messages'),
          notifyWorkspaceAccounts('cms', recipientIds.filter(id => id === 'cms-owner'), 'messages'),
        ]);
      });
      return json({ message }, 201);
    }
    if (method === 'PATCH' && id) {
      const { read } = clubMessageRead.parse(await readJson(request, 2_000));
      await setClubMessageRead(actor, id, read);
      return json({ ok: true });
    }
    throw new AppError('Not found.', 404);
  }
  if (resource === 'workspace' && method === 'GET' && !id) return json({ workspace: await clubWorkspace(actor, mode, feature) });
  if (resource === 'appearance' && method === 'PUT' && !id) {
    if (actor.role !== 'admin') accessDenied();
    await rateLimit(ipKey(request, 'club-appearance'), 32, 3600);
    return json({ appearance: await saveClubAppearance(actor, request) });
  }
  if (resource === 'appearance-image' && method === 'GET' && id) return readClubAppearanceImage(id);
  if (resource === 'calendar' && method === 'GET' && !id) {
    const kind = query.get('kind');
    const event = query.get('event');
    if (kind === null && event === null) {
      return download(calendarDownload(await clubSchedule(actor)), 'text/calendar', 'club-calendar.ics');
    }
    const selected = clubId.safeParse(event);
    if (!selected.success || (kind !== 'training' && kind !== 'match')) {
      throw new AppError('Bitte einen Termin auswählen.', 400);
    }
    const body = calendarEventDownload(await clubSchedule(actor), kind, selected.data);
    if (!body) throw new AppError('Dieser Termin ist nicht verfügbar.', 404);
    return download(body, 'text/calendar', 'club-termin.ics');
  }
  if (resource === 'fixtures-export' && method === 'GET' && !id) {
    if (!clubWide(actor)) accessDenied();
    return download(fixtureExport(await clubSchedule(actor), query.get('lang') === 'de' ? 'de' : 'en'), 'text/csv', 'club-fixtures.csv');
  }

  if (resource === 'invites' && method === 'POST' && !id) {
    await rateLimit(ipKey(request, 'club-invite'), 40, 3600);
    const data = invitationInput.parse(await readJson(request, 12_000));
    const { invite, token } = await issueClubInvite(actor, data);
    const link = clubInviteLink(request, token);
    return json({ invite, link, delivery: await deliverClubInvite(invite.email, link, data.deliver, feature.brandName) }, 201);
  }
  if (resource === 'invites' && method === 'DELETE' && id) {
    await revokeClubInvite(actor, id);
    return json({ ok: true });
  }
  if (resource === 'people' && method === 'PATCH' && id) {
    await updateClubProfile(actor, id, profileInput.parse(await readJson(request, 10_000)));
    return json({ ok: true, id });
  }
  if (resource === 'avatar' && id) {
    if (method === 'GET') return readAvatar(actor, id);
    if (method === 'POST' || method === 'DELETE') {
      await rateLimit(ipKey(request, 'club-avatar'), 30, 3600);
      await updateAvatar(actor, id, method === 'POST' ? request : undefined);
      return json({ ok: true, id });
    }
  }
  if (resource === 'trainings' && id && action === 'rsvp' && method === 'POST') {
    const { response } = rsvpInput.parse(await readJson(request, 1_000));
    await respondToTraining(actor, id, response);
    return json({ ok: true });
  }
  if (action) throw new AppError('Not found.', 404);
  if (resource === 'plays') {
    if (method === 'POST' && !id) {
      if (!clubCoach(actor)) accessDenied();
      await rateLimit(ipKey(request, 'club-play-create'), 45, 3600);
      const { play } = z.strictObject({ play: coachPlaySchema }).parse(await readJson(request, 900_000));
      return json({ record: await createCoachPlay(play, actor.id) }, 201);
    }
    if (!id) throw new AppError('Not found.', 404);
    const [entry, calendar] = await Promise.all([getClubCoachEntry(id), clubCalendar()]);
    const access = entry && clubPlayAccess(actor, id, entry.ownerId, calendar.assignments);
    if (!entry || !access) throw new AppError('This play is unavailable.', 404);
    if (method === 'GET') return json({ record: entry.record });
    if (method === 'PUT') {
      if (access !== 'edit') accessDenied();
      await rateLimit(ipKey(request, 'club-play-edit'), 180, 3600);
      const data = z.strictObject({ play: coachPlaySchema, revision }).parse(await readJson(request, 900_000));
      const guard = managesClubPlay(actor, entry.ownerId) ? undefined : { collection: 'club', id: 'calendar', expected: calendar };
      try {
        return json({ record: await saveClubCoachRecord(id, data.play, data.revision, guard) });
      } catch (error) {
        if (error instanceof CoachConflict) return json({ error: 'conflict', record: error.record }, 409);
        throw error;
      }
    }
    if (method === 'DELETE') {
      if (!managesClubPlay(actor, entry.ownerId)) accessDenied();
      const { revision } = revisionInput.parse(await readJson(request, 1_000));
      try {
        await removeCoachPlay(id, revision);
      } catch (error) {
        if (error instanceof CoachConflict) return json({ error: 'conflict', record: error.record }, 409);
        throw error;
      }
      await updateCalendar(value => ({ ...value, assignments: value.assignments.filter(assignment => assignment.playId !== id) }));
      return json({ ok: true });
    }
  }

  if (!action && (method === 'POST' && !id || method === 'PUT' && id)) {
    const input = await readJson(request, 32_000);
    const slot = { id: id ?? randomUUID(), revision: id ? z.object({ revision }).parse(input).revision : undefined };
    const values = id ? Object.fromEntries(Object.entries(z.record(z.string(), z.unknown()).parse(input)).filter(([key]) => key !== 'revision')) : input;
    switch (resource) {
      case 'teams': await saveClubTeam(actor, slot, teamFields.parse(values)); break;
      case 'trainings': {
        const input = trainingFields.parse(values);
        await saveTraining(actor, slot, input);
        if (Date.parse(input.startsAt) >= Date.now()) notifyClub('schedule', actor.id, input.teamId);
        break;
      }
      case 'matches': {
        const input = matchFields.parse(values);
        await saveClubMatch(actor, slot, input);
        notifyClub('schedule', actor.id, input.teamId);
        break;
      }
      case 'news': {
        const input = newsFields.parse(values);
        await saveClubNews(actor, slot, input);
        if (input.published) notifyClub('news', actor.id, input.teamId);
        break;
      }
      case 'assignments': {
        const input = assignmentFields.parse(values);
        await saveClubAssignment(actor, slot, input);
        notifyClub('tactics', actor.id, input.targetType === 'team' ? input.targetId : null, input.targetType === 'person' ? input.targetId : undefined);
        break;
      }
      default: throw new AppError('Not found.', 404);
    }
    if (resource === 'teams' || resource === 'matches') refreshClubFixtures();
    return json({ ok: true, id: slot.id }, id ? 200 : 201);
  }

  if (method === 'DELETE' && id) {
    const { revision } = revisionInput.parse(await readJson(request, 1_000));
    const slot = { id, revision };
    if (resource === 'teams') await archiveClubTeam(actor, slot);
    else if (resource === 'trainings' || resource === 'matches' || resource === 'news' || resource === 'assignments') await deleteCalendarEntry(actor, resource, slot);
    else throw new AppError('Not found.', 404);
    if (resource === 'teams' || resource === 'matches') refreshClubFixtures();
    return json({ ok: true });
  }
  throw new AppError('Not found.', 404);
}

function notifyClub(kind: WorkspacePushCategory, sender: string, teamId?: string | null, personId?: string) {
  after(async () => {
    try {
      const directory = await clubDirectory();
      const ids = clubNotificationRecipients(directory, teamId).filter(id => id !== sender && (!personId || id === personId));
      await notifyWorkspaceAccounts('member', ids, kind);
    } catch {
      console.warn('[club] A notification could not be dispatched.');
    }
  });
}

function download(body: string, contentType: string, filename: string) {
  return new Response(body, { headers: {
    'Content-Type': contentType + '; charset=utf-8', 'Content-Disposition': 'attachment; filename="' + filename + '"',
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
  } });
}

export function GET(request: Request, context: Context) {
  return handler(req => route(req, context))(request);
}
export const POST = GET;
export const PATCH = GET;
export const PUT = GET;
export const DELETE = GET;
