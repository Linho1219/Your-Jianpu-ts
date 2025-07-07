import Fraction from 'fraction.js';
import { Music, Voice, AbstractEntity, Tag } from './abstract';
import { WhiteKey, TimeMultiplier } from './types';

// 工具函数生成 Note 音符
function makeNoteEntity(
  whiteKey: WhiteKey,
  duration: Fraction
): AbstractEntity {
  return {
    type: 'Event',
    event: {
      type: 'Action',
      value: {
        timeMultiplier: TimeMultiplier.Crotchet,
        dot: 0,
        sound: {
          type: 'Note',
          pitches: [
            {
              whiteKey,
              octaveTranspose: 0,
              accidental: undefined,
            },
          ],
        },
      },
    },
    duration,
  };
}

// 工具函数生成小节线
function barLine(): AbstractEntity {
  return {
    type: 'Tag',
    tag: Tag.BarLine,
  };
}

// 构造 Span 的 key（模拟 IntervalMap）
function spanKey(start: number, end: number): string {
  return JSON.stringify({ start, end });
}

// 创建两个声部
const voice1: Voice = {
  entities: [
    makeNoteEntity(WhiteKey.K1, new Fraction(1, 4)),
    makeNoteEntity(WhiteKey.K2, new Fraction(1, 4)),
    barLine(),
    makeNoteEntity(WhiteKey.K3, new Fraction(1, 2)),
  ],
  spans: new Map([
    [spanKey(0, 2), 'Slur'], // 从第一个音符到小节线前的音符加 Slur
  ]),
};

const voice2: Voice = {
  entities: [
    makeNoteEntity(WhiteKey.K5, new Fraction(1, 2)),
    barLine(),
    makeNoteEntity(WhiteKey.K6, new Fraction(1, 2)),
  ],
  spans: new Map([
    [spanKey(1, 2), 'Tie'], // 从 barLine 后的音符连接
  ]),
};

export const testMusic: Music = {
  voices: [voice1, voice2],
};

console.log(JSON.stringify(testMusic));