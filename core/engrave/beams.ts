import { Interval, Spans } from '../../types/abstract';
import { RenderConfig } from '../../types/config';
import { AnchorPosition, LayoutTree, move, notrans, RenderObject } from '../../types/layout';
import { EntityNonIntrusive } from './entities';

export function engraveBeams(
  offsets: number[],
  nonIntrusives: EntityNonIntrusive[],
  beamIntvls: Interval[],
  config: RenderConfig,
): LayoutTree<RenderObject> {
  const { beamGap, beamHeight, glyphWidth } = config;
  /** 当前存在的 beam 的结束位置，栈结构 */
  const currBeamEnds: number[] = [];
  const beams = beamIntvls
    .sort(({ start: a }, { start: b }) => a - b) // 按照开始位置升序
    .map((interval) => {
      while (currBeamEnds.length && currBeamEnds.at(-1)! < interval.start) currBeamEnds.pop();
      currBeamEnds.push(interval.end);
      return {
        interval,
        /** 层级，从0开始 */
        level: currBeamEnds.length - 1,
      };
    });

  const beamRects: LayoutTree<RenderObject>[] = beams.map(({ interval, level }) => {
    const startX = offsets[interval.start] + nonIntrusives[interval.start].bottomLeftX;
    const endX = offsets[interval.end] + nonIntrusives[interval.end].bottomRightX;
    const width = endX - startX;
    const offsetY = beamGap + level * (beamGap + beamHeight);
    return {
      type: 'Node',
      transform: move(startX, offsetY),
      children: [
        {
          type: 'Leaf',
          anchor: AnchorPosition.TopLeft,
          object: {
            type: 'rectangle',
            width,
            height: beamHeight,
          },
        },
      ],
    };
  });

  return {
    type: 'Node',
    transform: notrans(),
    children: beamRects,
  };
}
