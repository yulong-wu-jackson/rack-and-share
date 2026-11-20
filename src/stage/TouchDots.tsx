import { type ReactElement, useRef } from 'react';
import { type Persona, type Touch, useApp } from '../state/store';

/** Where each finger rests before its first touch: over that person's device. */
const HOME: Record<Persona, Touch> = {
  marcus: { x: 1153, y: 640, pressed: false },
  maya: { x: 507, y: 700, pressed: false },
};

function Dot({ who }: { who: Persona }): ReactElement {
  const touch = useApp((state) => state.touches[who]);
  const last = useRef(HOME[who]);
  if (touch) last.current = touch;
  const { x, y } = last.current;
  return (
    <div
      className={`touch touch-${who}`}
      data-on={touch ? '' : undefined}
      data-pressed={touch?.pressed ? '' : undefined}
      style={{ left: x, top: y }}
    />
  );
}

/** Fingertips that show who taps what while the story plays. */
export function TouchDots(): ReactElement {
  return (
    <>
      <Dot who="marcus" />
      <Dot who="maya" />
    </>
  );
}
