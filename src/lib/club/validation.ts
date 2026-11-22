import { z } from 'zod';
import { CLUB_ROLES } from './model';

export const clubId = z.uuid();
export const revision = z.number().int().positive();
const title = z.string().trim().min(1).max(120);
const shortText = z.string().trim().max(240);
const details = z.string().trim().max(6_000);
const jersey = z.number().int().min(0).max(99).nullable();
const date = z.iso.datetime({ offset: true }).transform(value => new Date(value).toISOString());
export const clubEmail = z.string().trim().toLowerCase().max(254).pipe(z.email());
const teamIds = z.array(clubId).max(20).transform(ids => [...new Set(ids)]);
const password = z.string().min(12).max(200);

export const loginInput = z.strictObject({ email: clubEmail, password: z.string().min(1).max(200) });
export const joinInput = z.strictObject({ token: z.string().max(120), password });
export const invitationInput = z.strictObject({ email: clubEmail, name: title, role: z.enum(CLUB_ROLES), teamIds, deliver: z.boolean().default(false) });
export const profileInput = z.strictObject({
  revision,
  name: title.optional(),
  position: shortText.optional(),
  jersey: jersey.optional(),
  bio: z.string().trim().max(800).optional(),
  teamIds: teamIds.optional(),
  role: z.enum(CLUB_ROLES).optional(),
  status: z.enum(['active', 'disabled', 'invited']).optional(),
});
export const teamFields = z.strictObject({
  name: title,
  shortName: z.string().trim().max(35),
  description: details,
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  category: z.string().trim().max(100).optional(),
  competition: z.string().trim().max(140).optional(),
  season: z.string().trim().max(80).optional(),
  homeVenue: shortText.optional(),
  managerIds: teamIds.optional(),
});
export const trainingFields = z.strictObject({
  teamId: clubId, title, startsAt: date, endsAt: date,
  location: shortText, details, equipment: shortText,
});
export const matchFields = z.strictObject({
  teamId: clubId, opponent: title, startsAt: date, venue: shortText, home: z.boolean(),
  status: z.enum(['scheduled', 'final', 'cancelled']),
  ourScore: z.number().int().min(0).max(999).nullable(),
  theirScore: z.number().int().min(0).max(999).nullable(),
  public: z.boolean(), notes: details,
});
export const newsFields = z.strictObject({
  teamId: clubId.nullable(), title, body: details.min(1),
  titleEn: z.string().trim().max(120).default(''), bodyEn: details.default(''),
  pinned: z.boolean(), published: z.boolean(),
});
export const assignmentFields = z.strictObject({
  playId: clubId, targetType: z.enum(['team', 'person']), targetId: clubId,
  access: z.enum(['view', 'edit']), instructions: z.string().trim().max(800),
});
export const rsvpInput = z.strictObject({ response: z.enum(['yes', 'no', 'maybe']).nullable() });
export const revisionInput = z.strictObject({ revision });
