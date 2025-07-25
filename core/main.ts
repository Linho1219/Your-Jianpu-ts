import { zip } from 'lodash-es';
import { Interval, IntervalMap, Music } from '../types/abstract';
import { SlicedEntity, sliceMusic } from './slice';
import { engraveSliceElementWithCfg } from './engrave/entities';
import { bboxUnion, getBoundingBox, getBoundingBoxWithCfg } from './bounding';
import { computeSliceOffsets } from './spacing';
import {
  BBox,
  BoundingBox,
  emptyBox,
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
  const { slices, slicedMusic } = sliceMusic(music);

  const engravedSlicesByVoice = slicedMusic.voices.map(({ entities }) =>
    entities.map(engraveSliceElementWithCfg(config))
  );
  const boxesByVoice = engravedSlicesByVoice.map((line) =>
    line.map(getBoundingBoxWithCfg(config))
  );
  const boxesBySlice = (zip(...boxesByVoice) as BoundingBox[][]).map((boxes) =>
    boxes.reduce(bboxUnion, null)
  );

  const offsetXsBySlice: number[] = computeSliceOffsets(
    slicedMusic,
    boxesBySlice,
    lineWidth
  );

  const engravedVoices: LayoutTree<RenderObject>[] = slicedMusic.voices.map(
    (voice, voiceIndex) => {
      const spans = voice.spans;
      const beams = voice.beams;

      const { arrangedEntityNode, entityBoxes } = arrangeBaseNotes(
        offsetXsBySlice,
        engravedSlicesByVoice[voiceIndex],
        config
      );

      const engravedBeams = engraveBeams(offsetXsBySlice, beams, config);
      const engravedSpans = engraveSpans(
        offsetXsBySlice,
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
    const [[_x1, y1], [_x2, y2]] = bbox ?? emptyBox();
    offsets.push(currentOffset + (y1 < 0 ? -y1 : 0));
    const height = y2 - y1;
    currentOffset += height;
  });
  return offsets;
}
