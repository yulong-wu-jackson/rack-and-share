import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  LayoutGrid,
  Nfc,
  RotateCcw,
} from 'lucide-react';
import { type ReactElement, useState } from 'react';
import { Avatar } from '../scenario/Avatar';
import { type Prompt, SCENARIOS, scenarioDone, type WorldAction } from '../scenario/scenarios';
import { rackStatus } from '../state/model';
import {
  type AppState,
  actions,
  checkedInElsewhere,
  lifterName,
  ownSession,
  type Persona,
  phoneScreen,
  useApp,
} from '../state/store';
import { flyPhoneToStation } from './phoneTap';

const ACTIONS: Record<WorldAction, { label: string; icon: ReactElement; run(): Promise<void> }> = {
  'tap-phone': {
    label: 'Tap phone on rack',
    icon: <Nfc />,
    run: () => {
      // The viewer may walk away while the phone is in the air; the tap only counts where it began.
      const { rackId } = useApp.getState();
      return flyPhoneToStation(() => {
        const now = useApp.getState();
        if (now.view === 'rack' && now.rackId === rackId) actions.phoneTap();
      });
    },
  },
  lift: {
    label: 'Start a set',
    icon: <ArrowUpFromLine />,
    run: async () => actions.liftBar(),
  },
  rack: {
    label: 'Finish this set',
    icon: <ArrowDownToLine />,
    run: async () => actions.rackBar(),
  },
  'work-in': {
    label: 'Work in a set',
    icon: <ArrowLeftRight />,
    run: async () => actions.startWorkIn(),
  },
  'finish-work-in': {
    label: 'Finish your set',
    icon: <ArrowDownToLine />,
    run: async () => actions.finishWorkIn(),
  },
};

/** Without a side picked, the line describes the gym floor and offers the next physical action. */
function freePrompt(state: AppState): Prompt {
  const prompt = (headline: string, action: WorldAction | null = null): Prompt => ({
    headline,
    action,
    cue: null,
  });
  if (state.view === 'floor') return prompt('Pick a rack on the board to walk over to it.');
  const session = state.rack.session;
  if (!session) {
    const elsewhere = checkedInElsewhere(state);
    if (elsewhere !== null) return prompt(`You're checked in on Rack ${elsewhere}.`);
    if (phoneScreen(state) === 'setup') return prompt('Start with your phone or at the station.');
    const rack = `Rack ${state.rackId}`;
    const free = rackStatus(state.rack) === 'free';
    return prompt(free ? `${rack} is free.` : `${rack} is free for the next in line.`, 'tap-phone');
  }
  const name = lifterName(state);
  // Other lifters run their own workouts; the viewer only lifts in sessions they started.
  const own = ownSession(state);
  return session.lifting
    ? prompt(`${name} is mid-set.`, own ? 'rack' : null)
    : prompt(`${name} is resting.`, own ? 'lift' : null);
}

/** What the panel says now: the scenario's next step once a side is picked, or the free line. */
export function currentPrompt(state: AppState): Prompt {
  const playing =
    state.role !== null && state.view === 'rack' && state.rackId === state.scenarioRack;
  if (!playing || !state.role) return freePrompt(state);
  if (scenarioDone(state))
    return { headline: SCENARIOS[state.role].outcome, action: null, cue: null };
  return SCENARIOS[state.role].prompt(state);
}

function other(who: Persona): Persona {
  return who === 'marcus' ? 'maya' : 'marcus';
}

/** Who the viewer is, and how far through the scenario they are. */
function RoleBar({ role }: { role: Persona }): ReactElement {
  const step = useApp((state) => state.step);
  const steps = SCENARIOS[role].steps;
  const done = step >= steps.length;
  return (
    <div className="role" data-who={role}>
      <div className="role-row">
        <Avatar who={role} className="role-avatar" />
        <p className="role-name">
          You’re <strong>{SCENARIOS[role].name}</strong>
        </p>
        <button
          type="button"
          className="role-switch"
          onClick={() =>
            actions.startScenario(other(role), useApp.getState().scenarioRack ?? undefined)
          }
        >
          Switch
        </button>
      </div>
      <ol
        className="role-steps"
        aria-label={done ? 'All steps done' : `Step ${step + 1} of ${steps.length}`}
      >
        {steps.map((item, index) => (
          <li
            key={item.label}
            title={item.label}
            data-state={index < step ? 'done' : index === step ? 'current' : 'todo'}
          />
        ))}
      </ol>
    </div>
  );
}

function Finished({ role }: { role: Persona }): ReactElement {
  const rackId = useApp((state) => state.scenarioRack ?? state.rackId);
  const next = other(role);
  return (
    <div className="finished">
      <button
        type="button"
        className="world-action"
        onClick={() => actions.startScenario(next, rackId)}
      >
        <RotateCcw />
        Now play {SCENARIOS[next].name}
      </button>
      <button type="button" className="finished-link" onClick={actions.showFloor}>
        <LayoutGrid aria-hidden="true" />
        All racks
      </button>
    </div>
  );
}

export function Narration(): ReactElement {
  const watching = useApp((state) => state.mode === 'watch');
  const caption = useApp((state) => state.caption);
  const headline = useApp((state) => currentPrompt(state).headline);
  const actionKey = useApp((state) => currentPrompt(state).action);
  const role = useApp((state) =>
    state.mode === 'try' && state.view === 'rack' && state.rackId === state.scenarioRack
      ? state.role
      : null,
  );
  const done = useApp(scenarioDone);
  const [busy, setBusy] = useState(false);

  const line = watching ? caption : headline;
  const action = watching || !actionKey ? null : ACTIONS[actionKey];

  const act = async (run: () => Promise<void>): Promise<void> => {
    setBusy(true);
    await run();
    setBusy(false);
  };

  return (
    <div className="narration" data-scenario={role ?? undefined}>
      {role && <RoleBar role={role} />}
      <p key={line} className="caption" aria-live="polite">
        {line}
      </p>
      {action && (
        <button
          type="button"
          className="world-action"
          disabled={busy}
          onClick={() => void act(action.run)}
        >
          {action.icon}
          {action.label}
        </button>
      )}
      {role && done && <Finished role={role} />}
    </div>
  );
}
