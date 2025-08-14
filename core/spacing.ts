import { SlicedMusic } from './slice';
import { BoundingBox, emptyBox, getBoxWidth } from '../types/layout';
import { zip } from 'lodash-es';
import { NodeWithNonIntrusive } from './engrave/entities';

const tagWeight = 2;
function getWeightsFromBeamCounts(counts: number[]): number {
  const maxCount = Math.max(...counts);
  if (maxCount === 0) return 2; // 没有减时线的
  return 1;
}

export function computeSliceOffsets(
  sliceMusic: SlicedMusic,
  nodesByVoice: NodeWithNonIntrusive[][],
  lineWidth: number
): number[] {
  const nodesBySlice = zip(...nodesByVoice) as NodeWithNonIntrusive[][];
  const sliceMetrics = nodesBySlice.map((nodes) => {
    const leftMost = Math.min(...nodes.map((node) => node.nonIntrusive.bottomLeftX));
    const rightMost = Math.max(...nodes.map((node) => node.nonIntrusive.bottomRightX));
    const fullLefts = nodes.map((node) => node.nonIntrusive.box[0][0]);
    const fullRights = nodes.map((node) => node.nonIntrusive.box[1][0]);
    const width = rightMost - leftMost;
    return { leftMost, rightMost, width, fullLefts, fullRights };
  });

  const totWidth = sliceMetrics.reduce((sum, m) => sum + m.width, 0);
  const totalSpace = lineWidth - totWidth;
  if (totalSpace < 0) console.warn('Total width of slices exceeds line width');

  // 下标规则：space[k] 对应 entity[k] 和 entity[k+1] 之间的空隙

  const minGapWidths: number[] = [];
  for (let entityIndex = 0; entityIndex < sliceMetrics.length - 1; entityIndex++) {
    const currSliceRights = sliceMetrics[entityIndex].fullRights;
    const nextSliceLefts = sliceMetrics[entityIndex + 1].fullLefts;
    const minGapWidth = Math.max(
      ...nextSliceLefts.map((left, voiceIndex) => {
        const right = currSliceRights[voiceIndex];
        return left - right;
      })
    );
    minGapWidths.push(minGapWidth);
  }

  const gapBeamCountsPerVoice = sliceMusic.voices.map((voice) => {
    const beamCounts: number[] = [];
    const beamsLeft = [...voice.beams.sort((a, b) => a.start - b.start)];
    const ongoingBeamEnds: number[] = [];
    for (let entityIndex = 0; entityIndex < voice.entities.length - 1; entityIndex++) {
      while (beamsLeft.length && beamsLeft[0].start === entityIndex)
        ongoingBeamEnds.push(beamsLeft.shift()!.end);
      ongoingBeamEnds.sort((a, b) => a - b);
      while (ongoingBeamEnds.length && ongoingBeamEnds[0] === entityIndex) ongoingBeamEnds.shift();
      beamCounts.push(ongoingBeamEnds.length);
    }
    return beamCounts;
  });
  const sliceGapBeamCounts = zip(...gapBeamCountsPerVoice) as number[][];
  const gapWeights = sliceGapBeamCounts.map(getWeightsFromBeamCounts);
  sliceMusic.voices[0].entities.forEach((entity, index) => {
    if (!entity || entity.type === 'Tag') {
      gapWeights[index] = tagWeight;
      if (index) gapWeights[index - 1] = tagWeight;
    }
  });

  const minGapUnits = minGapWidths
    .map((minWidth, gapIndex) => {
      const weight = gapWeights[gapIndex] || 1;
      return {
        index: gapIndex,
        unit: minWidth / weight,
      };
    })
    .sort((a, b) => a.unit - b.unit);

  const totalGapWeight = gapWeights.reduce((sum, w) => sum + w, 0);

  let accountingWeight = totalGapWeight;
  let accountingSpace = totalSpace;
  const getGapUnit = () => accountingSpace / accountingWeight;
  const gapsTouchingMinWidths = new Set<number>();
  while (minGapUnits.some((gap) => gap.unit > getGapUnit())) {
    const gap = minGapUnits.shift()!;
    gapsTouchingMinWidths.add(gap.index);
  }
  const gapUnit = getGapUnit();

  const gaps = gapWeights.map((weight, index) =>
    gapsTouchingMinWidths.has(index) ? minGapWidths[index] : weight * gapUnit
  );
  let currX = 0;
  const offsets = sliceMetrics.map((slice, index) => {
    const { width, leftMost } = slice;
    const offsetX = currX - leftMost;
    currX += width + gaps[index];
    return offsetX;
  });
  return offsets;
}
