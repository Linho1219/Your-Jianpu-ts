import { zip } from 'lodash-es';
import { IntervalMap, Music } from '../types/abstract';
import { SlicedEntity, sliceMusic } from './slice';
import { engraveSliceElementWithCfg } from './engrave/entities';
import { getBoundingBox, getBoundingBoxWithCfg } from './bounding';
import { computeSliceWidths } from './spacing';
import {
  BBox,
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
import { wrapNode } from './engrave/utils';

export function engraveMusic(
  music: Music,
  config: RenderConfig
): LayoutTree<RenderObject> {
  const { lineWidth } = config;
  const { slices } = sliceMusic(music);

  const elementsByLine = zip(
    ...slices.map((slice) => slice.entities)
  ) as SlicedEntity[][];
  /** original -> slice */
  const indexMaps: Map<number, number>[] = music.voices.map(
    ({ entities: originalEntities }, index) => {
      const sliceLine = elementsByLine[index];
      const old2new = new Map<number, number>();
      let newIndex = 0;
      originalEntities.forEach((originalEntity, originalIndex) => {
        while (
          newIndex < sliceLine.length &&
          sliceLine[newIndex] !== originalEntity
        )
          newIndex++;
        if (newIndex >= sliceLine.length)
          throw new Error('Invalid index mapping');
        old2new.set(originalIndex, newIndex);
        newIndex++;
      });
      return old2new;
    }
  );
  const throwErr = (msg: string): never => {
    throw new Error(msg);
  };
  const mappedSpans = music.voices.map(({ spans }, voiceIndex) =>
    IntervalMap.fromRecords(
      spans.entries().map(([interval, span]) => [
        {
          start:
            indexMaps[voiceIndex].get(interval.start) ??
            throwErr('Invalid start index ' + interval.start),
          end:
            indexMaps[voiceIndex].get(interval.end) ??
            throwErr('Invalid end index ' + interval.end),
        },
        span,
      ])
    )
  );

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
      const spans = mappedSpans[voiceIndex];
      const { arrangedEntityNode, entityBoxes } = arrangeBaseNotes(
        slicesOffsetX,
        engravedElementsByLine[voiceIndex],
        config
      );

      const engravedBeams = engraveBeams(slicesOffsetX, spans, config);
      const engravedSpans = engraveSpans(
        slicesOffsetX,
        entityBoxes,
        spans,
        config
      );
      return {
        type: 'Node',
        transform: notrans(),
        children: [arrangedEntityNode, engravedBeams, engravedSpans],
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

function arrangeBaseNotes(
  slicesOffsetX: number[],
  engravedEntities: LayoutTree<RenderObject>[],
  config: RenderConfig
) {
  const entityBoxes: BoundingBox[] = [];
  const arrangedEntityNode = wrapNode(
    notrans(),
    ...engravedEntities.map((entityTree, index) => {
      const offsetX = slicesOffsetX[index];
      const entityNode = wrapNode(moveRight(offsetX), entityTree);
      entityBoxes.push(getBoundingBox(entityNode, config));
      return entityNode;
    })
  );
  return { entityBoxes, arrangedEntityNode };
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
