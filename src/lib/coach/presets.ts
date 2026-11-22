import type { CoachFrame, CoachLocale, CoachPiece, CoachPlay, CoachRecord } from './model';

function piece(id: string, kind: CoachPiece['kind'], x: number, y: number, label = '', details: Partial<CoachPiece> = {}): CoachPiece {
  return { id, kind, x, y, label, ...details };
}

function phase(id: string, title: string, notes: string, seconds: number, items: CoachPiece[]): CoachFrame {
  return { id, title, notes, seconds, items };
}

function move(items: CoachPiece[], positions: Record<string, readonly [number, number]>): CoachPiece[] {
  return items.map(item => {
    const next = positions[item.id];
    return next ? { ...item, x: next[0], y: next[1] } : item;
  });
}

function buildCoachPresets(locale: CoachLocale, includeLegacy = false): CoachPlay[] {
  const t = (de: string, en: string) => locale === 'de' ? de : en;
  const overlap = [
    piece('10', 'attack', 310, 230, '10'), piece('12', 'attack', 245, 345, '12'), piece('14', 'attack', 185, 462, '14'),
    piece('7-red', 'defence', 610, 230, '7'), piece('13-red', 'defence', 647, 350, '13'),
    piece('ball', 'ball', 339, 211),
    piece('channel', 'zone', 758, 420,  t('Zielzone', 'Scoring zone'), { width: 152, height: 108 }),
    piece('cone-top', 'cone', 755, 421), piece('cone-bottom', 'cone', 755, 532),
  ];
  const carryPath = piece('carry', 'run', 355, 236, '', { x2: 482, y2: 236 });
  const supportPath = piece('support', 'run', 224, 468, '', { x2: 342, y2: 469 });
  const bind = move(overlap, { '10': [511, 239], '12': [428, 351], '14': [369, 469], '7-red': [560, 235], '13-red': [585, 351], ball: [532, 222] });
  const transfer = move(bind, { '10': [530, 232], '12': [466, 359], '14': [404, 473], '7-red': [550, 238], '13-red': [573, 358], ball: [485, 342] });
  const swing = move(transfer, { '10': [546, 228], '12': [503, 360], '14': [443, 476], '7-red': [553, 233], '13-red': [560, 364], ball: [466, 457] });
  const score = move(swing, { '10': [571, 235], '12': [635, 371], '14': [861, 474], '7-red': [577, 253], '13-red': [719, 402], ball: [888, 453] });
  const defence = [
    piece('10', 'attack', 352, 190, '10'), piece('12', 'attack', 306, 302, '12'), piece('13', 'attack', 254, 418, '13'),
    piece('9-red', 'defence', 591, 198, '9'), piece('12-red', 'defence', 600, 302, '12'), piece('13-red', 'defence', 621, 408, '13'),
    piece('ball', 'ball', 378, 172),
  ];
  const lineout = [
    piece('2', 'attack', 375, 52, '2'), piece('1', 'attack', 321, 150, '1'), piece('4', 'attack', 321, 208, '4'),
    piece('3', 'attack', 321, 267, '3'), piece('9', 'attack', 260, 256, '9'),
    piece('1-red', 'defence', 429, 150, '1'), piece('5-red', 'defence', 429, 210, '5'), piece('3-red', 'defence', 429, 267, '3'),
    piece('ball', 'ball', 375, 76), piece('mark', 'lineout', 480, 207, t('Gasse', 'Lineout')),
  ];
  const scrum = [
    piece('scrum', 'scrum', 450, 240, t('Gedränge', 'Scrum')),
    piece('8', 'attack', 404, 241, '8'), piece('9', 'attack', 361, 306, '9'), piece('15', 'attack', 271, 422, '15'),
    piece('7-red', 'defence', 584, 256, '7'), piece('12-red', 'defence', 627, 391, '12'),
    piece('ball', 'ball', 418, 259),
  ];
  const kickSetup = [
    piece('10', 'attack', 322, 170, '10'), piece('11', 'attack', 337, 456, '11'),
    piece('15-red', 'defence', 611, 275, '15'), piece('ball', 'ball', 348, 152),
    piece('catch-zone', 'ring', 669, 409, t('Fangzone', 'Catch zone'), { width: 116, height: 106, tone: 'mint' }),
    piece('gate', 'gate', 808, 466, '', { angle: 90 }),
    piece('flag', 'flag', 909, 466, '', { tone: 'violet' }),
    piece('start-line', 'line', 380, 119, '', { x2: 380, y2: 516 }),
  ];
  const kickCatch = move(kickSetup, { '10': [369, 172], '11': [700, 463], '15-red': [678, 330], ball: [723, 446] });

  const templates: CoachPlay[] = [
    {
      title: t('3 gegen 2 am Flügel', '3 v 2 on the wing'),
      description: t('Den inneren Verteidiger binden, Breite halten und den Ball vor dem Kontakt nach außen bringen.', 'Fix the inside defender, hold your width and move the ball before contact.'),
      category: 'attack', pitch: 'half', locale,
      plan: {
        objective: t('Den inneren Verteidiger binden und die Überzahl außen nutzen.', 'Fix the inside defender and use the overlap.'),
        players: t('3 Angreifer, 2 Verteidiger', '3 attackers, 2 defenders'),
        area: '20 × 25 m',
        equipment: t('1 Ball, 2 Hütchen', '1 ball, 2 cones'),
        progression: t('Erst mit geführter Abwehr starten. Danach wählen die Verteidiger selbst, wen sie anlaufen.', 'Start with guided defence. Then let the defenders choose who to press.'),
        minutes: 12,
      },
      frames: [
        { ...phase('setup', t('Aufstellung', 'Set-up'), t('Drei Angreifer gegen zwei Verteidiger. Die Außenbahn mit zwei Hütchen markieren.', 'Three attackers against two defenders. Mark the outside channel with two cones.'), 2, [
          ...overlap,
          carryPath,
          { ...supportPath, curve: 19 },
        ]), hold: .5 },
        { ...phase('fix', t('Verteidiger binden', 'Fix the defender'), t('10 zieht die innere Abwehr an und passt auf 12. 14 hält Breite und Tiefe.', '10 fixes the inside defender and passes to 12. 14 holds width and depth.'), 1, [
          ...bind,
          piece('first-pass', 'pass', 532, 222, '', { x2: 485, y2: 342, curve: 15 }),
        ]), hold: .25, ballFlight: 'pass' },
        { ...phase('transfer', t('Auf außen weiterleiten', 'Transfer it wide'), t('12 zieht den zweiten Verteidiger und gibt den Ball an 14 weiter.', '12 draws the second defender and moves the ball to 14.'), 1.25, [
          ...transfer,
          piece('second-pass', 'pass', 485, 342, '', { x2: 466, y2: 457, curve: 12 }),
        ]), hold: .25, ballFlight: 'pass' },
        { ...phase('width', t('Außen beschleunigen', 'Accelerate outside'), t('14 nimmt den Ball mit Platz an und beschleunigt durch die Außenbahn.', '14 receives with room and accelerates through the outside channel.'), 2, [
          ...swing,
          piece('finish-path', 'run', 487, 477, '', { x2: 823, y2: 476, curve: -15 }),
        ]), hold: .25, ballFlight: 'ground' },
        { ...phase('finish', t('Zielzone erreichen', 'Reach the scoring zone'), t('Nächster Durchgang mit getauschten Rollen.', 'Rotate the roles for the next rep.'), 1, score), hold: .75 },
      ],
    },
    {
      title: t('Driftverteidigung', 'Drift defence'),
      description: t('Die Linie verschiebt gemeinsam und schützt den Raum außen.', 'The line shifts together and protects the outside channel.'),
      category: 'defence', pitch: 'full', locale,
      frames: [
        phase('line', t('Linie stellen', 'Set the line'), t('Die Verteidiger halten gleichmäßige Abstände und kommunizieren von innen nach außen.', 'Defenders keep even spacing and communicate from the inside out.'), 2, defence),
        phase('drift', t('Gemeinsam schieben', 'Drift together'), t('Sobald der Ball nach außen geht, bleibt die Innenschulter gedeckt.', 'As the ball goes wide, keep the inside shoulder covered.'), 1.8, move(defence, { '10': [450, 204], '12': [409, 355], '13': [365, 493], '9-red': [508, 230], '12-red': [530, 351], '13-red': [569, 462], ball: [431, 340] })),
        phase('contain', t('Außen schließen', 'Close the edge'), t('Die letzte Spielerin schließt den Außenraum, die Linie bleibt verbunden.', 'The outside defender closes the channel while the line stays connected.'), 1, move(defence, { '10': [502, 240], '12': [477, 369], '13': [459, 507], '9-red': [540, 266], '12-red': [562, 386], '13-red': [584, 499], ball: [484, 496] })),
      ],
    },
    {
      title: t('Gasse auf Position 4', 'Lineout to four'),
      description: t('Wurf, Ballannahme und Weitergabe an die 9 als gemeinsame Abfolge üben.', 'Rehearse the throw, catch and transfer to 9 as one sequence.'),
      category: 'set-piece', pitch: '22', locale,
      frames: [
        phase('lineout-setup', t('Gasse bilden', 'Form the lineout'), t('Die Gasse orientiert sich an 5 und 15 Metern. 9 wartet auf der eigenen Seite.', 'Use the five- and 15-metre markings. 9 waits on their own side.'), 1.4, [...lineout, piece('throw', 'pass', 375, 88, '', { x2: 344, y2: 205, curve: -16 })]),
        phase('catch', t('Ball sichern', 'Secure the ball'), t('4 nimmt den Ball an. 9 bietet sich für die Weitergabe an.', '4 secures the catch. 9 moves into a position to receive.'), 1.2, [...move(lineout, { ball: [340, 207], '9': [253, 231] }), piece('release', 'pass', 332, 217, '', { x2: 277, y2: 238 })]),
        phase('release', t('Auf 9 lösen', 'Release to 9'), t('9 erhält den Ball und schaut in den freien Raum.', '9 receives the ball and looks for space.'), 1, move(lineout, { ball: [254, 230], '9': [232, 245] })),
      ],
    },
    {
      title: t('Gedränge: 8–9–15', 'Scrum: 8–9–15'),
      description: t('Laufwege und den Zeitpunkt der Ballabgabe nach dem Gedränge abstimmen.', 'Coordinate running lines and the timing of the release from the scrum.'),
      category: 'set-piece', pitch: 'half', locale,
      frames: [
        phase('base', t('Am Fuß des Gedränges', 'At the base'), t('8 sichert den Ball. 9 und 15 stimmen Abstand und Tiefe ab.', '8 controls the ball. 9 and 15 check spacing and depth.'), 1.6, scrum),
        phase('out', t('9 löst sich', '9 breaks away'), t('9 attackiert den Zwischenraum und hält 15 als Option außen.', '9 attacks the gap with 15 available outside.'), 1.8, [...move(scrum, { '9': [530, 327], '15': [426, 452], ball: [551, 318] }), piece('release', 'pass', 548, 345, '', { x2: 497, y2: 442, curve: 17 })]),
        phase('wide', t('15 übernimmt', '15 receives'), t('15 fängt in Bewegung und beschleunigt durch den Außenkanal.', '15 receives on the move and accelerates through the outside channel.'), 1, move(scrum, { '9': [560, 348], '15': [504, 450], ball: [527, 433], '12-red': [587, 424] })),
      ],
    },
    {
      title: t('Kick in die Außenzone', 'Kick to the outside channel'),
      description: t('Den Lauf von 11 auf den Kick von 10 abstimmen.', 'Time 11’s run to meet the kick from 10.'),
      category: 'drill', pitch: 'half', locale,
      plan: {
        objective: t('Startzeitpunkt und Laufweg an den Ballflug anpassen.', 'Time the run and adjust to the flight of the ball.'),
        players: t('Kicker, Läufer und ein Verteidiger', 'Kicker, chaser and one defender'),
        area: '30 × 40 m',
        equipment: t('1 Ball, 2 Hütchen und eine Flagge', '1 ball, 2 cones and a flag'),
        progression: t('Den Verteidiger erst beim Kick starten lassen, dann den Startzeitpunkt freigeben.', 'Release the defender at the kick, then let them choose when to go.'),
        minutes: 10,
      },
      frames: [
        { ...phase('kick-setup', t('Kick vorbereiten', 'Set up the kick'), t('11 startet hinter dem Ball und läuft in die Fangzone.', '11 starts behind the ball and runs into the catch zone.'), 2.5, [
          ...kickSetup,
          piece('kick', 'kick', 348, 152, '', { x2: 723, y2: 446, curve: -70 }),
          piece('chase', 'run', 355, 453, '', { x2: 682, y2: 461, curve: 22 }),
        ]), hold: .75, ballFlight: 'kick', transition: 'linear' },
        { ...phase('catch', t('Im Lauf fangen', 'Catch on the run'), t('Den Ball sichern und durch das Hütchentor laufen.', 'Secure the ball and run through the cone gate.'), 1.75, kickCatch), hold: .35 },
        { ...phase('gate', t('Durch das Tor', 'Through the gate'), t('An der Flagge abbremsen und den Durchgang neu starten.', 'Slow down at the flag and reset.'), 1, move(kickCatch, { '11': [868, 465], '15-red': [737, 386], ball: [894, 448] })), hold: 1 },
      ],
    },
  ];

  if (includeLegacy) {
    // The original wing example was stored with four phases and no training plan.
    const { title, description, category, pitch, frames: [setup] } = templates[0];
    const legacyWidth = move(swing, { '10': [540, 228], '12': [520, 358], '14': [463, 474], ball: [484, 454] });
    templates.push({
      title, description, category, pitch, locale,
      frames: [
        phase('setup', setup.title, setup.notes, 2, [...overlap, carryPath, supportPath]),
        phase('fix', t('Verteidiger binden', 'Fix the defender'),
          t('10 läuft gerade an. 12 und 14 bleiben tief und bieten eine Passoption an.', '10 runs straight. 12 and 14 stay deep and offer a passing option.'), 1.5,
          [...bind, piece('switch', 'pass', 530, 255, '', { x2: 496, y2: 341, curve: 12 })]),
        phase('width', t('Ball nach außen', 'Move the ball wide'),
          t('12 zieht den zweiten Verteidiger, 14 nimmt den Ball mit Platz an.', '12 draws the second defender, and 14 receives with room.'), 2.2,
          [...legacyWidth, piece('finish-path', 'run', 507, 478, '', { x2: 823, y2: 478 })]),
        phase('finish', t('Zielzone erreichen', 'Reach the scoring zone'),
          t('14 beschleunigt durch die markierte Zone. Nächster Durchgang mit getauschten Rollen.', '14 accelerates through the marked zone. Rotate the roles for the next rep.'), 1, score),
      ],
    });
  }
  return templates;
}

export function coachTemplates(locale: CoachLocale = 'de'): CoachPlay[] {
  return buildCoachPresets(locale);
}

function presetSignature(play: CoachPlay) {
  // PostgreSQL JSONB can reorder object keys. Array order still identifies the stored tactic.
  return JSON.stringify(play, (_, value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0));
  });
}

const englishPresets = buildCoachPresets('en', true);
const localizablePresets = buildCoachPresets('de', true).flatMap((de, index) => {
  const en = englishPresets[index];
  const pair = { de, en };
  return [de, en].map(play => ({ title: play.title, signature: presetSignature(play), pair }));
});

/** Project untouched presets into the workspace language without editing a stored record or an open draft. */
export function localizeCoachPreset(record: CoachRecord, locale: CoachLocale, draft = record.play): CoachPlay {
  if (draft !== record.play || draft.locale === locale) return draft;
  const candidates = localizablePresets.filter(candidate => candidate.title === draft.title);
  if (!candidates.length) return draft;
  const signature = presetSignature(draft);
  const match = candidates.find(candidate => candidate.signature === signature);
  return match ? structuredClone(match.pair[locale]) : draft;
}
