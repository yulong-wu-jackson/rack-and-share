import type { ReactElement } from 'react';
import { type Build, figureShape, type Pose } from '../scene/figure';

export type GuideStep = 'hooks' | 'safeties' | 'plates';

const WIDTH = 220;
/** Cropped close to the drawing so it fills its card. */
const VIEW_BOX = '18 2 184 150';
const FLOOR = 138;
const CENTRE = WIDTH / 2;
const UPRIGHT = 44;
const BUILD: Build = { height: 96, shoulders: 24, bun: false };
const STANDING: Pose = {
  squat: 0,
  grip: 0,
  reach: 0,
  stride: 0,
  phase: 0,
  breath: 0,
};
const SQUATTING: Pose = { ...STANDING, squat: 1, grip: 1 };

function Person({ pose }: { pose: Pose }): ReactElement {
  const shape = figureShape(BUILD, pose);
  return (
    <g className="art-person" transform={`translate(${CENTRE} ${FLOOR})`}>
      <path d={shape.legs[0]} strokeWidth={shape.limb.leg} />
      <path d={shape.legs[1]} strokeWidth={shape.limb.leg} />
      <path d={shape.torso} strokeWidth={shape.limb.torso} className="art-solid" />
      <path d={shape.arms[0]} strokeWidth={shape.limb.arm} />
      <path d={shape.arms[1]} strokeWidth={shape.limb.arm} />
      <circle className="art-solid" cx={shape.head.x} cy={shape.head.y} r={shape.head.r} />
    </g>
  );
}

function Frame(): ReactElement {
  return (
    <g className="art-steel">
      <rect x={CENTRE - UPRIGHT - 3} y="16" width="6" height={FLOOR - 16} />
      <rect x={CENTRE + UPRIGHT - 3} y="16" width="6" height={FLOOR - 16} />
      <rect x={CENTRE - UPRIGHT - 3} y="16" width={UPRIGHT * 2 + 6} height="6" rx="2" />
    </g>
  );
}

function Bar({ y, reach = 78 }: { y: number; reach?: number }): ReactElement {
  return (
    <g transform={`translate(${CENTRE} ${y})`}>
      <line className="art-bar" x1={-reach} x2={reach} y1="0" y2="0" />
      {([-1, 1] as const).map((side) => (
        <g key={side} transform={`scale(${side} 1)`} className="art-plate">
          <rect x={reach - 26} y="-19" width="8" height="38" rx="3" />
          <rect x={reach - 16} y="-14" width="6" height="28" rx="2.5" />
        </g>
      ))}
    </g>
  );
}

/** Marks both uprights at one height: where the hooks or the safeties go. */
function Marks({ y, joined = false }: { y: number; joined?: boolean }): ReactElement {
  return (
    <g className="art-mark">
      {joined && (
        <line className="art-guide" x1={CENTRE - UPRIGHT} x2={CENTRE + UPRIGHT} y1={y} y2={y} />
      )}
      <rect x={CENTRE - UPRIGHT - 8} y={y - 3.5} width="16" height="7" rx="2.5" />
      <rect x={CENTRE + UPRIGHT - 8} y={y - 3.5} width="16" height="7" rx="2.5" />
    </g>
  );
}

function Plates(): ReactElement {
  return (
    <g transform={`translate(${CENTRE} 76)`}>
      <line className="art-bar" x1="-88" x2="88" y1="0" y2="0" />
      {([-1, 1] as const).map((side) => (
        <g key={side} transform={`scale(${side} 1)`}>
          <g className="art-plate">
            <rect x="46" y="-40" width="12" height="80" rx="4" />
            <rect x="60" y="-30" width="10" height="60" rx="4" />
          </g>
          <rect className="art-mark" x="72" y="-10" width="8" height="20" rx="3" />
        </g>
      ))}
    </g>
  );
}

export function GuideArt({ step }: { step: GuideStep }): ReactElement {
  const chest = FLOOR + figureShape(BUILD, STANDING).barY + 14;
  const lowest = FLOOR + figureShape(BUILD, SQUATTING).barY;
  return (
    <svg className="guide-art" viewBox={VIEW_BOX} aria-hidden="true">
      {step === 'hooks' && (
        <>
          <Frame />
          <Person pose={STANDING} />
          <Bar y={chest - 5} />
          <Marks y={chest} />
        </>
      )}
      {step === 'safeties' && (
        <>
          <Frame />
          <Bar y={lowest} />
          <Person pose={SQUATTING} />
          <Marks y={lowest + 15} joined />
        </>
      )}
      {step === 'plates' && <Plates />}
    </svg>
  );
}
