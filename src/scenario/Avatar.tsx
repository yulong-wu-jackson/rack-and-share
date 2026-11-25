import type { ReactElement } from 'react';
import { figureShape } from '../scene/figure';
import { BUILDS } from '../scene/layout';
import type { Persona } from '../state/store';

const STANDING = { squat: 0, grip: 0, reach: 0, stride: 0, phase: 0, breath: 0 };

/** The person as drawn on the gym floor, standing still. */
export function Avatar({ who, className }: { who: Persona; className?: string }): ReactElement {
  const shape = figureShape(BUILDS[who], STANDING);
  return (
    <svg
      className={`avatar avatar-${who} ${className ?? ''}`}
      viewBox="-40 -140 80 146"
      aria-hidden="true"
    >
      {shape.legs.map((d) => (
        <path key={d} d={d} strokeWidth={shape.limb.leg} />
      ))}
      <path d={shape.torso} strokeWidth={shape.limb.torso} className="avatar-fill" />
      {shape.arms.map((d) => (
        <path key={d} d={d} strokeWidth={shape.limb.arm} />
      ))}
      {shape.bun && (
        <circle className="avatar-fill" cx={shape.bun.x} cy={shape.bun.y} r={shape.bun.r} />
      )}
      <circle className="avatar-fill" cx={shape.head.x} cy={shape.head.y} r={shape.head.r} />
    </svg>
  );
}
