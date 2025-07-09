import Fraction from 'fraction.js';
import { PartialEntity, SlicedUnit } from './slice';
import { AbstractEntity, Entity } from '../types/abstract';

const gourlayFDefaults = {
  minDurationWidth: 1,
  magic: 0.5,
} as GourlayFDefaults;

function getSmallestDuration(unit: SlicedUnit): Fraction {
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
  minDurationWidth: number;
  magic: number;
}
interface GourlayFInputs extends GourlayFDefaults {
  smallestDuration: Fraction;
  sliceDuration: Fraction;
}

function gourlayF(inputs: GourlayFInputs): number {
  const { minDurationWidth, magic, smallestDuration, sliceDuration } = inputs;
  const durationRatio = smallestDuration.div(sliceDuration).valueOf();
  return 1 / (minDurationWidth * (1 + magic * Math.log2(durationRatio)));
}

function getSliceStiffness(unit: SlicedUnit): number {
  const smallestDuration = getSmallestDuration(unit);
  const sliceDuration = unit.duration;
  if (smallestDuration.equals(0) || sliceDuration.equals(0)) return 0; // 避免除以 0

  const inputs: GourlayFInputs = {
    ...gourlayFDefaults,
    smallestDuration,
    sliceDuration,
  };

  return gourlayF(inputs);
}

/** 弹簧-硬杆模型，SWR */
interface SpringWithRod {
  /** 最短长度 */
  rodLength: number;
  /** 弹性系数 */
  stiffness: number;
}

/**
 * 计算弹簧系统从其最小长度拉伸到目标长度 targetLength 所需的合力
 * @param springs 弹簧结构
 * @param targetLength 目标长度
 * @returns 拉力
 */
export function calculateSpringForce(
  springs: SpringWithRod[],
  targetLength: number
): number {
  const totalRodLength = springs.reduce((sum, swr) => sum + swr.rodLength, 0);
  if (targetLength <= totalRodLength) return 0;
  if (!springs.length) throw new Error('Springs array cannot be empty');

  let processedRodLength = 0;
  let reciprocalSum = 0;
  let currentForce = 0;

  for (const currentSpring of springs) {
    const { rodLength, stiffness } = currentSpring;
    processedRodLength += rodLength;
    reciprocalSum += 1 / stiffness;
    currentForce = (1 / reciprocalSum) * processedRodLength;
    const maxForce = rodLength * stiffness;
    if (currentForce <= maxForce) break;
  }

  return currentForce;
}

function computeSliceWidths(
  slices: SlicedUnit[],
  targetWidth: number
): number[] {
  const springs = slices.map((unit) => ({
    rodLength: 1, // 后续可能修改？
    stiffness: getSliceStiffness(unit),
  }));
  const totalForce = calculateSpringForce(springs, targetWidth);
  return springs.map(({ stiffness }) => totalForce / stiffness);
}

