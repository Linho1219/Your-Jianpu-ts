import {
  LayoutTree,
  move,
  moveLeft,
  moveRight,
  moveUp,
  moveDown,
  notrans,
  Glyph,
  whiteKeyToGlyph,
  scaleVrtcl,
  LayoutTreeLeaf,
  BBox,
  emptyBox,
} from '../../types/layout';
import { RenderConfig } from '../../types/config';
import { Event, Action, Accidental } from '../../types/basic';
import { Barline, entityLikeBarLine, Tag, TagEntity, tagLikeBarLine } from '../../types/abstract';
import { RenderObject, AnchorPosition } from '../../types/layout';
import { SlicedEntity } from '../slice';
import { getBoundingBox } from '../bounding';
import { SymbolName } from '../../svg/defReg';
import { engraveNumber, wrapNode } from './utils';

export interface EntityNonIntrusive {
  fullY: number;
  topY: number;
  topleftX: number;
  toprightX: number;
  bottomLeftX: number;
  bottomRightX: number;
  box: BBox;
}

export interface NodeWithNonIntrusive {
  node: LayoutTree<RenderObject>;
  nonIntrusive: EntityNonIntrusive;
}

const getBasicNonIntrusive = (config: RenderConfig): EntityNonIntrusive => ({
  fullY: -config.glyphHeight,
  topY: -config.glyphHeight,
  topleftX: -config.glyphWidth / 2,
  toprightX: config.glyphWidth / 2,
  bottomLeftX: -config.glyphWidth / 2,
  bottomRightX: config.glyphWidth / 2,
  box: [
    [-config.glyphWidth / 2, -config.glyphHeight],
    [config.glyphWidth / 2, 0],
  ],
});

const getEmptyNonIntrusive = (): EntityNonIntrusive => ({
  fullY: 0,
  topY: 0,
  topleftX: 0,
  toprightX: 0,
  bottomLeftX: 0,
  bottomRightX: 0,
  box: emptyBox(),
});

function engraveSliceElement(element: SlicedEntity, config: RenderConfig): NodeWithNonIntrusive {
  if (!element || element.type === 'PartialEvent')
    return { node: wrapNode(), nonIntrusive: getEmptyNonIntrusive() };
  if (element.type === 'Event') return drawEvent(element.event, config);
  if (element.type === 'Tag') {
    const node = drawTag(element, config);
    return {
      node,
      nonIntrusive: {
        fullY: -(config.glyphHeight + config.barLineLength) / 2,
        topY: -(config.glyphHeight + config.barLineLength) / 2,
        topleftX: -config.barLineLeftPadding,
        toprightX: config.barLineRightPadding,
        bottomLeftX: -config.barLineLeftPadding,
        bottomRightX: config.barLineRightPadding,
        box: getBoundingBox(node, config) ?? emptyBox(),
      },
    };
  }
  throw new Error('Unknown SliceElement kind');
}

export const engraveSliceElementWithCfg = (config: RenderConfig) => (element: SlicedEntity) =>
  engraveSliceElement(element, config);

