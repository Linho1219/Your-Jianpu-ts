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

export const engraveSliceElementWithCfg =
  (config: RenderConfig) =>
  (element: SlicedEntity): LayoutTree<RenderObject> => {
    if (!element || element.type === 'PartialEvent')
      return {
        type: 'Node',
        transform: notrans(),
        children: [],
      };
    if (element.type === 'Event') return drawEvent(element.event, config);
    if (element.type === 'Tag') return drawTag(element.tag, config);
    throw new Error('Unknown SliceElement kind');
  };

function drawEvent(
  event: Event,
  config: RenderConfig
): LayoutTree<RenderObject> {
  const { glyphHeight, repeater4Width, repeater4Height } = config;
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
          size: glyphHeight,
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
    transform: move(glyphWidth / 2 + dotGap, -glyphHeight / 2),
    children: Array.from({ length: count }, (_, i) => ({
      type: 'Node',
      transform: moveRight(i * (dotGap + 2 * dotRadius)),
      children: [
        {
          type: 'Leaf',
          anchor: AnchorPosition.Centre,
          object: { type: 'circle', radius: dotRadius },
        },
      ],
    })),
  });

  const getAccidental = (accidental: Accidental): LayoutTree<RenderObject> => ({
    type: 'Node',
    transform: move(-glyphWidth / 2, -glyphHeight),
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
    beamShift = 0
  ): LayoutTree<RenderObject> {
    const dots: LayoutTree<RenderObject>[] = Array.from(
      { length: count },
      (_, i) => ({
        type: 'Node',
        transform:
          direction === 'up'
            ? moveUp(i * (transposeDotGap + 2 * transposeDotRadius))
            : moveDown(
                beamShift + i * (transposeDotGap + 2 * transposeDotRadius)
              ),
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
          ? moveUp(glyphHeight + transposeDotGap)
          : moveDown(
              (beamGap + beamHeight) * action.timeMultiplier + transposeDotGap
            ),
      children: dots,
    };
  }

  switch (action.sound.type) {
    case 'Rest':
    case 'Clap': {
      const glyph = action.sound.type === 'Clap' ? Glyph.GX : Glyph.G0;
      const children = [getGlyph(glyph)];
      if (action.dot) children.push(getAsideDots(action.dot));
      return {
        type: 'Node',
        transform: notrans(),
        children,
      };
    }
    case 'Note': {
      const rootChildren: LayoutTree<RenderObject>[] = [];
      if (action.dot) rootChildren.push(getAsideDots(action.dot));
      const pitchNodes: LayoutTree<RenderObject>[] = action.sound.pitches
        .reverse()
        .map((pitch, index) => {
          const children = [getGlyph(whiteKeyToGlyph(pitch.whiteKey))];
          if (pitch.accidental) children.push(getAccidental(pitch.accidental));
          if (pitch.octaveTranspose > 0) {
            children.unshift(getTransposeDots(pitch.octaveTranspose, 'up'));
          }
          if (pitch.octaveTranspose < 0) {
            /** 仅最下面的音符需要避开减时线 */
            const beamShift = !index
              ? (beamGap + beamHeight) * action.timeMultiplier
              : 0;
            children.push(
              getTransposeDots(-pitch.octaveTranspose, 'down', beamShift)
            );
          }
          return {
            type: 'Node',
            transform: moveUp(index * (glyphHeight + 3 * transposeDotGap)),
            children,
          };
        });
      if (pitchNodes.length === 1 && pitchNodes[0].type === 'Node')
        rootChildren.push(...pitchNodes[0].children);
      else rootChildren.push(...pitchNodes);
      return {
        type: 'Node',
        transform: notrans(),
        children: rootChildren,
      };
    }
  }
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
