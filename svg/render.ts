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
import { getDefRegister, initAssets } from './defReg';

export function renderSVG(
  flatLayout: DrawDirective<RenderObject>[],
  width: number,
  height: number,
  config: RenderConfig
): string {
  const defReg = getDefRegister(initAssets('./svg/assets/gwoodryin'));
  const children: INode[] = [];
  const rootNode: INode = {
    name: 'svg',
    type: 'element',
    attributes: {
      xmlns: 'http://www.w3.org/2000/svg',
      width: width.toString(),
      height: height.toString(),
    },
    value: '',
    children,
  };
  children.push(
    getINode('rect', {
      x: '0',
      y: '0',
      width: width.toString(),
      height: height.toString(),
      fill: '#fff',
    })
  );

  for (const [transform, anchor, object] of flatLayout) {
    const [anchorX, anchorY] = normAnchorPosition(anchor);
    const [posX, posY] = transform.localPosition;
    const [scaleX, scaleY] = transform.localScale;
    const [objWidth, objHeight] = getSize(object, config);
    const x = posX - objWidth * scaleX * anchorX;
    const y = posY - objHeight * scaleY * anchorY;
    switch (object.type) {
      case 'circle':
        children.push(
          getINode('circle', {
            cx: (x + object.radius).toString(),
            cy: (y + object.radius).toString(),
            r: object.radius.toString(),
          })
        );
        break;
      case 'rectangle':
        children.push(
          getINode('rect', {
            x: x.toString(),
            y: y.toString(),
            width: (objWidth * scaleX).toString(),
            height: (objHeight * scaleY).toString(),
          })
        );
        break;
      case 'curve':
        children.push(
          getINode('path', {
            d: generateQuadraticBezierPath(x, y, object.width, object.height),
            fill: 'none',
            stroke: '#000',
            'stroke-width': '2px',
          })
        );
        break;
      case 'glyph':
        defReg.reg(object.value);
        children.push(
          getINode('use', {
            href: `#${object.value}`,
            x: x.toString(),
            y: y.toString(),
            width: config.glyphWidth.toString(),
            height: config.glyphHeight.toString(),
          })
        );
        break;
      case 'accidental':
        defReg.reg(object.value);
        children.push(
          getINode('use', {
            href: `#${object.value}`,
            x: x.toString(),
            y: y.toString(),
            width: config.accidentalWidth.toString(),
            height: config.accidentalHeight.toString(),
          })
        );
        break;
      case 'text':
        children.push(
          getINode(
            'text',
            {
              x: x.toString(),
              y: (y + config.lyricSize).toString(),
              'font-size': config.lyricSize.toString(),
              'font-family': 'sans-serif',
              'text-anchor': 'middle',
              'alignment-baseline': 'text-after-edge',
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