function drawEvent(event: Event, config: RenderConfig): NodeWithNonIntrusive {
  const { glyphHeight, repeater4Width, repeater4Height, lyricSize } = config;
  switch (event.type) {
    case 'Action': {
      const { node: soundTree, nonIntrusive } = drawSound(event.value, config);
      if (!event.value.symbols) return { node: soundTree, nonIntrusive };
      const { top, left, topRight, bottomRight } = event.value.symbols;
      const symbolTrees: LayoutTree<RenderObject>[] = [];
      if (top) {
        let currentY = nonIntrusive.topY;
        const topSymbols: LayoutTree<RenderObject>[] = top.map((symbolName) => {
          currentY -= config.symbolYGap;
          const metrics = config.defReg.regAndGet(symbolName).metrics;
          const symbolNode: LayoutTree<RenderObject> = wrapNode(moveDown(currentY), {
            type: 'Leaf',
            anchor: AnchorPosition.Bottom,
            object: {
              type: 'symbol',
              value: symbolName,
              width: metrics.width,
              height: metrics.height,
            },
          });
          currentY -= metrics.height;
          return symbolNode;
        });
        nonIntrusive.topY = currentY;
        symbolTrees.push(...topSymbols);
      }
      if (bottomRight) {
        let currentX = nonIntrusive.bottomRightX;
        const bottomRightSymbols: LayoutTree<RenderObject>[] = bottomRight.map((symbolName) => {
          currentX += config.symbolXGap;
          const metrics = config.defReg.regAndGet(symbolName).metrics;
          const symbolNode: LayoutTree<RenderObject> = wrapNode(moveRight(currentX), {
            type: 'Leaf',
            anchor: AnchorPosition.BottomLeft,
            object: {
              type: 'symbol',
              value: symbolName,
              width: metrics.width,
              height: metrics.height,
            },
          });
          currentX += metrics.width;
          return symbolNode;
        });
        nonIntrusive.bottomRightX = currentX;
        symbolTrees.push(...bottomRightSymbols);
      }
      // TODO: left, topRight
      return {
        node: wrapNode(notrans(), soundTree, ...symbolTrees),
        nonIntrusive,
      };
    }
    case 'Repeater4':
      return {
        node: wrapNode(moveUp(glyphHeight / 2), {
          type: 'Leaf',
          anchor: AnchorPosition.Centre,
          object: {
            type: 'rectangle',
            width: repeater4Width,
            height: repeater4Height,
          },
        }),
        nonIntrusive: getBasicNonIntrusive(config),
      };
    case 'MultiBarRest': {
      const { count } = event;
      const hrztlBarThickness = config.smuflSize * 0.2;
      const vrtclBarThickness = config.smuflSize * 0.05;
      const vrtclBarLength = config.smuflSize * 0.5;
      const textBottomMargin = config.smuflSize * 0.25;
      const textSideMargin = config.smuflSize * 0.6;
      const children: LayoutTree<RenderObject>[] = [];
      const engravedText = engraveNumber(count, 'timeSig', config, AnchorPosition.Bottom);
      children.push(wrapNode(moveUp(textBottomMargin), engravedText.node));
      const hrztlBarLength = engravedText.metrics.width + textSideMargin * 2;
      children.push({
        type: 'Leaf',
        anchor: AnchorPosition.Centre,
        object: {
          type: 'rectangle',
          width: hrztlBarLength,
          height: hrztlBarThickness,
        },
      });
      const vrtclBar: LayoutTreeLeaf<RenderObject> = {
        type: 'Leaf',
        anchor: AnchorPosition.Centre,
        object: {
          type: 'rectangle',
          width: vrtclBarThickness,
          height: vrtclBarLength,
        },
      };
      children.push(wrapNode(moveRight(hrztlBarLength / 2), vrtclBar));
      children.push(wrapNode(moveLeft(hrztlBarLength / 2), vrtclBar));
      const node = wrapNode(moveUp(glyphHeight / 2), ...children);
      const box = getBoundingBox(node, config)!;
      const [[x1, y1], [x2]] = box;
      return {
        node,
        nonIntrusive: {
          topY: y1,
          fullY: y1,
          topleftX: x1,
          toprightX: x2,
          bottomLeftX: x1,
          bottomRightX: x2,
          box,
        },
      };
    }
    case 'Pronounce':
      // 文字
      return {
        // TODO
        node: {
          type: 'Leaf',
          anchor: AnchorPosition.Bottom,
          object: {
            type: 'text',
            size: lyricSize,
            align: 'center',
            content: event.syllable?.content || '',
          },
        },
        nonIntrusive: {
          topY: -lyricSize,
          fullY: -lyricSize,
          topleftX: 0,
          toprightX: 0,
          bottomLeftX: 0,
          bottomRightX: 0,
          box: emptyBox(),
        },
      };
  }
}

