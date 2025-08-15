import { RenderConfig } from '../types/config';
import {
  LayoutTree,
  normAnchorPosition,
  RenderObject,
  Transform,
  Size,
  BBox,
} from '../types/layout';

//#region 工具函数

export function bboxUnion(a: BBox, b: BBox): BBox {
  if (a.isEmpty()) return b;
  if (b.isEmpty()) return a;
  return new BBox(
    Math.min(a.x1, b.x1),
    Math.min(a.y1, b.y1),
    Math.max(a.x2, b.x2),
    Math.max(a.y2, b.y2)
  );
}

function applyTransform(box: BBox, transform: Transform): BBox {
  if (box.isEmpty()) return box;
  const [dx, dy] = transform.localPosition;
  const [sx, sy] = transform.localScale;
  return new BBox(
    box.x1 * sx + dx,
    box.y1 * sy + dy,
    box.x2 * sx + dx,
    box.y2 * sy + dy
  );
}

//#endregion

export function getSize(object: RenderObject, config: RenderConfig): Size {
  switch (object.type) {
    case 'glyph':
      return [config.glyphWidth, config.glyphHeight];
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
    case 'symbol':
      return [object.width, object.height];
    default:
      throw new Error(`Unknown render object type`);
  }
}

export function getBoundingBox(
  tree: LayoutTree<RenderObject>,
  config: RenderConfig,
  ignoreTypes?: string[]
): BBox {
  if (tree.type === 'Leaf') {
    if (ignoreTypes?.includes(tree.object.type)) return new BBox();
    const size = getSize(tree.object, config);
    const [width, height] = size;
    const [ax, ay] = normAnchorPosition(tree.anchor);
    return new BBox(
      -ax * width,
      -ay * height,
      (1 - ax) * width,
      (1 - ay) * height
    );
  } else if (tree.type === 'Node') {
    const boxes = tree.children.map((child) =>
      applyTransform(getBoundingBox(child, config, ignoreTypes), tree.transform)
    );
    return boxes.reduce(bboxUnion, new BBox());
  }
  throw new Error(`Unknown layout tree type`);
}

export const getBoundingBoxWithCfg =
  (config: RenderConfig) => (tree: LayoutTree<RenderObject>) =>
    getBoundingBox(tree, config);
