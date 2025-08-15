import { LayoutTree, move, notrans, scaleHrztl } from '../../types/layout';
import { RenderConfig } from '../../types/config';
import { RenderObject, AnchorPosition } from '../../types/layout';
import { Interval, IntervalMap, Span, Spans } from '../../types/abstract';
import { engraveNumber, wrapNode } from './utils';
import { EntityNonIntrusive } from './entities';

interface SpanEngraveRelate {
  node: LayoutTree<RenderObject>;
  occupiedHeight: number;
  affectedInterval?: Interval;
}

export function engraveSpans(
  centerXs: number[],
  metrics: EntityNonIntrusive[],
  spans: Spans,
  config: RenderConfig
) {
  const heights = metrics.map((metric) => metric.topY);
  const spanRelates = IntervalMap.fromRecords(
    spans.entries().map(([interval, span]) => [
      interval,
      {
        span,
        availableY: Math.min(...heights.slice(interval.start, interval.end + 1)),
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
      metrics,
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
  metrics: EntityNonIntrusive[],
  config: RenderConfig
): SpanEngraveRelate {
  // TO-DO: 其他种类的 Span
  const startX = centerXs[start];
  const endX = centerXs[end];
  switch (span.type) {
    case 'Slur':
    case 'Tie':
      return {
        node: engraveSlur(startX, endX, currentY, config),
        occupiedHeight: config.slurHeight + config.slurPaddingBottom,
        affectedInterval: { start: start + 1, end: end - 1 },
      };
    case 'Tuplet': {
      const textSideMargin = config.smuflSize * 0.1;
      const engravedText = engraveNumber(span.value, 'tuplet', config, AnchorPosition.Centre);
      const { width: textWidth, height: textHeight } = engravedText.metrics;
      const backgroundRect: LayoutTree<RenderObject> = {
        type: 'Leaf',
        anchor: AnchorPosition.Centre,
        object: {
          type: 'rectangle',
          width: textWidth + textSideMargin * 2,
          height: textHeight,
          fill: 'white',
        },
      };
      const textWithBg = wrapNode(
        move((startX + endX) / 2, currentY - config.slurPaddingBottom - config.slurHeight),
        backgroundRect,
        engravedText.node
      );
      return {
        node: wrapNode(notrans(), engraveSlur(startX, endX, currentY, config), textWithBg),
        occupiedHeight: textHeight / 2 + config.slurHeight + config.slurPaddingBottom,
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
