import {
  ArrowLeftRight,
  Dumbbell,
  Hand,
  Hourglass,
  MessagesSquare,
  Minus,
  Plus,
  X,
} from 'lucide-react';
import { type ReactElement, useState } from 'react';
import { Switch } from '../components/Switch';
import { GUEST_DEFAULT_SETS, MAX_SETS, opensToWorkIn, type Rack } from '../state/model';
import { actions, type Sheet } from '../state/store';
import { GuideArt, type GuideStep } from './GuideArt';

const TITLES: Record<Sheet, string> = {
  guide: 'Equipment guide',
  rules: 'House rules',
  wait: 'How do you want to wait?',
  guest: 'Start without phone',
};

const GUIDE_STEPS: { step: GuideStep; text: string }[] = [
  { step: 'hooks', text: 'Set the hooks at chest height.' },
  { step: 'safeties', text: 'Set the safeties just below your lowest squat.' },
  { step: 'plates', text: 'Load both sides the same, then clip them.' },
];

function Guide(): ReactElement {
  return (
    <ol className="guide">
      {GUIDE_STEPS.map(({ step, text }, index) => (
        <li key={step}>
          <GuideArt step={step} />
          <p>
            <span className="guide-number">{index + 1}</span>
            {text}
          </p>
        </li>
      ))}
    </ol>
  );
}

function Rules(): ReactElement {
  return (
    <ul className="rules">
      <li>
        <Hand />
        Wait for a rest before you ask.
      </li>
      <li>
        <MessagesSquare />
        Ask before you work in.
      </li>
      <li>
        <Dumbbell />
        Put your plates back.
      </li>
    </ul>
  );
}

function WaitChoice({ rack }: { rack: Rack }): ReactElement {
  const sharing = opensToWorkIn(rack);
  return (
    <div className="choices">
      <button
        type="button"
        className="choice"
        data-touch="wait-work-in"
        disabled={!sharing}
        onClick={() => actions.joinLine('work-in')}
      >
        <ArrowLeftRight />
        <strong>Work in</strong>
        <span>{sharing ? 'Take turns between sets.' : 'Not sharing today.'}</span>
      </button>
      <button type="button" className="choice" onClick={() => actions.joinLine('turn')}>
        <Hourglass />
        <strong>Wait my turn</strong>
        <span>Get the rack when it is free.</span>
      </button>
    </div>
  );
}

function GuestStart(): ReactElement {
  const [sets, setSets] = useState(GUEST_DEFAULT_SETS);
  const [workIn, setWorkIn] = useState(true);
  return (
    <div className="guest">
      <div className="guest-row">
        <span>Sets</span>
        <div className="stepper">
          <button
            type="button"
            aria-label="One set fewer"
            disabled={sets <= 1}
            onClick={() => setSets(sets - 1)}
          >
            <Minus />
          </button>
          <output>{sets}</output>
          <button
            type="button"
            aria-label="One set more"
            disabled={sets >= MAX_SETS}
            onClick={() => setSets(sets + 1)}
          >
            <Plus />
          </button>
        </div>
      </div>
      <div className="guest-row">
        <span>Open to work in</span>
        <Switch on={workIn} label="Open to work in" onChange={setWorkIn} />
      </div>
      <button
        type="button"
        className="button button-ink"
        data-touch="guest-start"
        onClick={() => actions.startGuest(sets, workIn)}
      >
        Start
      </button>
    </div>
  );
}

/** Panels slide over the tray and leave the status strip in view. */
export function SheetHost({ sheet, rack }: { sheet: Sheet | null; rack: Rack }): ReactElement {
  // Keeps the last panel's content on screen while it slides away.
  const [shown, setShown] = useState<Sheet>(sheet ?? 'guide');
  if (sheet && sheet !== shown) setShown(sheet);
  return (
    <section className="sheet" data-open={sheet ? '' : undefined} inert={!sheet}>
      <header className="sheet-head">
        <h3>{TITLES[shown]}</h3>
        <button
          type="button"
          className="sheet-close"
          data-touch="sheet-close"
          aria-label="Close"
          onClick={actions.closeSheet}
        >
          <X />
        </button>
      </header>
      {shown === 'guide' && <Guide />}
      {shown === 'rules' && <Rules />}
      {shown === 'wait' && <WaitChoice rack={rack} />}
      {shown === 'guest' && <GuestStart key={sheet} />}
    </section>
  );
}
