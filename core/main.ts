import { zip } from 'lodash-es';
import { Music } from '../types/abstract';
import { renderConfig } from './config';
import { SlicedEntity, sliceMusic } from './slice';
import { engraveSliceElementWithCfg } from './engrave/entities';
import { getBoundingBoxWithCfg } from './bounding';
import { computeSliceWidths } from './spacing';
import { LayoutTree, moveRight, notrans, RenderObject } from '../types/layout';
import { engraveBeams } from './engrave/beams';

export function engraveMusic(music: Music) {
  const { lineWidth, lineGap } = renderConfig;
  const { slices, /* transformedSpans */ } = sliceMusic(music);
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

  const slicesWithWidths = computeSliceWidths(slices, boxesByLine, lineWidth);
  const slicesOffsetX = slicesWithWidths.map((slice) => slice.offsetX);

  const engravedVoices = elementsByLine.map((lineElements, voiceIndex) => {
    const voice = music.voices[voiceIndex];
    const boxes = boxesByLine[voiceIndex];
    const spans = voice.spans;
    const baseNotes = engraveBaseNotes(slicesOffsetX, baseLayouts[voiceIndex]);
    const beams = engraveBeams(
      slicesOffsetX,
      spans,
      lineElements,
      renderConfig
    ); // finished

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
