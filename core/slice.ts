import Fraction from 'fraction.js';
import { Event } from '../types/basic';
import {
  AbstractEntity,
  Span,
  IntervalMap,
  Interval,
  Spans,
  Music,
} from '../types/abstract';

//#region 类型定义

/**
 * 拆分过程中被切开的音
 * 原项目中命名为 ContEvent，觉得并不直观，遂改
 */
export interface PartialEntity {
  type: 'PartialEvent';
  event: Event;
  remaining: Fraction;
  total: Fraction;
}

export type SlicedEntity = AbstractEntity | PartialEntity | null;

export interface SlicedUnit {
  /** 一个切片的持续时间 */
  duration: Fraction;
  /** 切片下各个声部的实体 */
  entities: SlicedEntity[];
}

//#endregion

//#region 拆分 Voice

/**
 * 将 Music 拆分为横向的一个个 Slice
 * 1. 每次找出所有 voice 中最短的那个元素的时间作为一个拆分单元
 * 2. 把每个 voice 的当前元素按单元切开；
 * 3. 剩下的部分使用 null 填充
 * 这样所有 voice 的元素都能在同一时间轴上对齐，以便后续计算单元的长度
 *
 * @param entitiesOfVoices 原始的 Music 中的各个声部实体
 * @return 切分后的结果数组
 */
function sliceVoices(entitiesOfVoices: AbstractEntity[][]): {
  slicedUnits: SlicedUnit[];
  slicedVoices: SlicedEntity[][];
} {
  const voiceRelates = entitiesOfVoices.map((voice) => ({
    /** 等待处理的符号数组 */
    pendings: voice,
    /** 上一个被切开的符号 */
    ongoing: null as PartialEntity | null,
    /** 当前处理的符号 */
    head: null as SlicedEntity,
    /** 切分出的符号，后续输出 */
    sliced: null as SlicedEntity,
    slicedArr: [] as SlicedEntity[],
  }));
  const slicedUnits: SlicedUnit[] = [];

  while (true) {
    function refreshVoiceRelate(voiceRelate: (typeof voiceRelates)[number]) {
      const { ongoing, pendings } = voiceRelate;
      voiceRelate.head = ongoing || pendings.shift() || null;
      // 如果 ongoing 存在，说明它是上一个 slice 的剩余部分（PartialEntity）
      // 否则把 pendings 中的第一个元素取出
      voiceRelate.sliced = null;
    }
    voiceRelates.forEach(refreshVoiceRelate);

    // 含 Tag 特判：无时长，单独切出 slice
    while (voiceRelates.some(({ head }) => head && head.type === 'Tag')) {
      slicedUnits.push({
        duration: new Fraction(0),
        entities: voiceRelates.map((voiceRelate) => {
          const { head } = voiceRelate;
          if (head && head.type === 'Tag') {
            refreshVoiceRelate(voiceRelate);
            return head;
          }
          return null;
        }),
      });
    }
    // 当前 head 只能是 Event, PartialEvent 或 null

    if (voiceRelates.every(({ head }) => head === null)) break;

    const sliceDurationUnit = voiceRelates
      .map(({ head }) => {
        if (!head) return null;
        if (head.type === 'PartialEvent') return head.remaining;
        if (head.type === 'Event') return head.duration;
        return null;
      })
      .filter((d): d is Fraction => !!d)
      .reduce((a, b) => a.gcd(b));

    voiceRelates.forEach((voiceRelate) => {
      const { head } = voiceRelate;
      // tip: sliced 属性默认为 null
      if (!head) return;
      if (head.type === 'PartialEvent') {
        const remaining = head.remaining.sub(sliceDurationUnit);
        if (remaining.gt(0)) {
          voiceRelate.ongoing = {
            ...head,
            remaining,
          };
        } else voiceRelate.ongoing = null;
        voiceRelate.sliced = head;
        return;
      }
      if (head.type === 'Event') {
        voiceRelate.sliced = head;
        const remaining = head.duration.sub(sliceDurationUnit);
        if (remaining.gt(0)) {
          voiceRelate.ongoing = {
            type: 'PartialEvent',
            event: head.event,
            total: head.duration,
            remaining,
          };
        }
      }
    });
    slicedUnits.push({
      duration: sliceDurationUnit,
      entities: voiceRelates.map(({ sliced }) => sliced),
    });
    voiceRelates.forEach((voiceRelate) => {
      voiceRelate.slicedArr.push(voiceRelate.sliced);
    });
  }
  return {
    slicedUnits,
    slicedVoices: voiceRelates.map(({ slicedArr }) => slicedArr),
  };
}

//#endregion

/**
 * 将切片结果中的 Spans 映射到新的切片上
 * 意义存疑
 * @param elements 切片结果中的数组
 * @returns 一个函数，接受 Interval 并返回新的 Interval
 */
// function getSpansRemapper(elements: SlicedEntity[]) {
//   /** 是否是有效实体（非 Tag 和 null） */
//   const mask = elements.map((e) => e && e.type === 'Event');
//   /** 旧 index -> 新 index 的映射 */
//   const mapperDict = new Map<number, number>();
//   for (let oldIndex = 0, newIndex = 0; newIndex < mask.length; newIndex++) {
//     if (!mask[newIndex]) continue;
//     mapperDict.set(oldIndex++, newIndex);
//   }
//   const throwErr = () => {
//     throw new Error('Invalid interval mapping');
//   };
//   /** @throws 若映射失败则报错 */
//   const intervalMapper = ({ start, end }: Interval): Interval => ({
//     start: mapperDict.get(start) ?? throwErr(),
//     end: mapperDict.get(end) ?? throwErr(),
//   });
//   return intervalMapper;
// }

export function sliceMusic(music: Music) {
  const { voices } = music;
  const entitiesOfVoices = voices.map((voice) => voice.entities);
  const spansOfVoices = voices.map((voice) => voice.spans);

  const { slicedUnits, slicedVoices } = sliceVoices(entitiesOfVoices);
  // const transformedSpans = spansOfVoices.map((spans, index) => {
  //   const elements = slicedVoices[index];
  //   const remapper = getSpansRemapper(elements);
  //   const newSpans = new IntervalMap<Span>();
  //   spans.entries().forEach(([interval, span]) => {
  //     newSpans.set(remapper(interval), span);
  //   });
  //   return newSpans;
  // });

  console.log(slicedUnits);

  return {
    slices: slicedUnits,
    // transformedSpans,
  };
}
