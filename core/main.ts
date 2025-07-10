import { zip } from 'lodash-es';
import { Music } from '../types/abstract';
import { renderConfig } from './config';
import { SlicedEntity, sliceMusic } from './slice';
import { engraveSliceElementWithCfg } from './engrave/entities';
import { getBoundingBoxWithCfg } from './bounding';
import { computeSliceWidths } from './spacing';
import { LayoutTree, moveRight, notrans, RenderObject } from '../types/layout';

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

  const slicesWidths = computeSliceWidths(slices, boxesByLine, lineWidth);

  const engravedVoices = elementsByLine.map((lineElements, voiceIndex) => {
    const boxes = boxesByLine[voiceIndex];
    const spans = transformedSpans[voiceIndex]; // sliceMusic 输出的 spans
    const baseNotes = engraveBaseNotes(
      slicesWidths.map((s) => s.offsetX),
      baseLayouts[voiceIndex]
    );
    // const beams = engraveBeams(slicesOffsetX, spans, lineElements);
    // const spanLines = engraveSpans(slicesOffsetX, spans, boxes);
    // return merge([baseNotes, beams, spanLines]);
  });

  // const offsetsY = layoutVoicesVertically(engravedVoices, lineGap);
  // return {
  //   type: 'group',
  //   children: engravedVoices.map((voice, i) => moveDown(voice, offsetsY[i])),
  // };
}

function engraveBaseNotes(
  slicesOffsetX: number[],
  engravedEntities: LayoutTree<RenderObject>[]
): LayoutTree<RenderObject> {
  return {
    type: 'Node',
    transform: notrans(),
    children: engravedEntities.map((entityTree, index) => {
      const offsetX = slicesOffsetX[index];
      return {
        type: 'Node',
        transform: moveRight(offsetX),
        children: [entityTree],
      };
    }),
  };
}
