import fs from 'node:fs';
import path from 'node:path';
import { INode, parseSync } from 'svgson';
import { getINode } from './utils';

export function initAssets(assetsPath: string) {
  const assetsMap = new Map<string, INode>();
  fs.readdirSync(assetsPath).forEach((file) => {
    if (file.endsWith('.svg')) {
      const fileName = file.replace('.svg', '');
      const content = fs.readFileSync(path.join(assetsPath, file), 'utf-8');
      const svgNode = parseSync(content);
      const symbolNode: INode = {
        name: 'symbol',
        attributes: {
          id: fileName,
          width: svgNode.attributes.width,
          height: svgNode.attributes.height,
          viewBox:
            svgNode.attributes.viewBox ??
            `0 0 ${svgNode.attributes.width} ${svgNode.attributes.height}`,
        },
        type: 'element',
        children: svgNode.children,
        value: '',
      };
      assetsMap.set(fileName, symbolNode);
    }
  });
  return assetsMap;
}

export function getDefRegister(assetsMap: Map<string, INode>) {
  const registeredDefs = new Set<string>();

  function reg(name: string) {
    if (!assetsMap.has(name))
      throw new Error(`Asset "${name}" not found in assetsMap`);
    registeredDefs.add(name);
  }
  function exp() {
    const defsChildren: INode[] = [];
    const defsNode = getINode('defs', {}, defsChildren);
    registeredDefs.forEach((name) => {
      const symbolNode = assetsMap.get(name);
      if (!symbolNode)
        throw new Error(`Asset "${name}" not found in assetsMap`);
      defsChildren.push(symbolNode);
    });
    return defsNode;
  }
  return { reg, exp };
}
