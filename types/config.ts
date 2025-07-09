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
  glyphHeight_lineWidth: number;
  glyphWidth_glyphHeight: number;
  repeater4Height_glyphHeight: number;
  repeater4Width_glyphWidth: number;
  transposeDotRadius_glyphHeight: number;
  transposeDotGap_glyphHeight: number;
  dotRadius_glyphHeight: number;
  dotGap_glyphHeight: number;
  beamHeight_glyphHeight: number;
  beamGap_glyphHeight: number;
  accidentalHeight_glyphHeight: number;
  accidentalWidth_accidentalHeight: number;
  barLineLength_glyphHeight: number;
  barLineWidth_glyphWidth: number;
  barLineLeftPadding_glyphWidth: number;
  barLineRightPadding_glyphWidth: number;
  thickBarLineWidth_barLineWidth: number;
  thickBarLineGap_barLineWidth: number;
  slurHeight_glyphHeight: number;
  slurPaddingX_glyphWidth: number;
  slurPaddingBottom_glyphHeight: number;
  initialTimeSignature: TimeSignature;
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
  accidentalHeight: number;
  accidentalWidth: number;
  barLineLength: number;
  barLineWidth: number;
  barLineLeftPadding: number;
  barLineRightPadding: number;
  thickBarLineWidth: number;
  thickBarLineGap: number;
  slurHeight: number;
  slurPaddingX: number;
  slurPaddingBottom: number;
}

export function fromRawRenderConfig(raw: RawRenderConfig): RenderConfig {
  const glyphHeight = raw.glyphHeight_lineWidth * raw.lineWidth,
    glyphWidth = raw.glyphWidth_glyphHeight * glyphHeight,
    accidentalHeight = raw.accidentalHeight_glyphHeight * glyphHeight,
    barLineWidth = raw.barLineWidth_glyphWidth * glyphWidth;

  return {
    ...raw,
    glyphHeight,
    glyphWidth,
    accidentalHeight,
    barLineWidth,
    repeater4Height: raw.repeater4Height_glyphHeight * glyphHeight,
    repeater4Width: raw.repeater4Width_glyphWidth * glyphWidth,
    transposeDotRadius: raw.transposeDotRadius_glyphHeight * glyphHeight,
    transposeDotGap: raw.transposeDotGap_glyphHeight * glyphHeight,
    dotRadius: raw.dotRadius_glyphHeight * glyphHeight,
    dotGap: raw.dotGap_glyphHeight * glyphHeight,
    beamHeight: raw.beamHeight_glyphHeight * glyphHeight,
    beamGap: raw.beamGap_glyphHeight * glyphHeight,
    accidentalWidth: raw.accidentalWidth_accidentalHeight * accidentalHeight,
    barLineLength: raw.barLineLength_glyphHeight * glyphHeight,
    barLineLeftPadding: raw.barLineLeftPadding_glyphWidth * glyphWidth,
    barLineRightPadding: raw.barLineRightPadding_glyphWidth * glyphWidth,
    thickBarLineWidth: raw.thickBarLineWidth_barLineWidth * barLineWidth,
    thickBarLineGap: raw.thickBarLineGap_barLineWidth * barLineWidth,
    slurHeight: raw.slurHeight_glyphHeight * glyphHeight,
    slurPaddingX: raw.slurPaddingX_glyphWidth * glyphWidth,
    slurPaddingBottom: raw.slurPaddingBottom_glyphHeight * glyphHeight,
  };
}
