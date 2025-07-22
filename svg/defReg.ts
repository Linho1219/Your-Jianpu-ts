import fs from 'node:fs';
import path from 'node:path';
import { INode } from 'svgson';
import { getINode } from './utils';
import * as opentype from 'opentype.js';

import numGlyphInfo from '../fonts/num/meta/glyphnames.json';
import smuflGlyphInfo from '../fonts/smufl/meta/glyphnames.json';
import { BBox } from '../types/layout';
import { RenderConfig } from '../types/config';

type NumGlyphName = keyof typeof numGlyphInfo;
type SmuflGlyphName = keyof typeof smuflGlyphInfo;
type GlyphName = NumGlyphName | SmuflGlyphName;

interface GlyphInfo {
  name: GlyphName;
  type: 'num' | 'smufl';
  codepoint: string;
  codepointInt: number;
  description: string;
}

const glyphInfoMap = new Map<GlyphName, GlyphInfo>();
for (const [name, info] of Object.entries(numGlyphInfo)) {
  glyphInfoMap.set(name as NumGlyphName, {
    name: name as NumGlyphName,
    type: 'num',
    codepoint: info.codepoint,
    codepointInt: parseInt(info.codepoint.replace(/^U\+/, ''), 16),
    description: info.description,
  });
}
for (const [name, info] of Object.entries(smuflGlyphInfo)) {
  glyphInfoMap.set(name as SmuflGlyphName, {
    name: name as SmuflGlyphName,
    type: 'smufl',
    codepoint: info.codepoint,
    codepointInt: parseInt(info.codepoint.replace(/^U\+/, ''), 16),
    description: info.description,
  });
}
function isGlyphName(name: string): name is GlyphName {
  return glyphInfoMap.has(name as GlyphName);
}

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
  smuflFontFilename: string,
  config: RenderConfig
) {
  const registeredGlyphs = new Set<GlyphName>();
  const symbolCache = new Map<string, ExtractedSymbol>();

  const { numFont, smuflFont } = loadFonts(numFontFilename, smuflFontFilename);

  function getSymbolByName(name: GlyphName) {
    const cached = symbolCache.get(name);
    if (cached) return cached;
    const glyphInfo = glyphInfoMap.get(name);
    if (!glyphInfo) throw new Error(`Unknown glyph name: ${name}`);
    const { codepoint, type } = glyphInfo;
    const srcFont = type === 'num' ? numFont : smuflFont;
    const extracted = extractSymbol(name, codepoint, srcFont, config.smuflSize);
    symbolCache.set(name, extracted);
    return extracted;
  }

  function reg(name: string) {
    if (isGlyphName(name)) {
      registeredGlyphs.add(name);
    } else throw new Error(`Unknown glyph name: ${name}`);
  }

  function regAndGet(name: string): ExtractedSymbol {
    if (isGlyphName(name)) {
      registeredGlyphs.add(name);
      return getSymbolByName(name);
    } else throw new Error(`Unknown glyph name: ${name}`);
  }

  function exp() {
    const defsChildren: INode[] = [];
    const defsNode = getINode('defs', {}, defsChildren);

    registeredGlyphs.forEach((name) => {
      const extracted = getSymbolByName(name);
      defsChildren.push(extracted.symbolNode);
    });
    return defsNode;
  }
  return { reg, regAndGet, exp };
}

interface ExtractedSymbol {
  symbolNode: INode;
  metrics: {
    width: number;
    height: number;
    bbox: BBox;
  };
}

function extractSymbol(
  name: string,
  unicode: string,
  font: opentype.Font,
  fontSize = 1000,
  precision = 3
): ExtractedSymbol {
  const prtN = (num: number) =>
    num
      .toFixed(precision)
      .replace(/\.0+$/, '')
      .replace(/(?<=\.\d+)0+$/, '');

  const code = parseInt(unicode.replace(/^U\+/, ''), 16);
  const glyph = font.charToGlyph(String.fromCodePoint(code));
  const path = glyph.getPath(0, 0, fontSize);
  const { x1, y1, x2, y2 } = path.getBoundingBox();
  const width = x2 - x1;
  const height = y2 - y1;
  const d = path.toPathData(3);
  const symbolNode: INode = {
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
  return {
    symbolNode,
    metrics: {
      width,
      height,
      bbox: [
        [x1, y1],
        [x2, y2],
      ],
    },
  };
}
