import { getDefRegister } from '../svg/defReg';
import { TimeSignature } from './basic';

/**
 * 渲染配置
 *
 * 下划线 `_` 表示比值
 *
 * 例如 `foo_bar` 表示 `foo` 与 `bar` 的比 `foo/bar`
 */
export interface RawRenderConfig {
  pageHeight: number;
  lineWidth: number;
  lineGap: number;
  smuflSize: number;
  glyphHeight: number;
  glyphWidth_glyphHeight: number;
  repeater4Height_glyphHeight: number;
  repeater4Width_glyphWidth: number;
  transposeDotRadius_glyphHeight: number;
  transposeDotGap_glyphHeight: number;
  dotRadius_glyphHeight: number;
  dotGap_glyphHeight: number;
  beamHeight_glyphHeight: number;
  beamGap_glyphHeight: number;
  accidentalYOffset_glyphHeight: number;
  symbolXGap_glyphWidth: number;
  symbolYGap_glyphHeight: number;
  barLineLength_glyphHeight: number;
  barLineWidth_glyphWidth: number;
  barLineLeftPadding_glyphWidth: number;
  barLineRightPadding_glyphWidth: number;
  thickBarLineWidth_barLineWidth: number;
  thickBarLineGap_barLineWidth: number;
  slurHeight_glyphHeight: number;
  slurPaddingX_glyphWidth: number;
  slurPaddingBottom_glyphHeight: number;
  lyricSize_glyphHeight: number;
  lyricGap_lineGap: number;
  chordGap_glyphHeight: number;
  chordYscale: number;
  timeSignatureYScale: number;
  timeSignatureLeftPadding_glyphWidth: number;
  timeSignatureRightPadding_glyphWidth: number;
  accoladeGapWidth_glyphWidth: number;
  accoladeLineWidth_smuflSize: number;
  braceWidth_smuflSize: number;
  bracketThickLineWidth_smuflSize: number;
  bracketThickLineGap_smuflSize: number;
  bracketOverlapRatio: number;
  initialTimeSignature: TimeSignature;
  numFontFilename: string;
  smuflFontFilename: string;
}

/** 完整的渲染配置 */
export interface RenderConfig extends RawRenderConfig {
  glyphHeight: number;
  glyphWidth: number;
  repeater4Height: number;
  repeater4Width: number;
  transposeDotRadius: number;
  transposeDotGap: number;
  dotRadius: number;
  dotGap: number;
  beamHeight: number;
  beamGap: number;
  accidentalYOffset: number;
  symbolXGap: number;
  symbolYGap: number;
  barLineLength: number;
  barLineWidth: number;
  barLineLeftPadding: number;
  barLineRightPadding: number;
  thickBarLineWidth: number;
  thickBarLineGap: number;
  slurHeight: number;
  slurPaddingX: number;
  slurPaddingBottom: number;
  lyricSize: number;
  lyricGap: number;
  chordGap: number;
  accoladeGapWidth: number;
  accoladeLineWidth: number;
  braceWidth: number;
  bracketThickLineWidth: number;
  bracketThickLineGap: number;
  timeSignatureLeftPadding: number;
  timeSignatureRightPadding: number;
  defReg: ReturnType<typeof getDefRegister>;
}

export function fromRawRenderConfig(raw: RawRenderConfig): RenderConfig {
  const smuflSize = raw.smuflSize,
    glyphHeight = raw.glyphHeight,
    glyphWidth = raw.glyphWidth_glyphHeight * glyphHeight,
    barLineWidth = raw.barLineWidth_glyphWidth * glyphWidth,
    lineGap = raw.lineGap;

  return {
    ...raw,
    glyphWidth,
    barLineWidth,
    repeater4Height: raw.repeater4Height_glyphHeight * glyphHeight,
    repeater4Width: raw.repeater4Width_glyphWidth * glyphWidth,
    transposeDotRadius: raw.transposeDotRadius_glyphHeight * glyphHeight,
    transposeDotGap: raw.transposeDotGap_glyphHeight * glyphHeight,
    dotRadius: raw.dotRadius_glyphHeight * glyphHeight,
    dotGap: raw.dotGap_glyphHeight * glyphHeight,
    beamHeight: raw.beamHeight_glyphHeight * glyphHeight,
    beamGap: raw.beamGap_glyphHeight * glyphHeight,
    accidentalYOffset: raw.accidentalYOffset_glyphHeight * glyphHeight,
    symbolXGap: raw.symbolXGap_glyphWidth * glyphWidth,
    symbolYGap: raw.symbolYGap_glyphHeight * glyphHeight,
    barLineLength: raw.barLineLength_glyphHeight * glyphHeight,
    barLineLeftPadding: raw.barLineLeftPadding_glyphWidth * glyphWidth,
    barLineRightPadding: raw.barLineRightPadding_glyphWidth * glyphWidth,
    thickBarLineWidth: raw.thickBarLineWidth_barLineWidth * barLineWidth,
    thickBarLineGap: raw.thickBarLineGap_barLineWidth * barLineWidth,
    slurHeight: raw.slurHeight_glyphHeight * glyphHeight,
    slurPaddingX: raw.slurPaddingX_glyphWidth * glyphWidth,
    slurPaddingBottom: raw.slurPaddingBottom_glyphHeight * glyphHeight,
    lyricSize: raw.lyricSize_glyphHeight * glyphHeight,
    lyricGap: raw.lyricGap_lineGap * lineGap,
    chordGap: raw.chordGap_glyphHeight * glyphHeight,
    accoladeGapWidth: raw.accoladeGapWidth_glyphWidth * glyphWidth,
    accoladeLineWidth: raw.accoladeLineWidth_smuflSize * smuflSize,
    braceWidth: raw.braceWidth_smuflSize * smuflSize,
    bracketThickLineWidth: raw.bracketThickLineWidth_smuflSize * smuflSize,
    bracketThickLineGap: raw.bracketThickLineGap_smuflSize * smuflSize,
    timeSignatureLeftPadding: raw.timeSignatureLeftPadding_glyphWidth * glyphWidth,
    timeSignatureRightPadding: raw.timeSignatureRightPadding_glyphWidth * glyphWidth,
    defReg: getDefRegister(raw.numFontFilename, raw.smuflFontFilename, raw.smuflSize),
  };
}
