import Fraction from 'fraction.js';
import { SlicedEntity, SlicedUnit } from './slice';

const gourlayFDefaults = {
  minDurationWidth: 1,
  magic: 0.5,
} as GourlayFDefaults;

function getShortestEntityDurationWithinSlice(unit: SlicedUnit): Fraction {
  const entities = unit.entities.filter(
    (e) => !!e && (e.type === 'Event' || e.type === 'PartialEvent')
  );
  if (entities.length === 0) return new Fraction(0); // 全为 Tag
  const durations = entities.map((e) =>
    e.type === 'Event' ? e.duration : e.total
  );
  return durations.reduce((a, b) => (a.lt(b) ? a : b));
}

interface GourlayFDefaults {
  /** 单位宽度 */
  minDurationWidth: number;
  /** 用于微调布局的 magic number */
  magic: number;
}
interface GourlayFInputs extends GourlayFDefaults {
  /** 一个 Slice 中最短音符的时值 */
  shortestEntityDurationWithinSlice: Fraction;
  /** 一个行中最短 Slice 的时值 */
  shortestSliceDuration: Fraction;
}

/** Gourlay's 计算弹性系数 */
function gourlayF(inputs: GourlayFInputs): number {
  const {
    minDurationWidth,
    magic,
    shortestEntityDurationWithinSlice,
    shortestSliceDuration,
  } = inputs;
  const durationRatio = shortestEntityDurationWithinSlice
    .div(shortestSliceDuration)
    .valueOf();
  return 1 / (minDurationWidth * (1 + magic * Math.log2(durationRatio)));
}

function getSliceStiffness(
  unit: SlicedUnit,
  minSliceDuration: Fraction
): number {
  const smallestDurationWithinSlice =
    getShortestEntityDurationWithinSlice(unit);
  const sliceDuration = unit.duration;
  if (smallestDurationWithinSlice.equals(0) || sliceDuration.equals(0))
    return Infinity;
  // 对于 Tag，不存在弹性，不可拉伸，即硬度为无穷大。后续可能改动此值
  const inputs: GourlayFInputs = {
    ...gourlayFDefaults,
    shortestEntityDurationWithinSlice: smallestDurationWithinSlice,
    shortestSliceDuration: minSliceDuration,
  };
  return gourlayF(inputs);
}

/** 弹簧模型，F=k·Δx */
interface Spring {
  /** 原长度 */
  restLength: number;
  /** 弹性系数，硬度，越大越难拉伸 */
  stiffness: number;
}

/**
 * 计算弹簧系统从其最小长度拉伸(压缩)到目标长度 targetLength 所需的合力
 * @param springs 弹簧结构
 * @param targetLength 目标长度
 * @returns 拉力
 */
export function computeSystemForce(
  springs: Spring[],
  targetLength: number
): number {
  if (!springs.length) throw new Error('Springs array cannot be empty');
  const totaloriginalLen = springs.reduce(
    (sum, swr) => sum + swr.restLength,
    0
  );
  const totalDeformation = targetLength - totaloriginalLen; // 正数表示拉伸，负数表示压缩
  const totalStiffness =
    1 / springs.reduce((sum, swr) => sum + 1 / swr.stiffness, 0);
  return totalDeformation / totalStiffness;
}

export interface SlicedUnitWithWidth extends SlicedUnit {
  width: number;
}

export function computeSliceWidths(
  slices: SlicedUnit[],
  targetWidth: number
): SlicedUnitWithWidth[] {
  const minSliceDuration = slices.reduce(
    (min, unit) => (min.lt(unit.duration) ? min : unit.duration),
    new Fraction(Infinity)
  );
  const springs: Spring[] = slices.map((unit) => ({
    restLength: 1, // 后续可能修改？
    stiffness: getSliceStiffness(unit, minSliceDuration),
  }));
  const totalForce = computeSystemForce(springs, targetWidth);
  return slices.map((unit, index) => {
    const { stiffness, restLength } = springs[index];
    return {
      ...unit,
      width: restLength + totalForce / stiffness,
    };
  });
}

function areEntitiesNeighbour(
  entityA: SlicedEntity,
  entityB: SlicedEntity
): boolean {
  if (!entityA || !entityB) return false;
  if (entityA.type === 'Tag' || entityB.type === 'Tag') return false;
  const getDuration = (e: typeof entityA) =>
    e.type === 'Event' ? e.duration : e.total;
  return getDuration(entityA).equals(getDuration(entityB));
}

function areSlicesNeighbour(unitA: SlicedUnit, unitB: SlicedUnit): boolean {
  return unitA.entities.some((entityA, i) => {
    const entityB = unitB.entities[i];
    return areEntitiesNeighbour(entityA, entityB);
  });
}

export function groupByNeighbours(
  slices: SlicedUnitWithWidth[]
): SlicedUnitWithWidth[][] {
  if (slices.length === 0) return [];

  const result: SlicedUnitWithWidth[][] = [];
  let currentGroup: SlicedUnitWithWidth[] = [slices[0]];

  for (let i = 1; i < slices.length; i++) {
    const prev = slices[i - 1];
    const curr = slices[i];
    if (areSlicesNeighbour(prev, curr)) {
      currentGroup.push(curr);
    } else {
      result.push(currentGroup);
      currentGroup = [curr];
    }
  }
  result.push(currentGroup);
  return result;
}
