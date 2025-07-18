import { INode, stringify } from 'svgson';
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
        children.push(
          getINode('image', {
            href: `svg/${object.value}.svg`,
            x: x.toString(),
            y: y.toString(),
            width: config.glyphWidth.toString(),
            height: config.glyphHeight.toString(),
          })
        );
        break;
      case 'accidental':
        children.push(
          getINode('image', {
            href: `svg/${object.value}.svg`,
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
              y: y.toString(),
              'font-size': config.glyphHeight.toString(),
              'font-family': 'sans-serif',
              'text-anchor': 'middle',
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

  return getCommentStr(`由 Your-Jianpu-TS 生成`) + stringify(rootNode);
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

function getINode(
  tagName: string,
  attr: Record<string, string>,
  children: INode[] = []
): INode {
  return {
    name: tagName,
    type: 'element',
    attributes: attr,
    value: '',
    children,
  };
}

function getINodeText(
  content: string,
  attr: Record<string, string> = {}
): INode {
  return {
    name: '',
    type: 'text',
    value: content,
    attributes: attr,
    children: [],
  };
}

const getCommentStr = (content: string) => `<!-- ${content} -->`;
