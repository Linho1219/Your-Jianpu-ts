import Fraction from 'fraction.js';
import { IntervalMap, Music } from './types/abstract';
import { Accidental, WhiteKey } from './types/basic';
import { engraveMusic } from './core/main';
import { renderConfig } from './core/config';
import { flattenLayoutTree } from './core/flatten';
import fs from 'node:fs';
import { renderSVG } from './svg/render';

const testMusic: Music = {
  voices: [
    {
      entities: [
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
                pitches: [{ whiteKey: WhiteKey.K2, octaveTranspose: 0 }],
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
  ],
};

const engraved = engraveMusic(testMusic, renderConfig);
const flattened = flattenLayoutTree(engraved);
const svgStr = renderSVG(
  flattened,
  renderConfig.lineWidth,
  renderConfig.pageHeight,
  renderConfig
);
fs.writeFileSync('output.svg', svgStr, 'utf-8');
