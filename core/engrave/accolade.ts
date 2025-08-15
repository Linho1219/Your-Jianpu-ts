import { Accolade, Interval } from '../../types/abstract';
import { RenderConfig } from '../../types/config';
import {
  AnchorPosition,
  LayoutTree,
  move,
  moveLeft,
  notrans,
  RenderObject,
} from '../../types/layout';
import { wrapNode } from './utils';

export interface VoiceMetric {
  topY: number;
  baseY: number;
  bottomY: number;
  height: number;
}

export function getAccoladeWidth(accolades: Accolade[] | null, config: RenderConfig): number {
  if (accolades === null) return 0;
  let width = 0;
  if (accolades.some((value) => value.type === 'Bracket')) {
    width = Math.max(width, config.bracketThickLineWidth + config.bracketThickLineGap);
  }
  if (accolades.some((value) => value.type === 'Brace')) {
    width = Math.max(width, config.braceWidth+config.braceGap);
  }
  width += config.accoladeGapWidth + config.accoladeLineWidth;
  return width;
}

export function engraveAccolades(
  metrics: VoiceMetric[],
  accolades: Accolade[] | null,
  config: RenderConfig
): LayoutTree<RenderObject> {
  if (accolades === null) return wrapNode();
  const getYRange = ({ start, end }: Interval): [number, number] => [
    metrics[start]?.topY ?? 0,
    metrics[end]?.bottomY ?? 0,
  ];
  const getTotRange = () => getYRange({ start: 0, end: metrics.length - 1 });
  const braceAndBrackets = wrapNode(
    moveLeft(config.accoladeLineWidth),
    ...accolades.map((accolade) => {
      const range = getYRange(accolade.range);
      // console.log(range);
      if (accolade.type === 'Brace') return engraveBrace(config, ...range);
      if (accolade.type === 'Bracket') return engraveBracket(config, ...range);
      throw new Error(`Unknown accolade type: ${accolade.type}`);
    })
  );
  const accoladeLine = engraveAccoladeLine(config, ...getTotRange());
  return wrapNode(moveLeft(config.accoladeGapWidth), accoladeLine, braceAndBrackets);
}

function engraveAccoladeLine(
  config: RenderConfig,
  topY: number,
  bottomY: number
): LayoutTree<RenderObject> {
  return {
    type: 'Node',
    transform: move(0, topY),
    children: [
      {
        type: 'Leaf',
        anchor: AnchorPosition.TopRight,
        object: {
          type: 'rectangle',
          width: config.accoladeLineWidth,
          height: bottomY - topY,
        },
      },
    ],
  };
}

function engraveBrace(
  config: RenderConfig,
  topY: number,
  bottomY: number
): LayoutTree<RenderObject> {
  const symbol = config.defReg.regAndGet('brace');
  const { height: origHeight, width: origWidth } = symbol.metrics;
  const factorY = (bottomY - topY) / origHeight;
  const factorX = config.braceWidth / origWidth;
  return wrapNode(
    {
      localPosition: [-config.braceGap, topY],
      localScale: [factorX, factorY],
    },
    {
      type: 'Leaf',
      anchor: AnchorPosition.TopRight,
      object: {
        type: 'symbol',
        value: 'brace',
        width: origWidth,
        height: origHeight,
      },
    }
  );
}

function engraveBracket(
  config: RenderConfig,
  topY: number,
  bottomY: number
): LayoutTree<RenderObject> {
  const children: LayoutTree<RenderObject>[] = [];
  const topSymbol = config.defReg.regAndGet('bracketTop');
  const bottomSymbol = config.defReg.regAndGet('bracketBottom');
  const {
    bracketThickLineGap: thickLineGap,
    bracketThickLineWidth: thickLineWidth,
    bracketOverlapRatio: overlapRatio,
  } = config;
  const leftMost = -(thickLineGap + thickLineWidth);
  children.push(
    wrapNode(move(leftMost, topY + overlapRatio * topSymbol.metrics.height), {
      type: 'Leaf',
      anchor: AnchorPosition.BottomLeft,
      object: {
        type: 'symbol',
        value: 'bracketTop',
        width: topSymbol.metrics.width,
        height: topSymbol.metrics.height,
      },
    })
  );
  children.push(
    wrapNode(move(leftMost, bottomY - overlapRatio * bottomSymbol.metrics.height), {
      type: 'Leaf',
      anchor: AnchorPosition.TopLeft,
      object: {
        type: 'symbol',
        value: 'bracketBottom',
        width: bottomSymbol.metrics.width,
        height: bottomSymbol.metrics.height,
      },
    })
  );
  children.push(
    wrapNode(move(-thickLineGap, topY), {
      type: 'Leaf',
      anchor: AnchorPosition.TopRight,
      object: {
        type: 'rectangle',
        width: thickLineWidth,
        height: bottomY - topY,
      },
    })
  );
  return wrapNode(notrans(), ...children);
}
