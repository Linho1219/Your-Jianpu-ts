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
} from '../../types/layout';
import { RenderConfig } from '../../types/config';
import { Event, Action, Accidental } from '../../types/basic';
import { Tag } from '../../types/abstract';
import { RenderObject, AnchorPosition } from '../../types/layout';
import { SlicedEntity } from '../slice';
import { getBoundingBox } from '../bounding';

function engraveSliceElement(
  element: SlicedEntity,
  config: RenderConfig
): LayoutTree<RenderObject> {
  if (!element || element.type === 'PartialEvent')
    return {
      type: 'Node',
      transform: notrans(),
      children: [],
    };
  if (element.type === 'Event') return drawEvent(element.event, config);
  if (element.type === 'Tag') return drawTag(element.tag, config);
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
      return drawSound(event.value, config);
    case 'Repeater4':
      return {
        type: 'Node',
        transform: moveUp(glyphHeight / 2),
        children: [
          {
            type: 'Leaf',
            anchor: AnchorPosition.Centre,
            object: {
              type: 'rectangle',
              width: repeater4Width,
              height: repeater4Height,
            },
          },
        ],
      };
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

  const getAccidental = (
    accidental: Accidental,
    scaleY = 1
  ): LayoutTree<RenderObject> => ({
    type: 'Node',
    transform: move(-glyphWidth / 2, -glyphHeight * scaleY),
    children: [
      {
        type: 'Leaf',
        anchor: AnchorPosition.TopRight,
        object: {
          type: 'accidental',
          value: accidental,
        },
      },
    ],
  });

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
    return {
      type: 'Node',
      transform: notrans(),
      children,
    };
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
          isChord
            ? {
                type: 'Node',
                transform: {
                  localPosition: [0, 0],
                  localScale: [1, config.chordYscale],
                },
                children: [glyph],
              }
            : glyph,
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

function drawTag(tag: Tag, config: RenderConfig): LayoutTree<RenderObject> {
  const {
    barLineLength,
    barLineWidth,
    barLineLeftPadding,
    barLineRightPadding,
    thickBarLineWidth,
    thickBarLineGap,
    glyphHeight,
  } = config;

  switch (tag) {
    case 'BarLine':
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
        ],
      };

    case 'EndSign':
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
                anchor: AnchorPosition.Centre,
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
        ],
      };

    case 'TimeSignature':
      return {
        type: 'Node',
        transform: notrans(),
        children: [], // TO-DO
      };
    default:
      throw new Error(`Unknown tag type: ${tag}`);
  }
}