function drawSound(action: Action, config: RenderConfig): NodeWithNonIntrusive {
  const {
    dotGap,
    dotRadius,
    glyphHeight,
    glyphWidth,
    transposeDotGap,
    transposeDotRadius,
    beamGap,
    beamHeight,
    accidentalYOffset,
    symbolXGap,
  } = config;

  const getGlyph = (glyph: Glyph): LayoutTree<RenderObject> => ({
    type: 'Leaf',
    anchor: AnchorPosition.Bottom,
    object: {
      type: 'glyph',
      value: glyph,
    },
  });

  const getAsideDots = (count: number): LayoutTree<RenderObject> => ({
    type: 'Node',
    transform: move(glyphWidth / 2 + dotGap, -dotRadius),
    children: Array.from({ length: count }, (_, i) => ({
      type: 'Node',
      transform: moveRight(i * (dotGap + 2 * dotRadius)),
      children: [
        {
          type: 'Leaf',
          anchor: AnchorPosition.Left,
          object: { type: 'circle', radius: dotRadius },
        },
      ],
    })),
  });

  function getAccidental(accidental: Accidental, scaleY = 1): LayoutTree<RenderObject> {
    const { metrics } = config.defReg.regAndGet(accidental);
    return {
      type: 'Node',
      transform: move(-glyphWidth / 2 - symbolXGap, (-glyphHeight + accidentalYOffset) * scaleY),
      children: [
        {
          type: 'Leaf',
          anchor: AnchorPosition.TopRight,
          object: {
            type: 'symbol',
            value: accidental,
            width: metrics.width,
            height: metrics.height,
          },
        },
      ],
    };
  }

  function getTransposeDots(
    count: number,
    direction: 'up' | 'down',
    scaleY = 1,
    ignoreBeam = false
  ): LayoutTree<RenderObject> {
    const dots: LayoutTree<RenderObject>[] = Array.from({ length: count }, (_, i) => ({
      type: 'Node',
      transform:
        direction === 'up'
          ? moveUp(i * (transposeDotGap + 2 * transposeDotRadius))
          : moveDown(i * (transposeDotGap + 2 * transposeDotRadius)),
      children: [
        {
          type: 'Leaf',
          anchor: direction === 'up' ? AnchorPosition.Bottom : AnchorPosition.Top,
          object: { type: 'circle', radius: transposeDotRadius },
        },
      ],
    }));

    return {
      type: 'Node',
      transform:
        direction === 'up'
          ? moveUp(glyphHeight * scaleY + transposeDotGap)
          : moveDown(
              ignoreBeam
                ? transposeDotGap
                : (beamGap + beamHeight) * action.timeMultiplier + transposeDotGap
            ),
      children: dots,
    };
  }

  if (action.sound.type === 'Rest' || action.sound.type === 'Clap') {
    const glyph = action.sound.type === 'Clap' ? Glyph.GX : Glyph.G0;
    const children = [getGlyph(glyph)];

    if (action.dot) children.push(getAsideDots(action.dot));

    const node = wrapNode(notrans(), ...children);

    const box = getBoundingBox(node, config)!;
    const [[_, y1], [x2]] = box;
    const nonIntrusive: EntityNonIntrusive = {
      fullY: y1,
      topY: y1,
      topleftX: -config.glyphWidth / 2,
      toprightX: config.glyphWidth / 2,
      bottomLeftX: -config.glyphWidth / 2,
      bottomRightX: x2,
      box,
    };

    return { node, nonIntrusive };
  } else if (action.sound.type === 'Note') {
    const isChord = action.sound.pitches.length > 1;
    const scaleY = isChord ? config.chordYscale : 1;

    const rootChildren: LayoutTree<RenderObject>[] = [];

    const nonIntrusive: EntityNonIntrusive = {
      fullY: 0,
      topY: 0,
      topleftX: -config.glyphWidth / 2,
      toprightX: config.glyphWidth / 2,
      bottomLeftX: -config.glyphWidth / 2,
      bottomRightX: config.glyphWidth / 2,
      box: emptyBox(),
    };

    if (action.dot) {
      const dots = getAsideDots(action.dot);
      const [_, [x2]] = getBoundingBox(dots, config)!;
      nonIntrusive.bottomRightX = x2;
      rootChildren.push(dots);
    }

    let currentY = 0;
    const pitchNodes: LayoutTree<RenderObject>[] = action.sound.pitches
      .reverse()
      .map((pitch, index) => {
        if (index) currentY -= config.chordGap;
        const glyph = getGlyph(whiteKeyToGlyph(pitch.whiteKey));
        const children: LayoutTree<RenderObject>[] = [
          isChord ? wrapNode(scaleVrtcl(config.chordYscale), glyph) : glyph,
        ];

        if (pitch.accidental) {
          const accidental = getAccidental(pitch.accidental, scaleY);
          const [[x1]] = getBoundingBox(accidental, config)!;
          nonIntrusive.topleftX = Math.min(nonIntrusive.topleftX, x1);
          children.push(accidental);
        }

        if (pitch.octaveTranspose < 0) {
          const dots = getTransposeDots(-pitch.octaveTranspose, 'down', scaleY, !!index);
          const [_, [__, y2]] = getBoundingBox(dots, config)!;
          if (index) currentY -= -y2; // 下加点侵入下方音符，需上移
          nonIntrusive.topY = currentY - glyphHeight * scaleY;
          children.push(dots);
        } else if (pitch.octaveTranspose > 0) {
          const dots = getTransposeDots(pitch.octaveTranspose, 'up', scaleY);
          const [[_, y1]] = getBoundingBox(dots, config)!;
          nonIntrusive.topY = currentY - y1;
          children.push(dots);
        } else {
          nonIntrusive.topY = currentY - glyphHeight * scaleY;
        }

        const tree = wrapNode(moveDown(currentY), ...children);
        const [[_, y1]] = getBoundingBox(tree, config)!;
        currentY = nonIntrusive.fullY = y1;
        return tree;
      });
    rootChildren.push(...pitchNodes);
    const node = wrapNode(notrans(), ...rootChildren);
    nonIntrusive.box = getBoundingBox(node, config) ?? emptyBox();
    return {
      node,
      nonIntrusive,
    };
  } else throw new Error(`Unknown sound type`);
}

