import { zip } from 'lodash-es';
import { Music } from '../types/abstract';
import { renderConfig } from './config';
import { SlicedEntity, sliceMusic } from './slice';
import { engraveSliceElementWithCfg } from './engrave/entities';
import { getBoundingBoxWithCfg } from './bounding';

export function engraveMusic(music: Music) {
  const { lineWidth, lineGap } = renderConfig;
  const { slices, transformedSpans } = sliceMusic(music);
  // const elementsByLine = transpose(slices.map(slice => slice.entities));
  const elementsByLine = zip(
    ...slices.map((slice) => slice.entities)
  ) as SlicedEntity[][]; // finished

  const baseLayouts = elementsByLine.map((line) =>
    line.map(engraveSliceElementWithCfg(renderConfig))
  ); // finished

  const boxesByLine = baseLayouts.map((line) =>
    line.map(getBoundingBoxWithCfg(renderConfig))
  ); // finished

  // const sliceWidths = computeSliceWidths(slices, totalWidth); // spacing.ts 的输出
  // const slicesOffsetX = cumulativeSum(sliceWidths.map((w) => w.width));

  // const engravedVoices = elementsByLine.map((lineElements, voiceIndex) => {
  //   const boxes = boxesByLine[voiceIndex];
  //   const spans = spanGroups[voiceIndex]; // sliceMusic 输出的 spans
  //   const baseNotes = engraveBaseNotes(slicesOffsetX, lineElements);
  //   const beams = engraveBeams(slicesOffsetX, spans, lineElements);
  //   const spanLines = engraveSpans(slicesOffsetX, spans, boxes);
  //   return merge([baseNotes, beams, spanLines]);
  // });

  // const offsetsY = layoutVoicesVertically(engravedVoices, lineGap);
  // return {
  //   type: 'group',
  //   children: engravedVoices.map((voice, i) => moveDown(voice, offsetsY[i])),
  // };
}
