import { LayoutTree, move, notrans } from '../../types/layout';
import { RenderConfig } from '../../types/config';
import { RenderObject, AnchorPosition } from '../../types/layout';
import { Span, Spans } from '../../types/abstract';

function getHeightHelper(currHeight = 0) {
  interface HeightRecord {
    end: number;
    height: number;
  }
  let heightRecords: HeightRecord[] = [];
  function renewHeight(index: number) {
    currHeight -= heightRecords
      .filter(({ end }) => end < index)
      .reduce((sum, { height }) => sum + height, 0);
    heightRecords = heightRecords.filter(({ end }) => end >= index);
    return currHeight;
  }
  function addHeight(height: number, end: number) {
    currHeight += height;
    heightRecords.push({ end, height });
  }
  return {
    renewHeight,
    addHeight,
  };
}

export function engraveSpans(
  filteredOffset: number[],
  spans: Spans,
  config: RenderConfig
): LayoutTree<RenderObject> {
  const { glyphWidth } = config;
  const heightHelper = getHeightHelper();
  const engravedSpansArr = spans
    .entries()
    .filter(([_, span]) => span.type !== 'Beam')
    .sort(([{ start: a }], [{ start: b }]) => a - b) // 按照开始位置升序
    .map(([interval, span]) => ({ interval, span }))
    .map(({ interval, span }) => {
      const currHeight = heightHelper.renewHeight(interval.start);
      const startX = filteredOffset[interval.start];
      const endX = filteredOffset[interval.end] + glyphWidth;
      const { engraved, heightTaken } = engraveSpan(
        startX,
        endX,
        currHeight,
        span,
        config
      );
      heightHelper.addHeight(heightTaken, interval.end);
      return engraved;
    });
  return {
    type: 'Node',
    transform: notrans(),
    children: engravedSpansArr,
  };
}

function engraveSpan(
  startX: number,
  endX: number,
  currHeight: number,
  _span: Span,
  config: RenderConfig
) {
  // TO-DO: 其他种类的 Span
  return {
    heightTaken: config.slurHeight + config.slurPaddingBottom,
    engraved: engraveSlur(
      startX,
      endX,
      currHeight + config.glyphHeight,
      config
    ),
  };
}

function engraveSlur(
  startX: number,
  endX: number,
  height: number,
  config: RenderConfig
): LayoutTree<RenderObject> {
  const { slurHeight, slurPaddingX, slurPaddingBottom } = config;
  const width = endX - startX - 2 * slurPaddingX;

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
