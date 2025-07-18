import { INode } from "svgson";

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

export function getINode(
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

export function getINodeText(
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

export const getCommentStr = (content: string) => `<!-- ${content} -->`;