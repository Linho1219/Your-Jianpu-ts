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
} from '../../types/layout';
import { RenderConfig } from '../../types/config';
import { Event, Action, Accidental } from '../../types/basic';
import {
  Barline,
  entityLikeBarLine,
  Tag,
  TagEntity,
  tagLikeBarLine,
} from '../../types/abstract';
import { RenderObject, AnchorPosition } from '../../types/layout';
import { SlicedEntity } from '../slice';
import { getBoundingBox } from '../bounding';
import { SymbolName } from '../../svg/defReg';
import { engraveNumber, wrapNode } from './utils';

function engraveSliceElement(
  element: SlicedEntity,
  config: RenderConfig
): LayoutTree<RenderObject> {
  if (!element || element.type === 'PartialEvent') return wrapNode(notrans());
  if (element.type === 'Event') return drawEvent(element.event, config);
  if (element.type === 'Tag') return drawTag(element, config);
  throw new Error('Unknown SliceElement kind');
}

export const engraveSliceElementWithCfg =
  (config: RenderConfig) => (element: SlicedEntity) =>
    engraveSliceElement(element, config);

function drawEvent(
  event: Event,
  config: RenderConfig
): LayoutTree<RenderObject> {
  const { glyphHeight, repeater4Width, repeater4Height, lyricSize } = config;
  switch (event.type) {
    case 'Action':
      const soundTree = drawSound(event.value, config);
      if (!event.value.symbols) return soundTree;
      const { top, left, topRight, bottomRight } = event.value.symbols;
      const [[_numberX1, numberY1], [numberX2]] = getBoundingBox(
        soundTree,
        config,
        ['symbol', 'circle']
      )!;
      const [[_dottedX1, dottedY1], [dottedX2]] = getBoundingBox(
        soundTree,
        config,
        ['symbol']
      )!;
      const [[fullX1, fullY1], [fullX2]] = getBoundingBox(soundTree, config)!;
      const symbolTrees: LayoutTree<RenderObject>[] = [];
      if (top) {
        let currentY = dottedY1 - config.symbolYGap;
        const topSymbols: LayoutTree<RenderObject>[] = top.map((symbolName) => {
          const metrics = config.defReg.regAndGet(symbolName).metrics;
          const symbolNode: LayoutTree<RenderObject> = wrapNode(
            moveDown(currentY),
            {
              type: 'Leaf',
              anchor: AnchorPosition.Bottom,
              object: {
                type: 'symbol',
                value: symbolName,
                width: metrics.width,
                height: metrics.height,
              },
            }
          );
          currentY -= metrics.height + config.symbolYGap;
          return symbolNode;
        });
        symbolTrees.push(...topSymbols);
      }
      if (bottomRight) {
        let currentX = fullX2 + config.symbolXGap;
        const bottomRightSymbols: LayoutTree<RenderObject>[] = bottomRight.map(
          (symbolName) => {
            const metrics = config.defReg.regAndGet(symbolName).metrics;
            const symbolNode: LayoutTree<RenderObject> = wrapNode(
              moveRight(currentX),
              {
                type: 'Leaf',
                anchor: AnchorPosition.BottomLeft,
                object: {
                  type: 'symbol',
                  value: symbolName,
                  width: metrics.width,
                  height: metrics.height,
                },
              }
            );
            currentX += metrics.width + config.symbolXGap;
            return symbolNode;
          }
        );
        symbolTrees.push(...bottomRightSymbols);
      }
      return wrapNode(notrans(), soundTree, ...symbolTrees);
    case 'Repeater4':
      return wrapNode(moveUp(glyphHeight / 2), {
        type: 'Leaf',
        anchor: AnchorPosition.Centre,
        object: {
          type: 'rectangle',
          width: repeater4Width,
          height: repeater4Height,
        },
      });
    case 'MultiBarRest':
      return {
        type: 'Node',
        transform: notrans(),
        children: [], // TO-DO
      };
    case 'Pronounce':
      // 文字
      return {
        type: 'Leaf',
        anchor: AnchorPosition.Bottom,
        object: {
          type: 'text',
          size: lyricSize,
          align: 'center',
          content: event.syllable?.content || '',
        },
      };
  }
}

