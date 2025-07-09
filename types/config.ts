import { TimeSignature } from "./basic";

/**
 * 渲染配置
 *
 * 下划线 `_` 表示比值
 *
 * 例如 `foo_bar` 表示 `foo` 与 `bar` 的比 `foo/bar`
 */
export interface RenderConfig {
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
