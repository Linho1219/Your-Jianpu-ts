import Fraction from 'fraction.js';
import { SlicedEntity, SlicedUnit } from './slice';
import { BoundingBox } from '../types/layout';
import { zip } from 'lodash-es';

const gourlayFDefaults = {
  minDurationWidth: 1,
  magic: 1,
} as GourlayFDefaults;

const MAGICMAX = new Fraction(998244353);

//#region 类型与工具定义

interface GourlayFDefaults {
  /** 用于微调布局的 magic number */
  magic: number;
  /** 单位宽度 */
  minDurationWidth: number;
}

interface GourlayFInputs extends GourlayFDefaults {
  /** 一个 Slice 中最短音符的时值 */
  shortestEntityDurationWithinSlice: Fraction;

  /** 一个行中最短 Slice 的时值 */
  shortestSliceDuration: Fraction;

  /** 当前 Slice 的时值 */
  sliceDuration: Fraction;
}

/** 弹簧模型，F=k·Δx */
interface Spring {
  /** 原长度 */
  restLength: number;

  /** 弹性系数，硬度，越大越难拉伸 */
  stiffness: number;
}

export interface SlicedUnitWithWidth extends SlicedUnit {
  width: number;
  offsetX: number;
}

const getBoxWidth = (box: BoundingBox): number => {
  if (!box) return 0;
  const [[x1, _y1], [x2, _y2]] = box;
  return x2 - x1;
};

const noNeg = (num: number) => (num > 0 ? num : 0);

//#endregion

//#region 将 Slice 映射为弹簧模型

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

function getSliceStiffness(
  unit: SlicedUnit,
  shortestSliceDuration: Fraction
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
    shortestSliceDuration,
    sliceDuration,
  };
  return gourlayF(inputs);
}

/** Gourlay's 计算弹性系数 */
function gourlayF(inputs: GourlayFInputs): number {
  const {
    minDurationWidth,
    magic,
    shortestEntityDurationWithinSlice,
    shortestSliceDuration,
    sliceDuration,
  } = inputs;
  const ratio1 = shortestEntityDurationWithinSlice
    .div(shortestSliceDuration)
    .valueOf();
  const ratio2 = shortestEntityDurationWithinSlice.div(sliceDuration).valueOf();
  return ratio2 / (minDurationWidth * (1 + magic * Math.log2(ratio1)));
}

//#endregion

//#region 计算分片宽度

/** 计算弹簧系统从其最小长度拉伸(压缩)到目标长度 targetLength 所需的合力 */
function computeSystemForce(springs: Spring[], targetLength: number): number {
  if (!springs.length) throw new Error('Springs array cannot be empty');
  const totaloriginalLen = springs.reduce(
    (sum, swr) => sum + swr.restLength,
    0
  );
  const totalDeformation = targetLength - totaloriginalLen; // 正数表示拉伸，负数表示压缩
  const totalStiffness =
    1 / springs.reduce((sum, swr) => sum + 1 / swr.stiffness, 0);
  return totalDeformation * totalStiffness;
}

export function computeSliceWidths(
  slices: SlicedUnit[],
  boxesBySlice: BoundingBox[][],
  targetWidth: number
): SlicedUnitWithWidth[] {
  const shortestSliceDuration = slices.reduce(
    (min, unit) =>
      min.gt(unit.duration) && unit.duration.gt(0) ? unit.duration : min,
    new Fraction(MAGICMAX)
  );
  const negXs = boxesBySlice.map((boxesOfSlice) => {
    return Math.max(
      ...boxesOfSlice.map((box) => {
        if (!box) return 0;
        const [[x1, _y1], [_x2, _y2]] = box;
        return x1 < 0 ? -x1 : 0;
      })
    );
  });
  const posXs = boxesBySlice.map((boxesOfSlice) =>
    Math.max(
      ...boxesOfSlice.map((box) => {
        if (!box) return 0;
        const [[_x1, _y1], [_x2, _y2]] = box;
        return _x2 > 0 ? _x2 : 0;
      })
    )
  );
  const restLengths = posXs.map((posX, index) => {
    const nextNegX = negXs[index + 1] ?? negXs[0];
    return posX + nextNegX;
  });
  console.log(restLengths);
  const springs: Spring[] = slices.map((unit, index) => ({
    restLength: restLengths[index],
    stiffness: getSliceStiffness(unit, shortestSliceDuration),
  }));

  const totalForce = computeSystemForce(springs, targetWidth);

  let [offsetX] = negXs;
  return slices.map((unit, index) => {
    const { stiffness, restLength } = springs[index];
    const width = noNeg(restLength + totalForce / stiffness);
    const slice = {
      ...unit,
      width,
      offsetX,
    };
    offsetX += width;
    return slice as SlicedUnitWithWidth;
  });
}

//#endregion

//#region 相邻相同时值 Slice 分组

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

export function groupByNeighbours(slices: SlicedUnit[]): SlicedUnit[][] {
  if (slices.length === 0) return [];

  const result: SlicedUnit[][] = [];
  let currentGroup: SlicedUnit[] = [slices[0]];

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

//#endregion
