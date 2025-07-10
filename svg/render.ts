import svgBuilder from 'svg-builder';
import { DrawDirective, RenderObject } from '../types/layout';

function renderSVG(
  flatLayout: DrawDirective<RenderObject>[],
  width: number,
  height: number
): string {
  let svg = svgBuilder.width(width).height(height);

  for (const [transform, anchor, object] of flatLayout) {

  }

  return svg.render();
}
