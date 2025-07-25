import Fraction from 'fraction.js';
import {
  IntervalMap,
  Music,
  Barline,
  Entity,
  Spans,
  Interval,
  Span,
} from './types/abstract';
import { Accidental, Action, WhiteKey } from './types/basic';
import { engraveMusic } from './core/main';
import { renderConfig } from './core/config';
import { flattenLayoutTree } from './core/flatten';
import fs from 'node:fs';
import { renderSVG } from './svg/render';
import { getBoundingBox } from './core/bounding';

const ud = undefined;

const toDuration = (timeMultiplier: number, dot: number): Fraction =>
  new Fraction(1, 4 * 2 ** timeMultiplier).mul(dot ? new Fraction(3, 2) : 1);

const giveBarline = (barline: Barline = Barline.BarLine) => ({
  type: 'Tag' as const,
  tag: barline,
});

const giveRep4 = (): Entity => ({
  type: 'Event',
  event: {
    type: 'Repeater4',
  },
  duration: new Fraction(1, 4),
});

const giveNote = (
  key: number,
  octaveTranspose = 0,
  timeMultiplier = 0,
  dot = 0,
  duration: Fraction = toDuration(timeMultiplier, dot),
  accidental?: Accidental,
  symbols?: Action['symbols']
): Entity => ({
  type: 'Event',
  event: {
    type: 'Action',
    value: {
      timeMultiplier,
      dot,
      sound: {
        type: 'Note',
        pitches: [{ whiteKey: key, octaveTranspose, accidental }],
      },
      symbols,
    },
  },
  duration,
});

const giveRest = (timeMultiplier = 0, dot = 0): Entity => ({
  type: 'Event',
  event: {
    type: 'Action',
    value: {
      timeMultiplier,
      dot,
      sound: {
        type: 'Rest',
      },
    },
  },
  duration: toDuration(timeMultiplier, dot),
});

const giveLrc = (
  content: string,
  timeMultiplier = 0,
  dot = 0,
  duration: Fraction = toDuration(timeMultiplier, dot)
): Entity => ({
  type: 'Event',
  event: {
    type: 'Pronounce',
    syllable: {
      content,
    },
  },
  duration,
});

const giveBeam = (from: number, to: number): Interval => ({
  start: from,
  end: to,
});

const giveSlur = (from: number, to: number): [Interval, Span] => [
  { start: from, end: to },
  { type: 'Slur' },
];

const giveTuplet = (
  from: number,
  to: number,
  value: number
): [Interval, Span] => [
  { start: from, end: to },
  { type: 'Tuplet', value },
];

