import type { CSSProperties, ReactElement } from 'react';
import { type Persona, useApp } from '../state/store';
import { type FigureShape, figureShape } from './figure';
import {
  BUILDS,
  FLOOR,
  RACK_HEIGHT,
  RACK_X,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  SCREEN,
  UPRIGHT_OFFSET,
} from './layout';
import './scene.css';
import { type Actor, useSceneSim } from './useSceneSim';

const UPRIGHT_WIDTH = 7;
const ARM_Y = FLOOR - 124;
/** Enlarges the whole scene around the rack's footing. */
const ZOOM = `translate(${RACK_X} ${FLOOR}) scale(1.16) translate(${-RACK_X} ${-FLOOR})`;
/** Where the dotted line from the small screen meets the large one below the scene. */
const TETHER_END = FLOOR + 30;
const SCREEN_CENTRE = {
  x: SCREEN.x + SCREEN.width / 2,
  y: SCREEN.y + SCREEN.height / 2,
};

function Figure({
  who,
  actor,
  shape,
}: {
  who: Persona;
  actor: Actor;
  shape: FigureShape;
}): ReactElement {
  return (
    <g
      className={`figure figure-${who}`}
      transform={`translate(${actor.x.toFixed(1)} ${FLOOR})`}
      opacity={actor.opacity}
    >
      <ellipse className="figure-shadow" cx="0" cy="3" rx="22" ry="3.5" />
      {shape.legs.map((d) => (
        <path key={d} d={d} strokeWidth={shape.limb.leg} />
      ))}
      <path d={shape.torso} strokeWidth={shape.limb.torso} className="figure-torso" />
      {shape.arms.map((d) => (
        <path key={d} d={d} strokeWidth={shape.limb.arm} />
      ))}
      {shape.bun && (
        <circle className="figure-fill" cx={shape.bun.x} cy={shape.bun.y} r={shape.bun.r} />
      )}
      <circle className="figure-fill" cx={shape.head.x} cy={shape.head.y} r={shape.head.r} />
    </g>
  );
}

function Upright({ side }: { side: -1 | 1 }): ReactElement {
  const x = RACK_X + side * UPRIGHT_OFFSET;
  return (
    <g>
      <rect
        className="steel"
        x={x - UPRIGHT_WIDTH / 2}
        y={FLOOR - RACK_HEIGHT}
        width={UPRIGHT_WIDTH}
        height={RACK_HEIGHT}
      />
      <line className="holes" x1={x} x2={x} y1={FLOOR - RACK_HEIGHT + 14} y2={FLOOR - 12} />
      <rect className="steel" x={x - 15} y={FLOOR - 4} width="30" height="4" rx="2" />
      <rect className="steel-light" x={x - 5} y={FLOOR - 60} width="10" height="5" rx="1.5" />
    </g>
  );
}

function Barbell({ y }: { y: number }): ReactElement {
  return (
    <g transform={`translate(${RACK_X} ${y.toFixed(1)})`}>
      <line className="bar" x1="-86" x2="86" y1="0" y2="0" />
      {([-1, 1] as const).map((side) => (
        <g key={side} transform={`scale(${side} 1)`}>
          <rect className="plate" x="53" y="-23" width="8" height="46" rx="3" />
          <rect className="plate plate-small" x="62" y="-17" width="6" height="34" rx="2.5" />
          <rect className="collar" x="69" y="-5" width="4" height="10" rx="1.5" />
        </g>
      ))}
    </g>
  );
}

