import { INode, stringify } from 'svgson';
import {
  DrawDirective,
  normAnchorPosition,
  RenderObject,
} from '../types/layout';
import { RenderConfig } from '../types/config';
import { getSize } from '../core/bounding';
import {
  generateQuadraticBezierPath,
  getCommentStr,
  getINode,
  getINodeText,
} from './utils';

export function renderSVG(
  flatLayout: DrawDirective<RenderObject>[],
  width: number,
  height: number,
  config: RenderConfig,
  PRECISION = 2
): string {
  const prtN = (num: number) =>
    num
      .toFixed(PRECISION)
      .replace(/\.0+$/, '')
      .replace(/(?<=\.\d+)0+$/, '');
  const { defReg } = config;
  const children: INode[] = [];
  const rootNode: INode = {
    name: 'svg',
    type: 'element',
    attributes: {
      xmlns: 'http://www.w3.org/2000/svg',
      width: prtN(width),
      height: prtN(height),
    },
    value: '',
    children,
  };
  children.push(
    getINode('rect', {
      x: '0',
      y: '0',
      width: prtN(width),
      height: prtN(height),
      fill: '#fff',
    })
  );

  for (const [transform, anchor, object] of flatLayout) {
    const [anchorX, anchorY] = normAnchorPosition(anchor);
    const [posX, posY] = transform.localPosition;
    const [scaleX, scaleY] = transform.localScale;
    const [objWidth, objHeight] = getSize(object, config);
    const x = (posX - objWidth * scaleX * anchorX) / scaleX;
    const y = (posY - objHeight * scaleY * anchorY) / scaleY;
    const transformAttrs: Record<string, string> = {};
    if (scaleX !== 1 || scaleY !== 1) {
      transformAttrs.transform = `scale(${prtN(scaleX)}, ${prtN(scaleY)})`;
    }
    switch (object.type) {
      case 'circle':
        children.push(
          getINode('circle', {
            cx: prtN(x + object.radius),
            cy: prtN(y + object.radius),
            r: prtN(object.radius),
            ...transformAttrs,
          })
        );
        break;
      case 'rectangle': {
        const attr: Record<string, string> = {
          x: prtN(x),
          y: prtN(y),
          width: prtN(objWidth * scaleX),
          height: prtN(objHeight * scaleY),
          ...transformAttrs,
        };
        if (object.fill) attr.fill = object.fill;
        children.push(getINode('rect', attr));
        break;
      }
      case 'curve':
        children.push(
          getINode('path', {
            d: generateQuadraticBezierPath(x, y, object.width, object.height),
            fill: 'none',
            stroke: '#000',
            'stroke-width': '2px',
            ...transformAttrs,
          })
        );
        break;
      case 'glyph':
        defReg.reg(object.value);
        children.push(
          getINode('use', {
            href: `#${object.value}`,
            x: prtN(x),
            y: prtN(y),
            width: prtN(config.glyphWidth),
            height: prtN(config.glyphHeight),
            ...transformAttrs,
          })
        );
        break;
      case 'symbol':
        defReg.reg(object.value);
        children.push(
          getINode('use', {
            href: `#${object.value}`,
            x: prtN(x),
            y: prtN(y),
            width: prtN(objWidth),
            height: prtN(objHeight),
            ...transformAttrs,
          })
        );
        break;
      case 'text':
        children.push(
          getINode(
            'text',
            {
              x: prtN(x),
              y: prtN(y + config.lyricSize),
              'font-size': prtN(config.lyricSize),
              'font-family': 'sans-serif',
              'text-anchor': 'middle',
              'alignment-baseline': 'text-after-edge',
              ...transformAttrs,
            },
            [getINodeText(object.content)]
          )
        );
        break;
      case 'invisible-rectangle':
        break;
      default:
        throw new Error(`Unknown render object type`);
    }
  }
  children.unshift(defReg.exp());
  return getCommentStr(`由 Your-Jianpu-TS 生成`) + stringify(rootNode);
}
