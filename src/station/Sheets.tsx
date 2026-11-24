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
import {
  type Experience,
  GUEST_DEFAULT_SETS,
  GUEST_DEFAULT_TAGS,
  MAX_SETS,
  opensToWorkIn,
  type Rack,
  type Session,
  type ToggleTag,
} from '../state/model';
import { actions, type Sheet } from '../state/store';
import { GuideArt, type GuideStep } from './GuideArt';

const TITLES: Record<Sheet, string> = {
  guide: 'Equipment guide',
  rules: 'House rules',
  wait: 'How do you want to wait?',
  guest: 'Start without phone',
  'guest-edit': 'Edit settings',
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
        <strong>Request to work in</strong>
        <span>{sharing ? 'Ask to take turns between sets.' : 'Not sharing today.'}</span>
      </button>
      <button type="button" className="choice" onClick={() => actions.joinLine('turn')}>
        <Hourglass />
        <strong>Wait until free</strong>
        <span>Wait for the current session to end.</span>
      </button>
    </div>
  );
}

const GUEST_SWITCHES: { tag: ToggleTag; label: string }[] = [
  { tag: 'workIn', label: 'Open to work in' },
  { tag: 'spot', label: 'Can spot' },
  { tag: 'questions', label: 'Open to questions' },
];

function GuestSettings({ session }: { session?: Extract<Session, { by: 'guest' }> }): ReactElement {
  // Store the adjustment so sets started while the panel is open still count.
  const [setAdjustment, setSetAdjustment] = useState(0);
  const [tags, setTags] = useState(session?.tags ?? GUEST_DEFAULT_TAGS);
  const originalSets = session?.setsLeft ?? GUEST_DEFAULT_SETS;
  const minimum = session ? 0 : 1;
  const sets = Math.min(MAX_SETS, Math.max(minimum, originalSets + setAdjustment));

  return (
    <div className="guest">
      <div className="guest-settings">
        <div>
          <div className="guest-row">
            <span>
              {session ? (session.lifting ? 'Sets after this one' : 'Sets left') : 'Sets'}
            </span>
            <div className="stepper">
              <button
                type="button"
                aria-label="One set fewer"
                disabled={sets <= minimum}
                onClick={() => setSetAdjustment(sets - 1 - originalSets)}
              >
                <Minus />
              </button>
              <output>{sets}</output>
              <button
                type="button"
                aria-label="One set more"
                disabled={sets >= MAX_SETS}
                onClick={() => setSetAdjustment(sets + 1 - originalSets)}
              >
                <Plus />
              </button>
            </div>
          </div>
          <label className="guest-row">
            <span>Experience</span>
            <select
              value={tags.experience ?? ''}
              onChange={(event) => {
                const experience = event.currentTarget.value as Experience | '';
                setTags((current) => ({ ...current, experience: experience || null }));
              }}
            >
              <option value="">No tag</option>
              <option value="beginner">Beginner</option>
              <option value="experienced">Experienced</option>
            </select>
          </label>
        </div>
        <div>
          {GUEST_SWITCHES.map(({ tag, label }) => (
            <div key={tag} className="guest-row">
              <span>{label}</span>
              <Switch
                on={tags[tag]}
                label={label}
                onChange={(on) => setTags((current) => ({ ...current, [tag]: on }))}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="guest-actions">
        {session && (
          <button type="button" className="button button-quiet" onClick={actions.closeSheet}>
            Cancel
          </button>
        )}
        <button
          type="button"
          className="button button-ink"
          data-touch={session ? undefined : 'guest-start'}
          onClick={() =>
            session ? actions.updateGuestSettings(sets, tags) : actions.startGuest(sets, tags)
          }
        >
          {session ? 'Save changes' : 'Start'}
        </button>
      </div>
    </div>
  );
}

/** Panels slide over the tray and leave the status strip in view. */
export function SheetHost({
  sheet,
  rack,
  suspended,
}: {
  sheet: Sheet | null;
  rack: Rack;
  suspended: boolean;
}): ReactElement {
  // Keeps the last panel's content on screen while it slides away.
  const [shown, setShown] = useState<Sheet>(sheet ?? 'guide');
  if (sheet && sheet !== shown) setShown(sheet);
  return (
    <section
      className="sheet"
      data-open={sheet ? '' : undefined}
      data-suspended={suspended || undefined}
      inert={!sheet || suspended}
    >
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
      {shown === 'guest' && <GuestSettings key={sheet} />}
      {shown === 'guest-edit' && rack.session?.by === 'guest' && (
        <GuestSettings key={sheet} session={rack.session} />
      )}
    </section>
  );
}