const testMusic: Music = {
  accolade: null,
  captions: null,
  voices: [
    {
      type: 'music',
      entities: [
        giveNote(3, 0, 1, 0, new Fraction(1, 12)),
        giveNote(4, 0, 1, 0, new Fraction(1, 12)),
        giveNote(5, 0, 1, 0, new Fraction(1, 12)),
        giveBarline(),
        giveNote(5, 0, 1),
        giveNote(1, 0, 1),
        giveNote(3, 0, 1, 0, new Fraction(1, 12)),
        giveNote(4, 0, 1, 0, new Fraction(1, 12)),
        giveNote(5, 0, 1, 0, new Fraction(1, 12)),
        giveNote(5, 0, 1),
        giveNote(1, 0, 1),
        giveRest(1),
        giveNote(5, -1, 1),
        giveBarline(),
        giveNote(5, 0, 1),
        giveNote(4, 0, 2),
        giveNote(4, 0, 2),
        giveNote(3, 0, 2),
        giveNote(6, 0, 1, 1),
        giveNote(5),
        giveNote(1, 0, 1),
        giveNote(2, 0, 1),
        giveBarline(),
        giveNote(3),
        giveNote(2, 0, 1),
        giveNote(1, 0, 2),
        giveNote(2, 0, 2),
        giveNote(2),
        giveNote(2, 0, 1),
        giveNote(1, 0, 1),
        giveBarline(),
        giveNote(6, ud, ud, ud, ud, ud, { top: ['fermataAbove'] }),
        giveRep4(),
        giveRep4(),
        giveBarline(Barline.DoubleBarLine),
      ],
      beams: [
        giveBeam(0, 2),
        giveBeam(4, 5),
        giveBeam(6, 8),
        giveBeam(9, 10),
        giveBeam(11, 12),
        giveBeam(14, 16),
        giveBeam(15, 16),
        giveBeam(17, 18),
        giveBeam(17, 17),
        giveBeam(20, 21),
        giveBeam(24, 26),
        giveBeam(25, 26),
        giveBeam(28, 29),
      ],
      spans: IntervalMap.fromRecords([
        giveTuplet(0, 2, 3),
        giveTuplet(6, 8, 3),
        giveSlur(26, 27),
      ]) as Spans,
    },
    {
      type: 'lyric',
      entities: [
        giveLrc('也', 1, 0, new Fraction(1, 12)),
        giveLrc('许', 1, 0, new Fraction(1, 12)),
        giveLrc('某', 1, 0, new Fraction(1, 12)),
        giveLrc('一', 1),
        giveLrc('天', 1),
        giveLrc('就', 1, 0, new Fraction(1, 12)),
        giveLrc('在', 1, 0, new Fraction(1, 12)),
        giveLrc('那', 1, 0, new Fraction(1, 12)),
        giveLrc('一', 1),
        giveLrc('天', 1),
        giveLrc('', 1),
        giveLrc('故', 1),
        giveLrc('事', 1),
        giveLrc('也', 2),
        giveLrc('会', 2),
        giveLrc('有', 2),
        giveLrc('终', 1, 1),
        giveLrc('点'),
        giveLrc('我', 1),
        giveLrc('们', 1),
        giveLrc('挥'),
        giveLrc('手', 1),
        giveLrc('告', 2),
        giveLrc('别', 2),
        giveLrc(''),
        giveLrc('所', 1),
        giveLrc('以', 1),
        giveLrc('啊'),
      ],
      spans: new IntervalMap<Span>(),
      beams: [],
    },
    {
      type: 'music',
      entities: [
        giveRest(),
        giveBarline(),
        giveNote(4, -1),
        giveRep4(),
        giveNote(3, -1),
        giveRep4(),
        giveBarline(),
        giveNote(2, -1),
        giveRep4(),
        giveNote(5, -1),
        giveRep4(),
        giveBarline(),
        giveNote(6, -1),
        giveNote(6, -1, 1, 1),
        giveNote(5, -1, 2, 0, ud, Accidental.Sharp),
        giveNote(5, -1),
        giveNote(5, -1, 0, 0, ud, Accidental.Natural),
        giveBarline(),
        giveNote(4, -1, 0, 0, ud, Accidental.Sharp, { top: ['fermataAbove'] }),
        giveRep4(),
        giveRep4(),
        giveBarline(Barline.DoubleBarLine),
      ],
      beams: [giveBeam(13, 14), giveBeam(14, 14)],
      spans: IntervalMap.fromRecords([giveSlur(12, 13), giveSlur(14, 15)]),
    },
    {
      type: 'lyric',
      entities: [
        giveLrc(''),
        giveLrc('呜'),
        giveLrc(''),
        giveLrc('呜'),
        giveLrc(''),
        giveLrc('啊'),
        giveLrc(''),
        giveLrc('啊'),
        giveLrc(''),
        giveLrc('呜'),
        giveLrc('', 1, 1),
        giveLrc('呜', 2, 0, ud),
        giveLrc(''),
        giveLrc('呜', 0, 0, ud),
        giveLrc('啊', 0, 0, ud),
      ],
      beams: [],
      spans: new IntervalMap<Span>(),
    },
    {
      type: 'music',
      entities: [
        giveRest(),
        giveBarline(),
        giveNote(4, -2),
        giveRep4(),
        giveNote(3, -2),
        giveRep4(),
        giveBarline(),
        giveNote(4, -2),
        giveRep4(),
        giveNote(5, -2),
        giveRep4(),
        giveBarline(),
        giveNote(6, -2),
        giveNote(6, -2, 1, 1),
        giveNote(7, -2, 2),
        giveNote(7, -2),
        giveNote(2, -2, 0),
        giveBarline(),
        giveNote(2, -2, 0, ud, ud, ud, { top: ['fermataAbove'] }),
        giveRep4(),
        giveRep4(),
        giveBarline(Barline.DoubleBarLine),
      ],
      beams: [giveBeam(13, 14), giveBeam(14, 14)],
      spans: IntervalMap.fromRecords([giveSlur(12, 13), giveSlur(14, 15)]),
    },
    {
      type: 'lyric',
      entities: [
        giveLrc(''),
        giveLrc('啊'),
        giveLrc(''),
        giveLrc('啊'),
        giveLrc(''),
        giveLrc('啊'),
        giveLrc(''),
        giveLrc('啊'),
        giveLrc(''),
        giveLrc('啊'),
        giveLrc('', 1, 1),
        giveLrc('啊', 2, 0, ud),
        giveLrc(''),
        giveLrc('啊', 0, 0, ud),
        giveLrc('啊', 0, 0, ud),
      ],
      spans: new IntervalMap<Span>(),
      beams: [],
    },
    // {
    //   type:'music',
    //   entities:[
    //     giveNote(1,0,1),
    //     giveNote(1,0,1),
    //   ],
    //   beams:[giveBeam(0,1)],
    //   spans: new IntervalMap<Span>(),
    // }
  ],
};

const engraved = engraveMusic(testMusic, renderConfig);
const totalHeight = getBoundingBox(engraved, renderConfig)?.[1][1] ?? 0;
const flattened = flattenLayoutTree(engraved);
const svgStr = renderSVG(
  flattened,
  renderConfig.lineWidth,
  totalHeight,
  renderConfig
);
fs.writeFileSync('output.svg', svgStr, 'utf-8');
