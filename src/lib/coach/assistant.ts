import { z } from 'zod';
import {
  COACH_BALL_FLIGHTS, COACH_CATEGORIES, COACH_KINDS, COACH_PITCHES, COACH_TONES, COACH_TRANSITIONS,
  PITCH_HEIGHT, PITCH_WIDTH, type CoachFrame, type CoachPiece, type CoachPlay,
} from './model';
import { coachPlaySchema } from './validation';

const id = z.string().regex(/^[\w-]{1,64}$/u);
const x = z.number().min(0).max(PITCH_WIDTH);
const y = z.number().min(0).max(PITCH_HEIGHT);
const title = z.string().trim().min(1).max(100);
const phaseName = z.string().trim().min(1).max(70);
const text = z.string().max(600);
const seconds = z.number().min(.25).max(20);
const hold = z.number().min(0).max(20);
const transition = z.enum(COACH_TRANSITIONS);
const flight = z.enum(COACH_BALL_FLIGHTS);
const label = z.string().max(48);
const tone = z.enum(COACH_TONES);
const angle = z.number().min(-180).max(180);

// Use anyOf, with required and nullable fields, for both configured providers.
export const coachAssistantAnswerSchema = z.strictObject({
  reply: z.string().min(1).max(1500),
  changes: z.array(z.union([
    z.strictObject({ type: z.literal('details'), title: title.nullable(), description: text.nullable(),
      category: z.enum(COACH_CATEGORIES).nullable(), pitch: z.enum(COACH_PITCHES).nullable() }),
    z.strictObject({ type: z.literal('plan'), field: z.enum(['objective', 'players', 'area', 'equipment', 'progression']), value: text }),
    z.strictObject({ type: z.literal('minutes'), value: z.number().int().min(1).max(240) }),
    z.strictObject({ type: z.literal('phase'), phaseId: id, title: phaseName.nullable(), notes: text.nullable(),
      seconds: seconds.nullable(), hold: hold.nullable(), transition: transition.nullable(), ballFlight: flight.nullable() }),
    z.strictObject({ type: z.literal('add-phase'), id, after: id, title: phaseName, notes: text,
      seconds, hold, transition, ballFlight: flight }),
    z.strictObject({ type: z.literal('remove-phase'), phaseId: id }),
    z.strictObject({ type: z.literal('add-piece'), phaseId: id, id, kind: z.enum(COACH_KINDS), x, y, label,
      x2: x.nullable(), y2: y.nullable(), width: z.number().min(4).max(PITCH_WIDTH).nullable(),
      height: z.number().min(4).max(PITCH_HEIGHT).nullable(), curve: z.number().min(-250).max(250).nullable(),
      tone: tone.nullable(), angle: angle.nullable() }),
    z.strictObject({ type: z.literal('move-piece'), phaseId: id, id, x, y, x2: x.nullable(), y2: y.nullable() }),
    z.strictObject({ type: z.literal('style-piece'), phaseId: id, id, label: label.nullable(), tone: tone.nullable(), angle: angle.nullable() }),
    z.strictObject({ type: z.literal('remove-piece'), phaseId: id, id }),
  ])).max(36),
});

export const coachAssistantRequestSchema = z.object({
  message: z.string().trim().min(3).max(1200),
  language: z.enum(['de', 'en']),
  playId: z.string().uuid().optional(),
  phaseId: id.optional(),
  draft: coachPlaySchema.optional(),
}).refine(value => !value.draft || Boolean(value.playId));

export type CoachAssistantAnswer = z.infer<typeof coachAssistantAnswerSchema>;
export type CoachAssistantRequest = z.infer<typeof coachAssistantRequestSchema>;
export type CoachAssistantResult = { reply: string; play: CoachPlay | null; changeCount: number };

function findFrame(play: CoachPlay, id: string): CoachFrame {
  const frame = play.frames.find(value => value.id === id);
  if (!frame) throw new Error('Unknown phase');
  return frame;
}

function findPiece(frame: CoachFrame, id: string): CoachPiece {
  const piece = frame.items.find(value => value.id === id);
  if (!piece) throw new Error('Unknown piece');
  return piece;
}

function defined<T extends object>(fields: T) {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== null));
}

export function applyCoachAssistantAnswer(base: CoachPlay, value: unknown): CoachAssistantResult {
  const answer = coachAssistantAnswerSchema.parse(value);
  if (!answer.changes.length) return { reply: answer.reply, play: null, changeCount: 0 };

  const play = structuredClone(base);
  for (const change of answer.changes) {
    switch (change.type) {
      case 'details': {
        const { type: _type, ...fields } = change;
        Object.assign(play, defined(fields));
        break;
      }
      case 'plan':
        (play.plan ??= {})[change.field] = change.value;
        break;
      case 'minutes':
        (play.plan ??= {}).minutes = change.value;
        break;
      case 'phase': {
        const { type: _type, phaseId, ...fields } = change;
        Object.assign(findFrame(play, phaseId), defined(fields));
        break;
      }
      case 'add-phase': {
        const { type: _type, after, ...fields } = change;
        const previous = findFrame(play, after);
        play.frames.splice(play.frames.indexOf(previous) + 1, 0, { ...fields, items: structuredClone(previous.items) });
        break;
      }
      case 'remove-phase':
        play.frames.splice(play.frames.indexOf(findFrame(play, change.phaseId)), 1);
        break;
      case 'add-piece': {
        const { type: _type, phaseId, ...fields } = change;
        const { id, kind, x, y, label, ...options } = fields;
        findFrame(play, phaseId).items.push({ id, kind, x, y, label, ...defined(options) });
        break;
      }
      case 'move-piece': {
        const piece = findPiece(findFrame(play, change.phaseId), change.id);
        const endpoint = (saved: number | undefined, value: number | null, delta: number, max: number) =>
          value ?? (saved === undefined ? undefined : Math.min(max, Math.max(0, saved + delta)));
        piece.x2 = endpoint(piece.x2, change.x2, change.x - piece.x, PITCH_WIDTH);
        piece.y2 = endpoint(piece.y2, change.y2, change.y - piece.y, PITCH_HEIGHT);
        piece.x = change.x;
        piece.y = change.y;
        break;
      }
      case 'style-piece': {
        const { type: _type, phaseId, id, ...fields } = change;
        Object.assign(findPiece(findFrame(play, phaseId), id), defined(fields));
        break;
      }
      case 'remove-piece': {
        const frame = findFrame(play, change.phaseId);
        frame.items.splice(frame.items.indexOf(findPiece(frame, change.id)), 1);
        break;
      }
    }
  }

  return { reply: answer.reply, play: coachPlaySchema.parse(play), changeCount: answer.changes.length };
}
