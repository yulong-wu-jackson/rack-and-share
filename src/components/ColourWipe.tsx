import { type ReactElement, useState } from 'react';
import type { RackStatus } from '../state/model';
import './colour-wipe.css';

/** Fills its parent with the state colour and sweeps each new colour in from the bar sensor's side. */
export function ColourWipe({ status }: { status: RackStatus }): ReactElement {
  const [settled, setSettled] = useState(status);
  return (
    <>
      <div className="status-fill" data-status={settled} />
      {settled !== status && (
        <div
          key={status}
          className="status-fill status-wipe"
          data-status={status}
          onAnimationEnd={() => setSettled(status)}
        />
      )}
    </>
  );
}
