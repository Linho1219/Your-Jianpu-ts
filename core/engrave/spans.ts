import {
  BoundingBox,
  LayoutTree,
  move,
  notrans,
  scaleHrztl,
} from '../../types/layout';
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
          availableY: Math.min(
            ...heights.slice(interval.start, interval.end + 1)
          ),
        },
      ])
  );
  const children: LayoutTree<RenderObject>[] = [];
  while (spanRelates.length > 0) {
    spanRelates.sort(([_, sa], [__, sb]) => {
      return sb.availableY - sa.availableY;
    });
    const [interval, spanRelate] = spanRelates.shift()!;
    const { node, occupiedHeight, affectedInterval } = engraveSpan(
      interval,
      spanRelate.span,
      spanRelate.availableY,
      centerXs,
      boxes,
      config
    );
    children.push(node);
    if (affectedInterval) {
      spanRelates
        .getTouches(affectedInterval)
        .forEach(
          ([_, affectedSpanRelate]) =>
            (affectedSpanRelate.availableY = Math.min(
              affectedSpanRelate.availableY,
              spanRelate.availableY - occupiedHeight
            ))
        );
    }
  }
  return wrapNode(notrans(), ...children);
}

function engraveSpan(
  { start, end }: Interval,
  span: Span,
  currentY: number,
  centerXs: number[],
  boxes: BoundingBox[],
  config: RenderConfig
): SpanEngraveRelate {
  // TO-DO: 其他种类的 Span
  const startX = centerXs[start];
  const endX = centerXs[end];
  switch (span.type) {
    case 'Slur': {
      return {
        node: engraveSlur(startX, endX, currentY, config),
        occupiedHeight: config.slurHeight + config.slurPaddingBottom,
        affectedInterval: { start: start + 1, end: end - 1 },
      };
    }
    case 'Symbol': {
      const symbol = config.defReg.regAndGet(span.value);
      const { height, width: originalWidth } = symbol.metrics;
      const factor = (endX - startX) / originalWidth;
      return {
        node: wrapNode(
          {
            localPosition: [startX, currentY - config.slurPaddingBottom],
            localScale: [factor, 1.2],
          },
          {
            type: 'Leaf',
            anchor: AnchorPosition.BottomLeft,
            object: {
              type: 'symbol',
              value: span.value,
              width: originalWidth,
              height,
            },
          }
        ),
        occupiedHeight: height + config.slurPaddingBottom,
        affectedInterval: { start, end },
      };
    }
    default:
      throw new Error(`Unsupported span type: ${span.type}`);
  }
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
