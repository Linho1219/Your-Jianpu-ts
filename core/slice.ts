import Fraction from 'fraction.js';
import { Event } from '../types/types';
import { AbstractEntity } from '../types/abstract';

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

interface SliceResult {
  duration: Fraction;
  entities: (AbstractEntity | PartialEntity | null)[];
}

/**
 * 将 Music 拆分为横向的一个个 Slice
 * 1. 每次找出所有 voice 中最短的那个元素的时间作为一个拆分单元
 * 2. 把每个 voice 的当前元素按单元切开；
 * 3. 剩下的部分使用 null 填充
 * 这样所有 voice 的元素都能在同一时间轴上对齐，以便后续计算单元的长度
 */
export function sliceVoices(rawvoices: AbstractEntity[][]): SliceResult[] {
  const voiceRelates = rawvoices.map((voice) => ({
    /** 等待处理的符号数组 */
    pendings: voice,
    /** 上一个被切开的符号 */
    ongoing: null as PartialEntity | null,
    /** 当前处理的符号 */
    head: null as AbstractEntity | PartialEntity | null,
    /** 切分出的符号，后续输出 */
    sliced: null as AbstractEntity | PartialEntity | null,
  }));
  const result: SliceResult[] = [];

  while (true) {
    voiceRelates.forEach((voiceRelate) => {
      const { ongoing, pendings } = voiceRelate;
      voiceRelate.head = ongoing || pendings.shift() || null;
      // 如果 ongoing 存在，说明它是上一个 slice 的剩余部分（PartialEntity）
      // 否则一定会把 pendings 中的第一个元素取出来
      voiceRelate.sliced = null;
    });
    if (voiceRelates.every(({ head }) => head === null)) break;

    const sliceDurationUnit = voiceRelates
      .map(({ head }) => {
        if (!head) return null;
        if (head.type === 'PartialEvent') return head.remaining;
        if (head.type === 'Event') return head.duration;
        return new Fraction(0);
      })
      .filter((d): d is Fraction => !!d)
      .reduce((a, b) => (a.lt(b) ? a : b));

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
        voiceRelate.sliced = head; // 此处应该是 head 还是 null？
        return;
      }
      if (head.type === 'Tag') {
        // 只要出现 Tag，sliceDurationUnit 必为零，无需判断了
        voiceRelate.sliced = head;
        return;
      }
      if (head.type === 'Event') {
        voiceRelate.sliced = head; // 如果这个音符被切开，这里放 head 合适吗？还是应该构造一个 PartialEntity？
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
    result.push({
      duration: sliceDurationUnit,
      entities: voiceRelates.map(({ sliced }) => sliced),
    });
  }
  return result;
}