function drawSound(
  action: Action,
  config: RenderConfig
): LayoutTree<RenderObject> {
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

  function getAccidental(
    accidental: Accidental,
    scaleY = 1
  ): LayoutTree<RenderObject> {
    const { metrics } = config.defReg.regAndGet(accidental);
    return {
      type: 'Node',
      transform: move(
        -glyphWidth / 2 - symbolXGap,
        (-glyphHeight + accidentalYOffset) * scaleY
      ),
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
    const dots: LayoutTree<RenderObject>[] = Array.from(
      { length: count },
      (_, i) => ({
        type: 'Node',
        transform:
          direction === 'up'
            ? moveUp(i * (transposeDotGap + 2 * transposeDotRadius))
            : moveDown(i * (transposeDotGap + 2 * transposeDotRadius)),
        children: [
          {
            type: 'Leaf',
            anchor:
              direction === 'up' ? AnchorPosition.Bottom : AnchorPosition.Top,
            object: { type: 'circle', radius: transposeDotRadius },
          },
        ],
      })
    );

    return {
      type: 'Node',
      transform:
        direction === 'up'
          ? moveUp(glyphHeight * scaleY + transposeDotGap)
          : moveDown(
              ignoreBeam
                ? transposeDotGap
                : (beamGap + beamHeight) * action.timeMultiplier +
                    transposeDotGap
            ),
      children: dots,
    };
  }

  if (action.sound.type === 'Rest' || action.sound.type === 'Clap') {
    const glyph = action.sound.type === 'Clap' ? Glyph.GX : Glyph.G0;
    const children = [getGlyph(glyph)];
    if (action.dot) children.push(getAsideDots(action.dot));
    return wrapNode(notrans(), ...children);
  } else if (action.sound.type === 'Note') {
    const isChord = action.sound.pitches.length > 1;
    const scaleY = isChord ? config.chordYscale : 1;
    const rootChildren: LayoutTree<RenderObject>[] = [];
    if (action.dot) rootChildren.push(getAsideDots(action.dot));
    let currentY = 0;
    const pitchNodes: LayoutTree<RenderObject>[] = action.sound.pitches
      .reverse()
      .map((pitch, index) => {
        const glyph = getGlyph(whiteKeyToGlyph(pitch.whiteKey));
        const children: LayoutTree<RenderObject>[] = [
          isChord ? wrapNode(scaleVrtcl(config.chordYscale), glyph) : glyph,
        ];
        if (pitch.accidental)
          children.push(getAccidental(pitch.accidental, scaleY));
        if (pitch.octaveTranspose > 0) {
          children.push(getTransposeDots(pitch.octaveTranspose, 'up', scaleY));
        }
        if (pitch.octaveTranspose < 0) {
          children.push(
            getTransposeDots(-pitch.octaveTranspose, 'down', scaleY, !!index)
          );
        }
        const tree: LayoutTree<RenderObject> = {
          type: 'Node',
          transform: moveDown(currentY),
          children,
        };
        const [[_x1, y1], [_x2, y2]] = getBoundingBox(tree, config)!;
        const paddingBottom = y2 - currentY;
        if (index && paddingBottom > 0) {
          tree.transform = moveDown(currentY - paddingBottom);
          currentY = y1 - paddingBottom - config.chordGap;
        } else currentY = y1 - config.chordGap;
        return tree;
      });
    if (pitchNodes.length === 1 && pitchNodes[0].type === 'Node')
      rootChildren.push(...pitchNodes[0].children);
    else rootChildren.push(...pitchNodes);
    return {
      type: 'Node',
      transform: notrans(),
      children: rootChildren,
    };
  } else throw new Error(`Unknown sound type`);
}

function drawTag(
  entity: TagEntity,
  config: RenderConfig
): LayoutTree<RenderObject> {
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
      const numeratorResult = engraveNumber(
        numerator,
        'timeSig',
        config,
        AnchorPosition.Bottom
      );
      const denominatorResult = engraveNumber(
        denominator,
        'timeSig',
        config,
        AnchorPosition.Top
      );
      children.push(wrapNode(moveUp(config.beamGap), numeratorResult.node));
      children.push(wrapNode(moveDown(config.beamGap), denominatorResult.node));
      const maxWidth =
        Math.max(
          numeratorResult.metrics.width,
          denominatorResult.metrics.width
        ) * 1.2;
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

function drawBarline(
  tag: Barline,
  config: RenderConfig
): LayoutTree<RenderObject> {
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

  const getRepeatDots = (
    anchor: AnchorPosition
  ): LayoutTree<RenderObject>[] => [
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