function drawTag(entity: TagEntity, config: RenderConfig): LayoutTree<RenderObject> {
  if (tagLikeBarLine(entity.tag)) return drawBarline(entity.tag, config);
  switch (entity.tag) {
    case 'TimeSignature': {
      const children: LayoutTree<RenderObject>[] = [];
      const node: LayoutTree<RenderObject> = {
        type: 'Node',
        transform: {
          localPosition: [0, -config.glyphHeight / 2],
          localScale: [1, config.timeSignatureYScale],
        },
        children,
      };
      const [numerator, denominator] = entity.value;
      const numeratorResult = engraveNumber(numerator, 'timeSig', config, AnchorPosition.Bottom);
      const denominatorResult = engraveNumber(denominator, 'timeSig', config, AnchorPosition.Top);
      children.push(wrapNode(moveUp(config.beamGap), numeratorResult.node));
      children.push(wrapNode(moveDown(config.beamGap), denominatorResult.node));
      const maxWidth =
        Math.max(numeratorResult.metrics.width, denominatorResult.metrics.width) * 1.2;
      children.push({
        type: 'Leaf',
        anchor: AnchorPosition.Centre,
        object: {
          type: 'rectangle',
          width: maxWidth,
          height: config.barLineWidth,
        },
      });
      children.push(
        wrapNode(notrans(), {
          type: 'Leaf',
          anchor: AnchorPosition.Right,
          object: {
            type: 'invisible-rectangle',
            width: config.timeSignatureLeftPadding,
            height: 0,
          },
        })
      );
      children.push(
        wrapNode(notrans(), {
          type: 'Leaf',
          anchor: AnchorPosition.Left,
          object: {
            type: 'invisible-rectangle',
            width: config.timeSignatureRightPadding,
            height: 0,
          },
        })
      );
      return node;
    }
    default:
      throw new Error(`Unknown tag type: ${entity.tag}`);
  }
}

