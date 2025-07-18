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
export interface TagEntity {
  type: 'Tag';
  tag: Tag;
}

export type AbstractEntity = Entity | TagEntity;

export enum Tag {
  TimeSignature = 'TimeSignature',
  BarLine = 'BarLine',
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
  | { type: 'Beam' } // 减时线
  | { type: 'Fermata' };

export enum Boundary {
  Closed = 'Closed',
  LeftOpened = 'LeftOpened',
  RightOpened = 'RightOpened',
}

export class IntervalMap<T> {
  private _map: Map<string, T>;
  constructor() {
    this._map = new Map<string, T>();
  }
  private static toKey(interval: Interval): string {
    return `${interval.start},${interval.end}`;
  }
  private static fromKey<T>(key: string): Interval {
    const [start, end] = key.split(',').map(Number);
    return { start, end };
  }
  set(interval: Interval, value: T) {
    const key = IntervalMap.toKey(interval);
    this._map.set(key, value);
  }
  get(interval: Interval): T | undefined {
    const key = IntervalMap.toKey(interval);
    return this._map.get(key);
  }
  has(interval: Interval): boolean {
    const key = IntervalMap.toKey(interval);
    return this._map.has(key);
  }
  delete(interval: Interval): boolean {
    const key = IntervalMap.toKey(interval);
    return this._map.delete(key);
  }
  clear(): void {
    this._map.clear();
  }
  entries(): [Interval, T][] {
    return Array.from(this._map.entries()).map(([key, value]) => [
      IntervalMap.fromKey(key),
      value,
    ]);
  }
  keys(): Interval[] {
    return Array.from(this._map.keys()).map(IntervalMap.fromKey);
  }
  static fromRecords<T>(records: [Interval, T][]): IntervalMap<T> {
    const map = new IntervalMap<T>();
    for (const [interval, value] of records) {
      map.set(interval, value);
    }
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
  /** 跨越多个音符的装饰结构 */
  spans: Spans;
}

export interface Music {
  voices: Voice[];
}

// utils
export function tagLikeBarLine(tag: Tag): boolean {
  return (
    tag === Tag.BarLine ||
    tag === Tag.BeginEndRepeat ||
    tag === Tag.BeginRepeat ||
    tag === Tag.EndRepeat ||
    tag === Tag.DoubleBarLine ||
    tag === Tag.EndSign
  );
}

export function entityLikeBarLine(entity: AbstractEntity): boolean {
  return entity.type === 'Tag' && tagLikeBarLine(entity.tag);
}
