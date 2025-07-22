import fs from 'node:fs';
import path from 'node:path';
import { INode } from 'svgson';
import { getINode } from './utils';
import * as opentype from 'opentype.js';

import numGlyphInfo from '../fonts/num/meta/glyphnames.json';
import smuflGlyphInfo from '../fonts/smufl/meta/glyphnames.json';

const registeredNums = new Set<keyof typeof numGlyphInfo>();
const registeredSmufl = new Set<keyof typeof smuflGlyphInfo>();

const numGlyphNames = Object.keys(numGlyphInfo);
const smuflGlyphNames = Object.keys(smuflGlyphInfo);

const numFontDir = './fonts/num';
const smuflFontDir = './fonts/smufl';
function loadFonts(numFontFilename: string, smuflFontFilename: string) {
  const numFontPath = path.join(numFontDir, numFontFilename);
  const numFontBuffer = fs.readFileSync(numFontPath);
  const numFont = opentype.parse(numFontBuffer.buffer);

  const smuflFontPath = path.join(smuflFontDir, smuflFontFilename);
  const smuflFontBuffer = fs.readFileSync(smuflFontPath);
  const smuflFont = opentype.parse(smuflFontBuffer.buffer);

  return { numFont, smuflFont };
}

export function getDefRegister(
  numFontFilename: string,
  smuflFontFilename: string
) {
  function reg(name: string) {
    if (numGlyphNames.includes(name))
      return registeredNums.add(name as keyof typeof numGlyphInfo);
    if (smuflGlyphNames.includes(name))
      return registeredSmufl.add(name as keyof typeof smuflGlyphInfo);
    throw new Error(`Unknown asset name: ${name}`);
  }
  function exp() {
    const defsChildren: INode[] = [];
    const defsNode = getINode('defs', {}, defsChildren);
    const { numFont, smuflFont } = loadFonts(
      numFontFilename,
      smuflFontFilename
    );
    registeredNums.forEach((name) => {
      const unicode = numGlyphInfo[name].codepoint;
      defsChildren.push(extractSymbol(name, unicode, numFont));
    });
    registeredSmufl.forEach((name) => {
      const unicode = smuflGlyphInfo[name].codepoint;
      defsChildren.push(extractSymbol(name, unicode, smuflFont));
    });
    return defsNode;
  }
  return { reg, exp };
}

function extractSymbol(
  name: string,
  unicode: string,
  font: opentype.Font,
  PRECISION = 3
): INode {
  const fontSize = 1000;
  const prtN = (num: number) =>
    num
      .toFixed(PRECISION)
      .replace(/\.0+$/, '')
      .replace(/(?<=\.\d+)0+$/, '');

  const code = parseInt(unicode.replace(/^U\+/, ''), 16);
  const glyph = font.charToGlyph(String.fromCodePoint(code));
  const path = glyph.getPath(0, 0, fontSize);
  const { x1, y1, x2, y2 } = path.getBoundingBox();
  const width = x2 - x1;
  const height = y2 - y1;
  const d = path.toPathData(3);
  return {
    name: 'symbol',
    attributes: {
      id: name,
      viewBox: [x1, y1, width, height].map(prtN).join(' '),
      overflow: 'visible',
    },
    type: 'element',
    children: [
      {
        name: 'path',
        attributes: { d },
        type: 'element',
        children: [],
        value: '',
      },
    ],
    value: '',
  };
}
