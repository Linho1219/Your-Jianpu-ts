import { zip } from 'lodash-es';
import { Music } from '../types/abstract';
import { renderConfig } from './config';
import { SlicedEntity, sliceMusic } from './slice';
import { engraveSliceElementWithCfg } from './engrave/entities';

export function engraveMusic(music: Music) {
  const { lineWidth, lineGap } = renderConfig;
  const { slices, transformedSpans } = sliceMusic(music);

  const elementsByLine = zip(
    ...slices.map((slice) => slice.entities)
  ) as SlicedEntity[][];
  const baseLayouts = elementsByLine.map((line) =>
    line.map(engraveSliceElementWithCfg(renderConfig))
  );
}
