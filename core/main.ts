import { Music } from '../types/abstract';
import { sliceMusic } from './slice';
import { engraveSliceElementWithCfg } from './engrave/entities';
import { getBoundingBox } from './bounding';
import { computeSliceOffsets } from './spacing';
import { LayoutTree, moveDown, moveRight, notrans, RenderObject } from '../types/layout';
import { engraveBeams } from './engrave/beams';
import { engraveSpans } from './engrave/spans';
import { RenderConfig } from '../types/config';
import { wrapNode } from './engrave/utils';
import { engraveAccolades, getAccoladeWidth, VoiceMetric } from './engrave/accolade';

export function engraveMusic(music: Music, config: RenderConfig): LayoutTree<RenderObject> {
  const { lineWidth } = config;
  const slicedMusic = sliceMusic(music);

  const engravedSlicesByVoice = slicedMusic.voices.map(({ entities }) =>
    entities.map(engraveSliceElementWithCfg(config))
  );

  const accoladeMargin = getAccoladeWidth(music.accolade, config);
  const offsetXsBySlice: number[] = computeSliceOffsets(
    slicedMusic,
    engravedSlicesByVoice,
    lineWidth - accoladeMargin
  ).map((offset) => offset + accoladeMargin);

  const engravedVoices: LayoutTree<RenderObject>[] = slicedMusic.voices.map((voice, voiceIndex) => {
    const spans = voice.spans;
    const beams = voice.beams;

    const slices = engravedSlicesByVoice[voiceIndex];
    const sliceNodes = slices.map((slice) => slice.node);
    const sliceMetrics = slices.map((slice) => slice.nonIntrusive);
    const arrangedEntityNode = arrangeBaseNotes(offsetXsBySlice, sliceNodes, config);
    const engravedBeams = engraveBeams(offsetXsBySlice, sliceMetrics, beams, config);
    const engravedSpans = engraveSpans(offsetXsBySlice, sliceMetrics, spans, config);
    return {
      type: 'Node',
      transform: notrans(),
      children: [arrangedEntityNode, engravedBeams, engravedSpans],
      remarks: music.voices[voiceIndex].type,
    };
  });

  const { offsetsY, voiceMetrics } = computeVoiceOffsetY(engravedVoices, config);
  const arrangedVoiceNodes = engravedVoices.map((voiceTree, index) =>
    wrapNode(moveDown(offsetsY[index]), voiceTree)
  );
  const engravedAccolade = wrapNode(
    moveRight(accoladeMargin),
    engraveAccolades(voiceMetrics, music.accolade, config)
  );
  return wrapNode(notrans(), engravedAccolade, ...arrangedVoiceNodes);
}

function arrangeBaseNotes(
  slicesOffsetX: number[],
  engravedEntities: LayoutTree<RenderObject>[],
  config: RenderConfig
) {
  // const entityBoxes: BoundingBox[] = [];
  const arrangedEntityNode = wrapNode(
    notrans(),
    ...engravedEntities.map((entityTree, index) => {
      const offsetX = slicesOffsetX[index];
      const entityNode = wrapNode(moveRight(offsetX), entityTree);
      // entityBoxes.push(getBoundingBox(entityNode, config));
      return entityNode;
    })
  );
  return arrangedEntityNode;
}

function computeVoiceOffsetY(voiceTrees: LayoutTree<RenderObject>[], config: RenderConfig) {
  const offsetsY: number[] = [];
  const voiceMetrics: VoiceMetric[] = [];
  let currentOffset = 0;

  voiceTrees.forEach((voiceTree, index) => {
    if (index) {
      if (voiceTree.remarks === 'lyric') currentOffset += config.lyricGap;
      else currentOffset += config.lineGap;
    }
    const bbox = getBoundingBox(voiceTree, config);
    const { y1, height } = bbox;
    const baseY = currentOffset + (y1 < 0 ? -y1 : 0);
    offsetsY.push(baseY);
    voiceMetrics.push({
      topY: currentOffset,
      baseY,
      bottomY: currentOffset + height,
      height,
    });
    currentOffset += height;
  });
  return { offsetsY, voiceMetrics };
}
