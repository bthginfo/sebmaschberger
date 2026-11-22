import { z } from 'zod';
import {
  COACH_BALL_FLIGHTS, COACH_CATEGORIES, COACH_KINDS, COACH_PITCHES, COACH_TONES, COACH_TRANSITIONS,
  PITCH_HEIGHT, PITCH_WIDTH,
} from './model';

const key = z.string().min(1).max(64).regex(/^[\w-]+$/u);
const x = z.number().min(0).max(PITCH_WIDTH);
const y = z.number().min(0).max(PITCH_HEIGHT);

const piece = z.object({
  id: key,
  kind: z.enum(COACH_KINDS),
  x,
  y,
  label: z.string().max(48),
  x2: x.optional(),
  y2: y.optional(),
  width: z.number().min(4).max(PITCH_WIDTH).optional(),
  height: z.number().min(4).max(PITCH_HEIGHT).optional(),
  curve: z.number().min(-250).max(250).optional(),
  angle: z.number().min(-180).max(180).optional(),
  tone: z.enum(COACH_TONES).optional(),
});

const frame = z.object({
  id: key,
  title: z.string().max(70),
  notes: z.string().max(600),
  seconds: z.number().min(0.25).max(20),
  hold: z.number().min(0).max(20).optional(),
  transition: z.enum(COACH_TRANSITIONS).optional(),
  ballFlight: z.enum(COACH_BALL_FLIGHTS).optional(),
  items: z.array(piece).max(100),
}).refine(value => new Set(value.items.map(item => item.id)).size === value.items.length, {
  message: 'Eine Phase enthält doppelte Objektkennungen.',
});

const plan = z.object({
  objective: z.string().max(240).optional(),
  players: z.string().max(240).optional(),
  area: z.string().max(240).optional(),
  equipment: z.string().max(240).optional(),
  progression: z.string().max(600).optional(),
  minutes: z.number().int().min(1).max(240).optional(),
});

export const coachPlaySchema = z.object({
  title: z.string().trim().min(1, 'Gib der Taktik einen Namen.').max(100),
  description: z.string().max(600),
  category: z.enum(COACH_CATEGORIES),
  pitch: z.enum(COACH_PITCHES),
  locale: z.enum(['de', 'en']),
  frames: z.array(frame).min(1).max(24),
  plan: plan.optional(),
}).refine(value => new Set(value.frames.map(item => item.id)).size === value.frames.length, {
  message: 'Die Taktik enthält doppelte Phasenkennungen.',
});

export const coachRevisionSchema = z.number().int().positive();
export const coachLinkSchema = z.object({
  role: z.enum(['view', 'edit']),
  name: z.string().trim().min(1).max(80),
  days: z.number().int().min(1).max(30),
});