/** The gym floor: a rack with its screen, the lifter, and whoever is waiting. */
export function Scene(): ReactElement {
  const frame = useSceneSim();
  // Like the station, the screen shows its tray only while the lifter rests.
  const resting = useApp((state) => state.rack.session?.lifting === false);
  const gaze = useApp((state) => state.gaze);
  const sensorPulse = useApp((state) => state.sensorPulse);
  const nfcPulse = useApp((state) => state.nfcPulse);

  const shapes: Record<Persona, FigureShape> = {
    marcus: figureShape(BUILDS.marcus, frame.actors.marcus.pose),
    maya: figureShape(BUILDS.maya, frame.actors.maya.pose),
  };
  const hookY = FLOOR + frame.hookY;
  const barY = frame.carrier ? FLOOR + shapes[frame.carrier].barY : hookY;
  const hookX = RACK_X + UPRIGHT_OFFSET;
  const sensorTravel = {
    '--dx': `${SCREEN.x - hookX}px`,
    '--dy': `${ARM_Y - hookY}px`,
  } as CSSProperties;

  return (
    <svg
      className="scene"
      viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
      role="img"
      aria-label="A squat rack with a status screen, a lifter, and a person waiting"
    >
      <defs>
        <radialGradient id="screen-glow">
          <stop offset="0" className="glow-core" />
          <stop offset="1" className="glow-edge" />
        </radialGradient>
      </defs>

      <g transform={ZOOM}>
        <circle className="glow" cx={SCREEN_CENTRE.x} cy={SCREEN_CENTRE.y} r="190" />
        <ellipse className="floor-glow" cx={SCREEN_CENTRE.x} cy={FLOOR + 5} rx="130" ry="6" />
        <line
          className="tether"
          x1={SCREEN_CENTRE.x}
          x2={SCREEN_CENTRE.x}
          y1={SCREEN.y + SCREEN.height + 6}
          y2={TETHER_END}
        />

        <rect
          className="steel"
          x={RACK_X - UPRIGHT_OFFSET - UPRIGHT_WIDTH / 2}
          y={FLOOR - RACK_HEIGHT}
          width={UPRIGHT_OFFSET * 2 + UPRIGHT_WIDTH}
          height={UPRIGHT_WIDTH}
          rx="2"
        />
        <Upright side={-1} />
        <Upright side={1} />
        <line className="mount" x1={hookX} x2={SCREEN.x} y1={ARM_Y} y2={ARM_Y} />

        {([-1, 1] as const).map((side) => (
          <rect
            key={side}
            className="steel-light"
            x={RACK_X + side * UPRIGHT_OFFSET - 6}
            y={hookY + 2}
            width="12"
            height="5"
            rx="2"
          />
        ))}
        <Barbell y={barY} />

        <g className="screen" data-resting={resting || undefined}>
          <rect
            className="screen-bezel"
            x={SCREEN.x - 3}
            y={SCREEN.y - 3}
            width={SCREEN.width + 6}
            height={SCREEN.height + 6}
            rx="7"
          />
          <rect
            className="screen-face"
            x={SCREEN.x}
            y={SCREEN.y}
            width={SCREEN.width}
            height={SCREEN.height}
            rx="4"
          />
          <rect
            className="screen-word"
            x={SCREEN.x + 7}
            y={SCREEN.y + 8}
            width="30"
            height="7"
            rx="3.5"
          />
          <rect
            className="screen-tray"
            x={SCREEN.x}
            y={SCREEN.y + 27}
            width={SCREEN.width}
            height="17"
          />
        </g>
        <circle className="sensor" cx={hookX} cy={hookY - 3} r="2.6" />
        {sensorPulse > 0 && (
          <circle
            key={`sensor-${sensorPulse}`}
            className="sensor-pulse"
            cx={hookX}
            cy={hookY - 3}
            r="4"
            style={sensorTravel}
          />
        )}
        {nfcPulse > 0 && (
          <g key={`nfc-${nfcPulse}`} className="nfc-rings">
            <circle cx={SCREEN_CENTRE.x} cy={SCREEN_CENTRE.y} r="26" />
            <circle cx={SCREEN_CENTRE.x} cy={SCREEN_CENTRE.y} r="26" />
          </g>
        )}

        <line
          className="gaze"
          data-on={gaze || undefined}
          x1={frame.actors.maya.x - 12}
          y1={FLOOR - 100}
          x2={SCREEN.x + SCREEN.width + 6}
          y2={SCREEN_CENTRE.y}
        />

        <Figure who="marcus" actor={frame.actors.marcus} shape={shapes.marcus} />
        <Figure who="maya" actor={frame.actors.maya} shape={shapes.maya} />
      </g>
    </svg>
  );
}
