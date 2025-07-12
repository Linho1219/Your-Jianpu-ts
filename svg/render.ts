/// <reference types="./svgBuilder.d.ts" />
import svgBuilder from 'svg-builder';
import {
  DrawDirective,
  normAnchorPosition,
  RenderObject,
} from '../types/layout';
import { RenderConfig } from '../types/config';
import { getSize } from '../core/bounding';

export function renderSVG(
  flatLayout: DrawDirective<RenderObject>[],
  width: number,
  height: number,
  config: RenderConfig
): string {
  let svg = svgBuilder.width(width).height(height);

  for (const [transform, anchor, object] of flatLayout) {
    const [anchorX, anchorY] = normAnchorPosition(anchor);
    const [posX, posY] = transform.localPosition;
    const [scaleX, scaleY] = transform.localScale;
    const [objWidth, objHeight] = getSize(object, config);
    const x = posX + objWidth * scaleX * anchorX;
    const y = posY + objHeight * scaleY * anchorY;
    switch (object.type) {
      case 'circle':
        svg = svg.circle({ cx: x, cy: y, r: object.radius });
        break;
      case 'rectangle':
        svg = svg.rect({
          x,
          y,
          width: object.width,
          height: object.height,
        });
        break;
      case 'curve':
        svg = svg.path({
          d: generateQuadraticBezierPath(x, y, object.width, object.height),
          fill: 'none',
          stroke: '#000',
          'stroke-width': '2px',
        });
        break;
      case 'glyph':
        svg = svg.image({
          href: `svg/${object.value}.svg`,
          x,
          y,
          width: config.glyphWidth,
          height: config.glyphHeight,
        });
        break;
      case 'accidental':
        svg = svg.image({
          href: `svg/${object.value}.svg`,
          x,
          y,
          width: config.accidentalWidth,
          height: config.accidentalHeight,
        });
        break;
      case 'text': {
        svg = svg.text(
          {
            x,
            y,
            'font-size': config.glyphHeight,
            'font-family': 'sans-serif',
          },
          object.content
        );
      }
      case 'invisible-rectangle':
        break;
      default:
        throw new Error(`Unknown render object type`);
    }
  }

  return svg.render();
}

export function generateQuadraticBezierPath(
  x: number,
  y: number,
  width: number,
  height: number
): string {
  const x1 = x;
  const y1 = y + height;
  const cx = x + width / 2;
  const cy = y - height;
  const x2 = x + width;
  const y2 = y + height;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}
