import { RenderConfig } from '../types/config';
import {
  BoundingBox,
  LayoutTree,
  normAnchorPosition,
  RenderObject,
  Transform,
  Size,
} from '../types/layout';

//#region 工具函数

function bboxUnion(a: BoundingBox, b: BoundingBox): BoundingBox {
  if (!a) return b;
  if (!b) return a;
  const [[ax1, ay1], [ax2, ay2]] = a;
  const [[bx1, by1], [bx2, by2]] = b;
  return [
    [Math.min(ax1, bx1), Math.min(ay1, by1)],
    [Math.max(ax2, bx2), Math.max(ay2, by2)],
  ];
}

function applyTransform(box: BoundingBox, transform: Transform): BoundingBox {
  if (!box) return null;
  const [dx, dy] = transform.localPosition;
  const [sx, sy] = transform.localScale;
  const [[bx1, by1], [bx2, by2]] = box;
  return [
    [bx1 * sx + dx, by1 * sy + dy],
    [bx2 * sx + dx, by2 * sy + dy],
  ];
}

//#endregion

export function getSize(object: RenderObject, config: RenderConfig): Size {
  switch (object.type) {
    case 'glyph':
      return [config.glyphWidth, config.glyphHeight];
    case 'accidental':
      return [config.accidentalWidth, config.accidentalHeight];
    case 'rectangle':
      return [object.width, object.height];
    case 'circle':
      return [2 * object.radius, 2 * object.radius];
    case 'curve':
      return [object.width, object.height];
    case 'invisible-rectangle':
      return [object.width, object.height];
    case 'text':
      return [0, object.size]; // 需要进一步处理
    default:
      throw new Error(`Unknown render object type`);
  }
}

function getBoundingBox(
  tree: LayoutTree<RenderObject>,
  config: RenderConfig
): BoundingBox {
  if (tree.type === 'Leaf') {
    const size = getSize(tree.object, config);
    const [width, height] = size;
    const [ax, ay] = normAnchorPosition(tree.anchor);
    return [
      [-ax * width, -ay * height],
      [(1 - ax) * width, (1 - ay) * height],
    ];
  } else if (tree.type === 'Node') {
    const boxes = tree.children.map((child) =>
      applyTransform(getBoundingBox(child, config), tree.transform)
    );
    return boxes.reduce(bboxUnion, null);
  }
  throw new Error(`Unknown layout tree type`);
}

export const getBoundingBoxWithCfg =
  (config: RenderConfig) => (tree: LayoutTree<RenderObject>) =>
    getBoundingBox(tree, config);
