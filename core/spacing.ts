import { SlicedMusic } from './slice';
import { BoundingBox, emptyBox, getBoxWidth } from '../types/layout';
import { zip } from 'lodash-es';

export function computeSliceOffsets(
  sliceMusic: SlicedMusic,
  boxesBySlice: BoundingBox[],
  lineWidth: number
): number[] {
  const widths = boxesBySlice.map(getBoxWidth);
  const totWidth = widths.reduce((sum, w) => sum + w, 0);
  const totSpace = lineWidth - totWidth;
  if (totSpace < 0) console.warn('Total width of slices exceeds line width');

  // 下标规则：space[k] 对应 entity[k] 和 entity[k+1] 之间的空隙

  const gapBeamCountsPerVoice = sliceMusic.voices.map((voice) => {
    const beamCounts: number[] = [];

    const beamsLeft = [...voice.beams.sort((a, b) => a.start - b.start)];
    const ongoingBeamEnds: number[] = [];
    for (
      let entityIndex = 0;
      entityIndex < voice.entities.length - 1;
      entityIndex++
    ) {
      while (beamsLeft.length && beamsLeft[0].start === entityIndex)
        ongoingBeamEnds.push(beamsLeft.shift()!.end);
      ongoingBeamEnds.sort((a, b) => a - b);
      while (ongoingBeamEnds.length && ongoingBeamEnds[0] === entityIndex)
        ongoingBeamEnds.shift();
      beamCounts.push(ongoingBeamEnds.length);
    }
    return beamCounts;
  });
  const sliceGapBeamCounts = zip(...gapBeamCountsPerVoice) as number[][];
  const gapWeights = sliceGapBeamCounts.map(getWeightsFromBeamCounts);
  sliceMusic.voices[0].entities.forEach((entity, index) => {
    if (!entity || entity.type === 'Tag') {
      // 前后都没有实体的 gap 不需要间隔
      gapWeights[index] = 0;
      if (index) gapWeights[index - 1] = 0;
    }
  });
  const totalGapWeight = gapWeights.reduce((sum, w) => sum + w, 0);
  const gapUnit = totSpace / totalGapWeight;
  const gaps = gapWeights.map((weight) => weight * gapUnit);
  let currX = 0;
  const offsets = boxesBySlice.map((box, index) => {
    const [[x1, _y1], [x2, _y2]] = box ?? emptyBox();
    const width = x2 - x1;
    const offsetX = currX - x1;
    currX += width + gaps[index];
    return offsetX;
  });
  return offsets;
}

function getWeightsFromBeamCounts(counts: number[]): number {
  const maxCount = Math.max(...counts);
  if (maxCount === 0) return 5; // 没有减时线的
  if (maxCount === 1) return 3; // 有减时线的
  return 2; // 有减时线的
}
