import Fraction from 'fraction.js';

export type Duration = Fraction;

export type TimeSignature = [number, number];

/** 简谱谱面上的一个数字，0~7/X，可以是和弦 */
export interface Action {
  /** 减时线数量 */
  timeMultiplier: TimeMultiplier;
  /** 附点数量 */
  dot: number;
  /** 动作内容 */
  sound: Sound;
}

export type Event =
  | { type: 'Repeater4' } // 四分延长线
  | { type: 'MultiBarRest'; count: number } // 多小节休止符(?)
  | { type: 'Action'; value: Action }
  | { type: 'Pronounce'; syllable?: Syllable }; // 歌词内容(?)

/** 减时线的条数 */
export enum TimeMultiplier {
  /** 全音符 */
  Whole = -2,
  /** 二分音符 */
  Minim,
  /** 四分音符 */
  Crotchet,
  /** 八分音符 */
  Quaver,
  /** 十六分音符 */
  Semiquaver,
}

/** 0~7/X，可以是和弦 */
export type Sound =
  | {
      type: 'Note';
      /** 音符, 可能是和弦 */
      pitches: Pitch[];
      /** 倚音 */
      appoggiatura?: Appoggiatura;
    }
  | { type: 'Rest' }
  | { type: 'Clap' };

/** 音高 */
export interface Pitch {
  /** 对应音符 */
  whiteKey: WhiteKey;
  /** 八度升降数，正数表示升高，负数表示降低 */
  octaveTranspose: number;
  /** 可能的升降号 */
  accidental?: Accidental;
}

/** 与一个音对应的歌词, 防止前缀后缀(标点等)影响对齐 */
export interface Syllable {
  prefix?: string;
  content: string;
  suffix?: string;
}

export enum WhiteKey {
  K1 = 1,
  K2,
  K3,
  K4,
  K5,
  K6,
  K7,
}

/** 升降号 */
export enum Accidental {
  Natural = 'accidentalNatural',
  Sharp = 'accidentalSharp',
  Flat = 'accidentalFlat',
  DoubleSharp = 'accidentalDoubleSharp',
  DoubleFlat = 'accidentalDoubleFlat',
}

/** 倚音 */
export interface Appoggiatura {
  sounds: Sound[];
}
