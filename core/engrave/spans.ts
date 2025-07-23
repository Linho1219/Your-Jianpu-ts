import { BoundingBox, LayoutTree, move, notrans } from '../../types/layout';
import { RenderConfig } from '../../types/config';
import { RenderObject, AnchorPosition } from '../../types/layout';
import { Interval, IntervalMap, Span, Spans } from '../../types/abstract';
import { wrapNode } from './utils';

interface SpanEngraveRelate {
  node: LayoutTree<RenderObject>;
  occupiedHeight: number;
  affectedInterval?: Interval;
}

export function engraveSpans(
  centerXs: number[],
  boxes: BoundingBox[],
  spans: Spans,
  config: RenderConfig
) {
  const heights = boxes.map((box) => {
    if (!box) return 0;
    const [[_, y1]] = box;
    return y1;
  });
  const spanRelates = IntervalMap.fromRecords(
    spans
      .entries()
      .filter(([_, span]) => span.type !== 'Beam')
      .map(([interval, span]) => [
        interval,
        {
          span,
          height: Math.min(...heights.slice(interval.start, interval.end + 1)),
        },
      ])
  );
  const children: LayoutTree<RenderObject>[] = [];
  while (spanRelates.length > 0) {
    spanRelates.sort(([_, sa], [__, sb]) => {
      return sa.height - sb.height;
    });
    const [interval, spanRelate] = spanRelates.shift()!;
    const { node, occupiedHeight, affectedInterval } = engraveSpan(
      interval,
      spanRelate.span,
      spanRelate.height,
      centerXs,
      boxes,
      config
    );
    children.push(node);
    spanRelates
      .getTouches(affectedInterval ?? interval)
      .forEach(([_, spanRelate]) => (spanRelate.height -= occupiedHeight));
  }
  return wrapNode(notrans(), ...children);
}

function engraveSpan(
  { start, end }: Interval,
  span: Span,
  height: number,
  centerXs: number[],
  boxes: BoundingBox[],
  config: RenderConfig
): SpanEngraveRelate {
  // TO-DO: 其他种类的 Span
  const startX = centerXs[start];
  const endX = centerXs[end];
  return {
    node: engraveSlur(startX, endX, height, config),
    occupiedHeight: config.slurHeight + config.slurPaddingBottom,
    affectedInterval: { start: start + 1, end: end - 1 },
  };
}

function engraveSlur(
  startX: number,
  endX: number,
  height: number,
  config: RenderConfig
): LayoutTree<RenderObject> {
  const { slurHeight, slurPaddingX, slurPaddingBottom } = config;
  const width = endX - startX;

  return {
    type: 'Node',
    transform: move(startX + slurPaddingX, height - slurPaddingBottom),
    children: [
      {
        type: 'Leaf',
        anchor: AnchorPosition.BottomLeft,
        object: {
          type: 'curve',
          width,
          height: slurHeight,
        },
      },
    ],
  };
}
