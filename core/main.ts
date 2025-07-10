import { zip } from 'lodash-es';
import { Music } from '../types/abstract';
import { renderConfig } from './config';
import { SlicedEntity, sliceMusic } from './slice';
import { engraveSliceElementWithCfg } from './engrave/entities';
import { getBoundingBoxWithCfg } from './bounding';
import { computeSliceWidths } from './spacing';
import { LayoutTree, moveRight, notrans, RenderObject } from '../types/layout';
import { engraveBeams } from './engrave/beams';
import { engraveSpans } from './engrave/spans';

export function engraveMusic(music: Music) {
  const { lineWidth, lineGap } = renderConfig;
  const { slices } = sliceMusic(music);

  const elementsByLine = zip(
    ...slices.map((slice) => slice.entities)
  ) as SlicedEntity[][];

  const baseLayouts = elementsByLine.map((line) =>
    line.map(engraveSliceElementWithCfg(renderConfig))
  );

  const boxesByLine = baseLayouts.map((line) =>
    line.map(getBoundingBoxWithCfg(renderConfig))
  );

  const slicesWithWidths = computeSliceWidths(slices, boxesByLine, lineWidth);
  const slicesOffsetX = slicesWithWidths.map((slice) => slice.offsetX);

  const engravedVoices = elementsByLine.map((lineElements, voiceIndex) => {
    const voice = music.voices[voiceIndex];
    const boxes = boxesByLine[voiceIndex];
    const spans = voice.spans;
    const engravedEntities = engraveBaseNotes(
      slicesOffsetX,
      baseLayouts[voiceIndex]
    );

    /** 下标归一化，index 均为仅 Event 的编号 */
    const filteredOffset = slicesOffsetX.filter((_, index) => {
      const ele = lineElements[index];
      return !!ele && ele.type === 'Event';
    });
    const engravedBeams = engraveBeams(filteredOffset, spans, renderConfig); // finished
    const engravedSpans = engraveSpans(slicesOffsetX, spans, renderConfig);
    return {
      type: 'Node',
      transform: notrans(),
      children: [engravedEntities, engravedBeams, engravedSpans],
    };
  });

  // const offsetsY = layoutVoicesVertically(engravedVoices, lineGap);
  // return {
  //   type: 'Node',
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
