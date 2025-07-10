import { Accidental, WhiteKey } from './basic';

export type AlignText = 'left' | 'right' | 'center';

export type RenderObject =
  | { type: 'glyph'; value: Glyph }
  | { type: 'accidental'; value: Accidental }
  | { type: 'circle'; radius: number }
  | { type: 'rectangle'; width: number; height: number }
  | { type: 'curve'; width: number; height: number }
  | { type: 'text'; size: number; align: AlignText; content: string }
  | { type: 'invisible-rectangle'; width: number; height: number };

export enum Glyph {
  GX = 'GX',
  G0 = 'G0',
  G1 = 'G1',
  G2 = 'G2',
  G3 = 'G3',
  G4 = 'G4',
  G5 = 'G5',
  G6 = 'G6',
  G7 = 'G7',
}

export const whiteKeyToGlyph = (key: WhiteKey) => ('G' + key) as Glyph;

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

export type BoundingBox = BBox | null;

export enum AnchorPosition {
  Centre,
  Bottom,
  BottomLeft,
  Left,
  Right,
  Top,
  TopLeft,
  TopRight,
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
      case AnchorPosition.Centre:
        return [0.5, 0.5];
      case AnchorPosition.Bottom:
        return [0.5, 1];
      case AnchorPosition.BottomLeft:
        return [0, 1];
      case AnchorPosition.Left:
        return [0, 0.5];
      case AnchorPosition.Right:
        return [1, 0.5];
      case AnchorPosition.Top:
        return [0.5, 0];
      case AnchorPosition.TopLeft:
        return [0, 0];
      case AnchorPosition.TopRight:
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

export function notrans(): Transform {
  return { localPosition: [0, 0], localScale: [1, 1] };
}
export function move(dx: number, dy: number): Transform {
  return { localPosition: [dx, dy], localScale: [1, 1] };
}
export const moveUp = (dy: number) => move(0, -dy);
export const moveDown = (dy: number) => move(0, dy);
export const moveLeft = (dx: number) => move(-dx, 0);
export const moveRight = (dx: number) => move(dx, 0);
