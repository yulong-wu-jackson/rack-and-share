import { Hand } from 'lucide-react';
import { type ReactElement, useState } from 'react';
import { BrandSymbol } from '../components/BrandSymbol';
import { type RackStatus, rackStatus } from '../state/model';
import { useApp } from '../state/store';
import { SheetHost } from './Sheets';
import './station.css';
import { Tray } from './Tray';

const COPY: Record<RackStatus, { word: string; line: string }> = {
  free: { word: 'Free', line: 'Tap your phone or start here.' },
  'your-turn': { word: 'Your turn', line: 'You’re next in line.' },
  'mid-set': { word: 'Mid-set', line: 'Please wait for the next rest.' },
  'resting-open': { word: 'Resting', line: 'Open to work in. Ask now.' },
  'resting-closed': { word: 'Resting', line: 'Not sharing today.' },
};

/** Sweeps the new state colour across the field from the bar sensor's side. */
function ColourWipe({ status }: { status: RackStatus }): ReactElement {
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

function StatusField({ status }: { status: RackStatus }): ReactElement {
  const { word, line } = COPY[status];
  return (
    <section className="status" aria-live="polite">
      <ColourWipe status={status} />
      <div key={status} className="status-text">
        <h2 className="status-word">{word}</h2>
        <p className="status-line">{line}</p>
      </div>
      <div className="status-id">
        <p className="status-rack">Rack 3</p>
        {status === 'mid-set' ? (
          <Hand className="status-hand" aria-hidden="true" />
        ) : (
          <BrandSymbol className="status-bar" />
        )}
      </div>
    </section>
  );
}

/** The screen on the rack. Anyone nearby can read it and touch it. */
export function Station(): ReactElement {
  const rack = useApp((state) => state.rack);
  const sheet = useApp((state) => state.sheet);
  const status = rackStatus(rack);
  const midSet = status === 'mid-set';
  return (
    <div className="station" data-status={status} data-compact={sheet && !midSet ? '' : undefined}>
      <StatusField status={status} />
      {!midSet && <Tray rack={rack} />}
      <SheetHost sheet={sheet} rack={rack} suspended={midSet} />
    </div>
  );
}
