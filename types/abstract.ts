import { SymbolName } from '../svg/defReg';
import { Duration, Event } from './basic';

/** 间隔范围 */
export interface Interval {
  /** 开始位置 */
  start: number;
  /** 结束位置 */
  end: number;
}

/** 有持续时间的符号实体 */
export interface Entity {
  type: 'Event';
  event: Event;
  duration: Duration;
}

/** 无持续时间的符号实体 */
export type TagEntity = { type: 'Tag' } & (
  | {
      tag: Barline;
    }
  | { tag: 'TimeSignature'; value: [number, number] }
);

export type Tag = TagEntity['tag'];

export type AbstractEntity = Entity | TagEntity;

export enum Barline {
  BarLine = 'BarLine',
  DashedBarLine = 'DashedBarLine',
  BeginEndRepeat = 'BeginEndRepeat',
  BeginRepeat = 'BeginRepeat',
  EndRepeat = 'EndRepeat',
  DoubleBarLine = 'DoubleBarLine',
  EndSign = 'EndSign',
}

/** 跨越多个音符的装饰结构 */
export type Span =
  | { type: 'Slur' } // 连音线
  | { type: 'Tie' } // 延音线
  | { type: 'TieInChord'; indices: number[] } // 和弦内延音线
  | { type: 'Tuplet'; value: number } // 多连音
  // | { type: 'Beam' } // 减时线
  | { type: 'Symbol'; value: SymbolName };

export enum Boundary {
  Closed = 'Closed',
  LeftOpened = 'LeftOpened',
  RightOpened = 'RightOpened',
}

export class IntervalMap<T> {
  private records: [Interval, T][] = [];
  set(interval: Interval, value: T): void {
    this.records.push([interval, value]);
  }
  entries(): [Interval, T][] {
    return [...this.records];
  }
  pushRecords(records: [Interval, T][]): void {
    this.records.push(...records);
  }
  getTouches(range: number | Interval): [Interval, T][] {
    const interval = typeof range === 'number' ? { start: range, end: range } : range;
    return this.records.filter(
      ([{ start, end }]) => !(start > interval.end || end < interval.start),
    );
  }
  values(): T[] {
    return this.records.map(([, value]) => value);
  }
  sort(fn: (a: [Interval, T], b: [Interval, T]) => number): void {
    this.records.sort(fn);
  }
  shift() {
    return this.records.shift();
  }
  get length(): number {
    return this.records.length;
  }
  static fromRecords<T>(records: [Interval, T][]): IntervalMap<T> {
    const map = new IntervalMap<T>();
    map.pushRecords(records);
    return map;
  }
}

// 跨音符装饰结构，映射范围 -> Span
export type Spans = IntervalMap<Span>;

/** 声部 */
export interface Voice {
  type: 'music' | 'lyric';
  /** 顺序排列的符号实体 */
  entities: AbstractEntity[];
  /** 减时线 */
  beams: Interval[];
  /** 跨越多个音符的装饰结构 */
  spans: Spans;
}

export interface Accolade {
  type: 'Bracket' | 'Brace';
  range: Interval;
}

export interface Music {
  /** 声部 */
  voices: Voice[];
  /** 连谱号 */
  accolade: null | Accolade[];
  /** 声部标题 */
  captions: null | string[];
}

// utils
export function tagLikeBarLine(tag: string): tag is Barline {
  return (
    tag === Barline.BarLine ||
    tag === Barline.BeginEndRepeat ||
    tag === Barline.BeginRepeat ||
    tag === Barline.EndRepeat ||
    tag === Barline.DoubleBarLine ||
    tag === Barline.EndSign ||
    tag === Barline.DashedBarLine
  );
}

export function entityLikeBarLine(entity: AbstractEntity): boolean {
  return entity.type === 'Tag' && tagLikeBarLine(entity.tag);
}
