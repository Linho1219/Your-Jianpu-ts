import Fraction from 'fraction.js';
import { IntervalMap, Music, Barline } from './types/abstract';
import { Accidental, WhiteKey } from './types/basic';
import { engraveMusic } from './core/main';
import { renderConfig } from './core/config';
import { flattenLayoutTree } from './core/flatten';
import fs from 'node:fs';
import { renderSVG } from './svg/render';
import { getBoundingBox } from './core/bounding';

const testMusic: Music = {
  voices: [
    {
      type: 'music',
      entities: [
        {
          type:'Tag',
          tag:'TimeSignature',
          value: [4, 4],
        },
        // 1
        {
          type: 'Event',
          event: {
            type: 'Action',
            value: {
              timeMultiplier: 0,
              dot: 0,
              sound: {
                type: 'Note',
                pitches: [{ whiteKey: WhiteKey.K1, octaveTranspose: 0 }],
              },
            },
          },
          duration: new Fraction(1, 4),
        },
        // 1
        {
          type: 'Event',
          event: {
            type: 'Action',
            value: {
              timeMultiplier: 0,
              dot: 0,
              sound: {
                type: 'Note',
                pitches: [{ whiteKey: WhiteKey.K1, octaveTranspose: 0 }],
              },
            },
          },
          duration: new Fraction(1, 4),
        },
        // 5
        {
          type: 'Event',
          event: {
            type: 'Action',
            value: {
              timeMultiplier: 0,
              dot: 0,
              sound: {
                type: 'Note',
                pitches: [{ whiteKey: WhiteKey.K5, octaveTranspose: 0 }],
              },
            },
          },
          duration: new Fraction(1, 4),
        },
        // 5
        {
          type: 'Event',
          event: {
            type: 'Action',
            value: {
              timeMultiplier: 0,
              dot: 0,
              sound: {
                type: 'Note',
                pitches: [{ whiteKey: WhiteKey.K5, octaveTranspose: 0 }],
              },
            },
          },
          duration: new Fraction(1, 4),
        },
        // |
        { type: 'Tag', tag: Barline.BeginRepeat },
        // 6..//
        {
          type: 'Event',
          event: {
            type: 'Action',
            value: {
              timeMultiplier: 2,
              dot: 0,
              sound: {
                type: 'Note',
                pitches: [
                  { whiteKey: WhiteKey.K6, octaveTranspose: 1 },
                  { whiteKey: WhiteKey.K1, octaveTranspose: -2 },
                ],
              },
              symbols: {
                top: ['articStaccatissimoAbove'],
              },
            },
          },
          duration: new Fraction(1, 16),
        },
        // 6./
        {
          type: 'Event',
          event: {
            type: 'Action',
            value: {
              timeMultiplier: 1,
              dot: 0,
              sound: {
                type: 'Note',
                pitches: [{ whiteKey: WhiteKey.K6, octaveTranspose: -1 }],
              },
            },
          },
          duration: new Fraction(1, 8),
        },
        // 6''//
        {
          type: 'Event',
          event: {
            type: 'Action',
            value: {
              timeMultiplier: 2,
              dot: 0,
              sound: {
                type: 'Note',
                pitches: [{ whiteKey: WhiteKey.K6, octaveTranspose: 2 }],
              },
            },
          },
          duration: new Fraction(1, 16),
        },
        // 5
        {
          type: 'Event',
          event: {
            type: 'Action',
            value: {
              timeMultiplier: 0,
              dot: 0,
              sound: {
                type: 'Note',
                pitches: [{ whiteKey: WhiteKey.K5, octaveTranspose: 0 }],
              },
            },
          },
          duration: new Fraction(1, 4),
        },
        // -
        {
          type: 'Event',
          event: {
            type: 'Repeater4',
          },
          duration: new Fraction(1, 4),
        },
        // |
        { type: 'Tag', tag: Barline.BeginEndRepeat },
        // 4/
        {
          type: 'Event',
          event: {
            type: 'Action',
            value: {
              timeMultiplier: 1,
              dot: 0,
              sound: {
                type: 'Note',
                pitches: [{ whiteKey: WhiteKey.K4, octaveTranspose: 0 }],
              },
            },
          },
          duration: new Fraction(1, 8),
        },
        // 4./
        {
          type: 'Event',
          event: {
            type: 'Action',
            value: {
              timeMultiplier: 1,
              dot: 0,
              sound: {
                type: 'Note',
                pitches: [{ whiteKey: WhiteKey.K4, octaveTranspose: -1 }],
              },
            },
          },
          duration: new Fraction(1, 8),
        },
        // 1'
        {
          type: 'Event',
          event: {
            type: 'Action',
            value: {
              timeMultiplier: 0,
              dot: 0,
              sound: {
                type: 'Note',
                pitches: [{ whiteKey: WhiteKey.K1, octaveTranspose: 1 }],
              },
            },
          },
          duration: new Fraction(1, 4),
        },
        // #3
        {
          type: 'Event',
          event: {
            type: 'Action',
            value: {
              timeMultiplier: 0,
              dot: 0,
              sound: {
                type: 'Note',
                pitches: [
                  {
                    whiteKey: WhiteKey.K3,
                    octaveTranspose: 0,
                    accidental: Accidental.Sharp,
                  },
                ],
              },
              symbols: {
                top: ['articTenutoAbove'],
              },
            },
          },
          duration: new Fraction(1, 4),
        },
        // =3
        {
          type: 'Event',
          event: {
            type: 'Action',
            value: {
              timeMultiplier: 0,
              dot: 0,
              sound: {
                type: 'Note',
                pitches: [
                  {
                    whiteKey: WhiteKey.K3,
                    octaveTranspose: 0,
                    accidental: Accidental.Natural,
                  },
                ],
              },
              symbols: {
                top: ['articAccentAbove'],
              },
            },
          },
          duration: new Fraction(1, 4),
        },
        // |
        { type: 'Tag', tag: Barline.DashedBarLine },
        // 2*
        {
          type: 'Event',
          event: {
            type: 'Action',
            value: {
              timeMultiplier: 0,
              dot: 1,
              sound: {
                type: 'Note',
                pitches: [
                  {
                    whiteKey: WhiteKey.K7,
                    octaveTranspose: 1,
                    accidental: Accidental.Flat,
                  },
                  {
                    whiteKey: WhiteKey.K4,
                    octaveTranspose: 1,
                    accidental: Accidental.DoubleSharp,
                  },
                  { whiteKey: WhiteKey.K6, octaveTranspose: -1 },
                ],
              },
            },
          },
          duration: new Fraction(1, 4),
        },
        // 2/
        {
          type: 'Event',
          event: {
            type: 'Action',
            value: {
              timeMultiplier: 1,
              dot: 0,
              sound: {
                type: 'Note',
                pitches: [{ whiteKey: WhiteKey.K2, octaveTranspose: 0 }],
              },
            },
          },
          duration: new Fraction(1, 8),
        },
        // 1
        {
          type: 'Event',
          event: {
            type: 'Action',
            value: {
              timeMultiplier: 0,
              dot: 0,
              sound: {
                type: 'Note',
                pitches: [{ whiteKey: WhiteKey.K1, octaveTranspose: 0 }],
              },
              symbols: {
                top: ['fermataAbove'],
              },
            },
          },
          duration: new Fraction(1, 4),
        },
        // -
        {
          type: 'Event',
          event: {
            type: 'Repeater4',
          },
          duration: new Fraction(1, 4),
        },
        // |||
        { type: 'Tag', tag: Barline.EndSign },
      ],
      spans: IntervalMap.fromRecords([
        [
          { start: 4, end: 6 },
          {
            type: 'Beam',
          },
        ],
        [
          { start: 4, end: 4 },
          {
            type: 'Beam',
          },
        ],
        [
          { start: 6, end: 6 },
          {
            type: 'Beam',
          },
        ],
        [
          { start: 9, end: 10 },
          {
            type: 'Beam',
          },
        ],
        [
          { start: 15, end: 15 },
          {
            type: 'Beam',
          },
        ],
      ]),
    },
    {
      type: 'lyric',
      entities: [
        // 1
        {
          type: 'Event',
          event: {
            type: 'Pronounce',
            syllable: {
              content: '一',
            },
          },
          duration: new Fraction(1, 4),
        },
        // 1
        {
          type: 'Event',
          event: {
            type: 'Pronounce',
            syllable: {
              content: '闪',
            },
          },
          duration: new Fraction(1, 4),
        },
        // 5
        {
          type: 'Event',
          event: {
            type: 'Pronounce',
            syllable: {
              content: '一',
            },
          },
          duration: new Fraction(1, 4),
        },
        // 5
        {
          type: 'Event',
          event: {
            type: 'Pronounce',
            syllable: {
              content: '闪',
            },
          },
          duration: new Fraction(1, 4),
        },
        // 6..//
        {
          type: 'Event',
          event: {
            type: 'Pronounce',
            syllable: {
              content: '亮',
            },
          },
          duration: new Fraction(1, 16),
        },
        // 6./
        {
          type: 'Event',
          event: {
            type: 'Pronounce',
            syllable: {
              content: '亮',
            },
          },
          duration: new Fraction(1, 8),
        },
        // 6''//
        {
          type: 'Event',
          event: {
            type: 'Pronounce',
            syllable: {
              content: '晶',
            },
          },
          duration: new Fraction(1, 16),
        },
        // 5
        {
          type: 'Event',
          event: {
            type: 'Pronounce',
            syllable: {
              content: '晶',
            },
          },
          duration: new Fraction(1, 4),
        },
        // -
        {
          type: 'Event',
          event: {
            type: 'Pronounce',
          },
          duration: new Fraction(1, 4),
        },
        // 4/
        {
          type: 'Event',
          event: {
            type: 'Pronounce',
            syllable: {
              content: '满',
            },
          },
          duration: new Fraction(1, 8),
        },
        // 4./
        {
          type: 'Event',
          event: {
            type: 'Pronounce',
          },
          duration: new Fraction(1, 8),
        },
        // 1'
        {
          type: 'Event',
          event: {
            type: 'Pronounce',
            syllable: {
              content: '天',
            },
          },
          duration: new Fraction(1, 4),
        },
        // #3
        {
          type: 'Event',
          event: {
            type: 'Pronounce',
            syllable: {
              content: '都',
            },
          },
          duration: new Fraction(1, 4),
        },
        // =3
        {
          type: 'Event',
          event: {
            type: 'Pronounce',
            syllable: {
              content: '是',
            },
          },
          duration: new Fraction(1, 4),
        },
        // 2*
        {
          type: 'Event',
          event: {
            type: 'Pronounce',
            syllable: {
              content: '小',
            },
          },
          duration: new Fraction(1, 4),
        },
        // 2/
        {
          type: 'Event',
          event: {
            type: 'Pronounce',
            syllable: {
              content: '星',
            },
          },
          duration: new Fraction(1, 8),
        },
        // 1
        {
          type: 'Event',
          event: {
            type: 'Pronounce',
            syllable: {
              content: '星',
            },
          },
          duration: new Fraction(1, 4),
        },
        // -
        {
          type: 'Event',
          event: {
            type: 'Pronounce',
          },
          duration: new Fraction(1, 4),
        },
      ],
      spans: IntervalMap.fromRecords([]),
    },
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
