import Fraction from 'fraction.js';
import { PartialEntity, SlicedUnit } from './slice';
import { AbstractEntity, Entity } from '../types/abstract';

const gourlayFDefaults = {
  minDurationWidth: 1,
  magic: 0.5,
};

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
