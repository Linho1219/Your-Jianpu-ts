import { SymbolName } from '../../svg/defReg';
import { RenderConfig } from '../../types/config';
import {
  Anchor,
  LayoutTree,
  LayoutTreeNode,
  moveLeft,
  moveRight,
  normAnchorPosition,
  notrans,
  RenderObject,
  Transform,
} from '../../types/layout';

export function engraveNumber(
  number: number,
  glyphPrefix: string,
  config: RenderConfig,
  anchor: Anchor
) {
  const [anchorX, anchorY] = normAnchorPosition(anchor);
  let currentX = 0;
  let height = 0;
  const children: LayoutTree<RenderObject>[] = [...number.toFixed(0)]
    .map((char) => (glyphPrefix + char) as SymbolName)
    .map((glyph) => config.defReg.regAndGet(glyph))
    .map((symbol) => {
      height = Math.max(height, symbol.metrics.height);
      const node: LayoutTree<RenderObject> = {
        type: 'Node',
        transform: moveRight(currentX),
        children: [
          {
            type: 'Leaf',
            anchor: [0, anchorY],
            object: {
              type: 'symbol',
              value: symbol.name,
              width: symbol.metrics.width,
              height: symbol.metrics.height,
            },
          },
        ],
      };
      currentX += symbol.metrics.width;
      return node;
    });
  const width = currentX;
  const node: LayoutTree<RenderObject> = {
    type: 'Node',
    transform: moveLeft(anchorX * width),
    children,
  };
  return { node, metrics: { width, height } };
}

export function wrapNode(
  transform: Transform = notrans(),
  ...trees: LayoutTree<RenderObject>[]
): LayoutTreeNode<RenderObject> {
  return {
    type: 'Node',
    transform,
    children: trees,
  };
}
