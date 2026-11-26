import { ArrowRight, X } from 'lucide-react';
import { type ReactElement, useEffect, useRef } from 'react';
import { HERO_RACK } from '../floor/racks';
import { actions, type Persona, useApp } from '../state/store';
import { Avatar } from './Avatar';
import './picker.css';
import { SCENARIOS } from './scenarios';

const SIDES: Persona[] = ['marcus', 'maya'];

/** Study mode loads fresh from the URL, so a moderator can open each side in its own tab. */
function studyUrl(who: Persona): string {
  return `?mode=try&as=${who}&study`;
}

function SideCard({ who, rackId }: { who: Persona; rackId: number }): ReactElement {
  const scenario = SCENARIOS[who];
  return (
    <article className="side" data-who={who}>
      <header className="side-head">
        <Avatar who={who} className="side-avatar" />
        <div>
          <p className="side-role">{scenario.side}</p>
          <h3 className="side-name">{scenario.name}</h3>
        </div>
      </header>
      <p className="side-bio">{scenario.bio}</p>
      <div className="side-scene">
        <h4>Your scenario</h4>
        <p>{scenario.situation(rackId)}</p>
      </div>
      <ol className="side-steps">
        {scenario.steps.map((step) => (
          <li key={step.label}>{step.label}</li>
        ))}
      </ol>
      <button
        type="button"
        className="side-play"
        data-touch={`play-${who}`}
        onClick={() => actions.startScenario(who)}
      >
        Play as {scenario.name}
        <ArrowRight aria-hidden="true" />
      </button>
    </article>
  );
}

/** Over a rack in Try mode: the two sides of the same moment, and a choice of which to play. */
export function Picker(): ReactElement | null {
  const open = useApp((state) => state.picker && state.view === 'rack');
  const rackId = useApp((state) => state.rackId);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open)
      dialog.current?.querySelector<HTMLElement>('.side-play')?.focus({ preventScroll: true });
  }, [open]);

  if (!open) return null;
  return (
    <div className="picker" role="dialog" aria-modal="true" aria-labelledby="picker-title">
      <div ref={dialog} className="picker-card">
        <button
          type="button"
          className="picker-close"
          aria-label="Back to all racks"
          onClick={actions.closePicker}
        >
          <X />
        </button>
        <header className="picker-head">
          <p className="picker-eyebrow">Rack {rackId} · Pick a side</p>
          <h2 id="picker-title">Same rack, two people. Who are you?</h2>
          <p className="picker-lede">
            The screen on every rack tells people nearby if the lifter is mid-set or resting, how
            long they’ll be, and whether they share. Play one side of the same moment.
          </p>
        </header>
        <div className="picker-sides">
          {SIDES.map((who) => (
            <SideCard key={who} who={who} rackId={rackId} />
          ))}
        </div>
        <p className="picker-foot">You can switch sides at any time.</p>
        <p className="picker-study">
          Running a usability test? Start a study session on Rack {HERO_RACK}, with no hints, as{' '}
          <a href={studyUrl('maya')}>Maya</a> or <a href={studyUrl('marcus')}>Marcus</a>.
        </p>
      </div>
    </div>
  );
}
