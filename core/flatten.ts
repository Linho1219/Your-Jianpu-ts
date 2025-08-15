import { LayoutTree, Transform, LayoutFlat, notrans } from '../types/layout';

function combineTransform(t1: Transform, t2: Transform): Transform {
  const {
    localPosition: [pos1x, pos1y],
    localScale: [scale1x, scale1y],
  } = t1;
  const {
    localPosition: [pos2x, pos2y],
    localScale: [scale2x, scale2y],
  } = t2;
  return {
    localPosition: [pos1x + pos2x * scale1x, pos1y + pos2y * scale1y],
    localScale: [scale1x * scale2x, scale1y * scale2y],
  };
}

export function flattenLayoutTree<T>(
  tree: LayoutTree<T>,
  accTransform: Transform = notrans(),
): LayoutFlat<T> {
  if (tree.type === 'Leaf') {
    return [[accTransform, tree.anchor, tree.object]];
  } else if (tree.type === 'Node') {
    const nextTransform = combineTransform(accTransform, tree.transform);
    return tree.children.flatMap((child) => flattenLayoutTree(child, nextTransform));
  } else throw new Error('Unknown LayoutTree type');
}
