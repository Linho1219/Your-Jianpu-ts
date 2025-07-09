export type XY = [number, number];
export type Size = [number, number];

export interface Transform {
  localPosition: XY;
  localScale: XY;
}

export const IdentityTransform: Transform = {
  localPosition: [0, 0],
  localScale: [1, 1],
};

export type BBox = [XY, XY];

export type BoundingBox = { type: 'BBox'; value: BBox } | { type: 'NoBox' };

export enum AnchorPosition {
  APCentre,
  APBottom,
  APBottomLeft,
  APLeft,
  APRight,
  APTop,
  APTopLeft,
  APTopRight,
  AP, // arbitrary (0~1, 0~1)，单独用一个结构体代替
}

export interface APArbitrary {
  type: AnchorPosition.AP;
  pos: XY;
}

export type Anchor = AnchorPosition | APArbitrary;

export type LayoutTree<T> =
  | { type: 'Leaf'; anchor: Anchor; object: T }
  | { type: 'Node'; transform: Transform; children: LayoutTree<T>[] };

export interface LayoutFlat<T> extends Array<DrawDirective<T>> {}

export type DrawDirective<T> = [Transform, Anchor, T];

// ----------- Anchor position helpers ------------

export function normAnchorPosition(anchor: Anchor): XY {
  if (typeof anchor === 'number') {
    switch (anchor) {
      case AnchorPosition.APCentre:
        return [0.5, 0.5];
      case AnchorPosition.APBottom:
        return [0.5, 1];
      case AnchorPosition.APBottomLeft:
        return [0, 1];
      case AnchorPosition.APLeft:
        return [0, 0.5];
      case AnchorPosition.APRight:
        return [1, 0.5];
      case AnchorPosition.APTop:
        return [0.5, 0];
      case AnchorPosition.APTopLeft:
        return [0, 0];
      case AnchorPosition.APTopRight:
        return [1, 0];
      default:
        throw new Error(`Unknown anchor position: ${anchor}`);
    }
  } else {
    return anchor.pos;
  }
}

// ---------- Transform composition --------------

export function composeTransform(a: Transform, b: Transform): Transform {
  const [x1, y1] = a.localPosition;
  const [sx1, sy1] = a.localScale;
  const [x2, y2] = b.localPosition;
  const [sx2, sy2] = b.localScale;
  return {
    localPosition: [x1 + x2 * sx1, y1 + y2 * sy1],
    localScale: [sx1 * sx2, sy1 * sy2],
  };
}

export function move(dx: number, dy: number): Transform {
  return { localPosition: [dx, dy], localScale: [1, 1] };
}

export const moveUp = (dy: number) => move(0, -dy);
export const moveDown = (dy: number) => move(0, dy);
export const moveLeft = (dx: number) => move(-dx, 0);
export const moveRight = (dx: number) => move(dx, 0);

// ----------- BoundingBox utility --------------

export const NoBox: BoundingBox = { type: 'NoBox' };

export function BBox(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): BoundingBox {
  return {
    type: 'BBox',
    value: [
      [x1, y1],
      [x2, y2],
    ],
  };
}

export function boxBoundX(box: BoundingBox): [number, number] {
  if (box.type === 'NoBox') return [0, 0];
  const [[x1, _], [x2, __]] = box.value;
  return [x1, x2];
}

export function boxBoundY(box: BoundingBox): [number, number] {
  if (box.type === 'NoBox') return [0, 0];
  const [[_, y1], [__, y2]] = box.value;
  return [y1, y2];
}

export function boxBound(box: BoundingBox): [XY, XY] {
  if (box.type === 'NoBox')
    return [
      [0, 0],
      [0, 0],
    ];
  return box.value;
}

export function mergeBoundingBox(a: BoundingBox, b: BoundingBox): BoundingBox {
  if (a.type === 'NoBox') return b;
  if (b.type === 'NoBox') return a;
  const [[ax1, ay1], [ax2, ay2]] = a.value;
  const [[bx1, by1], [bx2, by2]] = b.value;
  return {
    type: 'BBox',
    value: [
      [Math.min(ax1, bx1), Math.min(ay1, by1)],
      [Math.max(ax2, bx2), Math.max(ay2, by2)],
    ],
  };
}
