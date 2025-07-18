import Fraction from 'fraction.js';
import { IntervalMap, Music, Tag } from './types/abstract';
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
                    whiteKey: WhiteKey.K1,
                    octaveTranspose: -1,
                    accidental: Accidental.Sharp,
                  },
                ],
              },
            },
          },
          duration: new Fraction(1, 4),
        },
        {
          type: 'Event',
          event: {
            type: 'Action',
            value: {
              timeMultiplier: 1,
              dot: 0,
              sound: {
                type: 'Note',
                pitches: [{ whiteKey: WhiteKey.K2, octaveTranspose: 2 }],
              },
            },
          },
          duration: new Fraction(1, 8),
        },
        {
          type: 'Event',
          event: {
            type: 'Action',
            value: {
              timeMultiplier: 1,
              dot: 0,
              sound: {
                type: 'Note',
                pitches: [{ whiteKey: WhiteKey.K3, octaveTranspose: 0 }],
              },
            },
          },
          duration: new Fraction(1, 8),
        },
        {
          type: 'Tag',
          tag: Tag.EndSign,
        },
      ],
      spans: IntervalMap.fromRecords([
        [
          { start: 1, end: 2 },
          {
            type: 'Beam',
          },
        ],
      ]),
    },
    {
      type: 'lyric',
      entities: [
        {
          type: 'Event',
          event: {
            type: 'Pronounce',
            syllable: {
              content: '你',
            },
          },
          duration: new Fraction(1, 4),
        },
        {
          type: 'Event',
          event: {
            type: 'Pronounce',
            syllable: {
              content: '好',
            },
          },
          duration: new Fraction(1, 8),
        },
        {
          type: 'Event',
          event: {
            type: 'Pronounce',
            syllable: {
              content: '吗',
              suffix: '?',
            },
          },
          duration: new Fraction(1, 8),
        },
      ],
      spans: new IntervalMap(),
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