function drawBarline(tag: Barline, config: RenderConfig): LayoutTree<RenderObject> {
  const {
    barLineLength,
    barLineWidth,
    barLineLeftPadding,
    barLineRightPadding,
    thickBarLineWidth,
    thickBarLineGap,
    glyphHeight,
  } = config;

  const barlinePadding: LayoutTree<RenderObject>[] = [
    {
      type: 'Leaf',
      anchor: AnchorPosition.Right,
      object: {
        type: 'invisible-rectangle',
        width: barLineLeftPadding,
        height: barLineLength,
      },
    },
    {
      type: 'Leaf',
      anchor: AnchorPosition.Left,
      object: {
        type: 'invisible-rectangle',
        width: barLineRightPadding,
        height: barLineLength,
      },
    },
  ];

  const getRepeatDots = (anchor: AnchorPosition): LayoutTree<RenderObject>[] => [
    {
      type: 'Node',
      transform: moveUp(barLineLength / 6),
      children: [
        {
          type: 'Leaf',
          anchor,
          object: {
            type: 'circle',
            radius: barLineWidth,
          },
        },
      ],
    },
    {
      type: 'Node',
      transform: moveDown(barLineLength / 6),
      children: [
        {
          type: 'Leaf',
          anchor,
          object: {
            type: 'circle',
            radius: barLineWidth,
          },
        },
      ],
    },
  ];

  switch (tag) {
    case Barline.BarLine:
      return {
        type: 'Node',
        transform: moveUp(glyphHeight / 2),
        children: [
          {
            type: 'Leaf',
            anchor: AnchorPosition.Centre,
            object: {
              type: 'rectangle',
              width: barLineWidth,
              height: barLineLength,
            },
          },
          ...barlinePadding,
        ],
      };
    case Barline.DashedBarLine: {
      // 3 2 3 2 3 2 3 = 18
      // ---  ---  ---  ---
      const unit = barLineLength / 18;
      const dashLength = unit * 3;
      const gapLength = unit * 2;
      const barlineChildren: LayoutTree<RenderObject>[] = [];
      for (let i = 0; i < 4; i++) {
        const offset = -barLineLength / 2 + i * (dashLength + gapLength);
        barlineChildren.push({
          type: 'Node',
          transform: moveDown(offset),
          children: [
            {
              type: 'Leaf',
              anchor: AnchorPosition.Top,
              object: {
                type: 'rectangle',
                width: barLineWidth,
                height: dashLength,
              },
            },
          ],
        });
      }
      return {
        type: 'Node',
        transform: moveUp(glyphHeight / 2),
        children: [...barlineChildren, ...barlinePadding],
      };
    }
    case Barline.DoubleBarLine:
      return {
        type: 'Node',
        transform: moveUp(glyphHeight / 2),
        children: [
          {
            type: 'Node',
            transform: moveLeft(thickBarLineGap / 2),
            children: [
              {
                type: 'Leaf',
                anchor: AnchorPosition.Right,
                object: {
                  type: 'rectangle',
                  width: barLineWidth,
                  height: barLineLength,
                },
              },
            ],
          },
          {
            type: 'Node',
            transform: moveRight(thickBarLineGap / 2),
            children: [
              {
                type: 'Leaf',
                anchor: AnchorPosition.Left,
                object: {
                  type: 'rectangle',
                  width: barLineWidth,
                  height: barLineLength,
                },
              },
            ],
          },
          ...barlinePadding,
        ],
      };
    case Barline.EndSign:
      return {
        type: 'Node',
        transform: moveUp(glyphHeight / 2),
        children: [
          {
            type: 'Node',
            transform: moveLeft(thickBarLineGap),
            children: [
              {
                type: 'Leaf',
                anchor: AnchorPosition.Right,
                object: {
                  type: 'rectangle',
                  width: barLineWidth,
                  height: barLineLength,
                },
              },
            ],
          },
          {
            type: 'Leaf',
            anchor: AnchorPosition.Left,
            object: {
              type: 'rectangle',
              width: thickBarLineWidth,
              height: barLineLength,
            },
          },
          ...barlinePadding,
        ],
      };
    case Barline.BeginRepeat:
      return {
        type: 'Node',
        transform: moveUp(glyphHeight / 2),
        children: [
          {
            type: 'Node',
            transform: moveRight(thickBarLineGap),
            children: [
              {
                type: 'Leaf',
                anchor: AnchorPosition.Left,
                object: {
                  type: 'rectangle',
                  width: barLineWidth,
                  height: barLineLength,
                },
              },
              {
                type: 'Node',
                transform: moveRight(barLineWidth + thickBarLineGap),
                children: getRepeatDots(AnchorPosition.Left),
              },
            ],
          },
          {
            type: 'Leaf',
            anchor: AnchorPosition.Right,
            object: {
              type: 'rectangle',
              width: thickBarLineWidth,
              height: barLineLength,
            },
          },
          ...barlinePadding,
        ],
      };
    case Barline.EndRepeat:
      return {
        type: 'Node',
        transform: moveUp(glyphHeight / 2),
        children: [
          {
            type: 'Node',
            transform: moveLeft(thickBarLineGap),
            children: [
              {
                type: 'Leaf',
                anchor: AnchorPosition.Right,
                object: {
                  type: 'rectangle',
                  width: barLineWidth,
                  height: barLineLength,
                },
              },
              {
                type: 'Node',
                transform: moveLeft(barLineWidth + thickBarLineGap),
                children: getRepeatDots(AnchorPosition.Right),
              },
            ],
          },
          {
            type: 'Leaf',
            anchor: AnchorPosition.Left,
            object: {
              type: 'rectangle',
              width: thickBarLineWidth,
              height: barLineLength,
            },
          },
          ...barlinePadding,
        ],
      };
    case Barline.BeginEndRepeat:
      return {
        type: 'Node',
        transform: moveUp(glyphHeight / 2),
        children: [
          {
            type: 'Node',
            transform: moveRight(thickBarLineGap + thickBarLineWidth / 2),
            children: [
              {
                type: 'Leaf',
                anchor: AnchorPosition.Left,
                object: {
                  type: 'rectangle',
                  width: barLineWidth,
                  height: barLineLength,
                },
              },
              {
                type: 'Node',
                transform: moveRight(barLineWidth + thickBarLineGap),
                children: getRepeatDots(AnchorPosition.Left),
              },
            ],
          },
          {
            type: 'Node',
            transform: moveLeft(thickBarLineGap + thickBarLineWidth / 2),
            children: [
              {
                type: 'Leaf',
                anchor: AnchorPosition.Right,
                object: {
                  type: 'rectangle',
                  width: barLineWidth,
                  height: barLineLength,
                },
              },
              {
                type: 'Node',
                transform: moveLeft(barLineWidth + thickBarLineGap),
                children: getRepeatDots(AnchorPosition.Right),
              },
            ],
          },
          {
            type: 'Leaf',
            anchor: AnchorPosition.Centre,
            object: {
              type: 'rectangle',
              width: thickBarLineWidth,
              height: barLineLength,
            },
          },
          ...barlinePadding,
        ],
      };
    default:
      throw new Error(`Unknown barline type: ${tag}`);
  }
}
