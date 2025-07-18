import { zip } from 'lodash-es';
import { Music } from '../types/abstract';
import { SlicedEntity, sliceMusic } from './slice';
import { engraveSliceElementWithCfg } from './engrave/entities';
import { getBoundingBox, getBoundingBoxWithCfg } from './bounding';
import { computeSliceWidths } from './spacing';
import {
  BoundingBox,
  LayoutTree,
  moveDown,
  moveRight,
  notrans,
  RenderObject,
} from '../types/layout';
import { engraveBeams } from './engrave/beams';
import { engraveSpans } from './engrave/spans';
import { RenderConfig } from '../types/config';

export function engraveMusic(
  music: Music,
  config: RenderConfig
): LayoutTree<RenderObject> {
  const { lineWidth } = config;
  const { slices } = sliceMusic(music);

  const elementsByLine = zip(
    ...slices.map((slice) => slice.entities)
  ) as SlicedEntity[][];

  const engravedElementsByLine = elementsByLine.map((line) =>
    line.map(engraveSliceElementWithCfg(config))
  );

  const boxesByLine = engravedElementsByLine.map((line) =>
    line.map(getBoundingBoxWithCfg(config))
  );
  const boxesBySlice = zip(...boxesByLine) as BoundingBox[][];

  const slicesWithWidths = computeSliceWidths(slices, boxesBySlice, lineWidth);
  const slicesOffsetX = slicesWithWidths.map((slice) => slice.offsetX);

  const engravedVoices: LayoutTree<RenderObject>[] = elementsByLine.map(
    (lineElements, voiceIndex) => {
      const voice = music.voices[voiceIndex];
      const spans = voice.spans;
      const engravedEntities = engraveBaseNotes(
        slicesOffsetX,
        engravedElementsByLine[voiceIndex]
      );

      /** 下标归一化，index 均为仅 Event 的编号 */
      const filteredOffset = slicesOffsetX.filter((_, index) => {
        const ele = lineElements[index];
        return !!ele && ele.type === 'Event';
      });
      const engravedBeams = engraveBeams(filteredOffset, spans, config); // finished
      const engravedSpans = engraveSpans(slicesOffsetX, spans, config);
      return {
        type: 'Node',
        transform: notrans(),
        children: [engravedEntities, engravedBeams, engravedSpans],
        remarks: music.voices[voiceIndex].type,
      };
    }
  );

  const offsetsY = layoutVoicesVertically(engravedVoices, config);
  return {
    type: 'Node',
    transform: notrans(),
    children: engravedVoices.map((voice, i) => ({
      type: 'Node',
      transform: moveDown(offsetsY[i]),
      children: [voice],
    })),
  };
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

function layoutVoicesVertically(
  voiceTrees: LayoutTree<RenderObject>[],
  config: RenderConfig
): number[] {
  const offsets: number[] = [];
  let currentOffset = 0;

  voiceTrees.forEach((voiceTree, index) => {
    if (index) {
      if (voiceTree.remarks === 'lyric') currentOffset += config.lyricGap;
      else currentOffset += config.lineGap;
    }
    const bbox = getBoundingBox(voiceTree, config);
    const [[_x1, y1], [_x2, y2]] = bbox ?? [
      [0, 0],
      [0, 0],
    ];
    offsets.push(currentOffset + (y1 < 0 ? -y1 : 0));
    const height = y2 - y1;
    currentOffset += height;
  });
  return offsets;
}
