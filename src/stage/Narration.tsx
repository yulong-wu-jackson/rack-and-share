import { ArrowDownToLine, ArrowUpFromLine, Nfc } from 'lucide-react';
import { type ReactElement, useState } from 'react';
import { rackStatus } from '../state/model';
import { type AppState, actions, lifterName, phoneScreen, useApp } from '../state/store';
import { flyPhoneToStation } from './phoneTap';

type WorldAction = 'tap-phone' | 'lift' | 'rack';

interface Prompt {
  headline: string;
  action: WorldAction | null;
}

const ACTIONS: Record<WorldAction, { label: string; icon: ReactElement; run(): Promise<void> }> = {
  'tap-phone': {
    label: 'Tap phone on rack',
    icon: <Nfc />,
    run: () => flyPhoneToStation(actions.phoneTap),
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
};

/** In Try mode the line describes the gym floor and offers the next physical action. */
function promptFor(state: AppState): Prompt {
  const session = state.rack.session;
  if (!session) {
    if (phoneScreen(state) === 'setup') {
      return { headline: 'Start with your phone or at the station.', action: null };
    }
    const free = rackStatus(state.rack) === 'free';
    return {
      headline: free ? 'Rack 3 is free.' : 'Rack 3 is free for the next in line.',
      action: 'tap-phone',
    };
  }
  const name = lifterName(state);
  return session.lifting
    ? { headline: `${name} is mid-set.`, action: 'rack' }
    : { headline: `${name} is resting.`, action: 'lift' };
}

export function Narration(): ReactElement {
  const watching = useApp((state) => state.mode === 'watch');
  const caption = useApp((state) => state.caption);
  const headline = useApp((state) => promptFor(state).headline);
  const actionKey = useApp((state) => promptFor(state).action);
  const [busy, setBusy] = useState(false);

  const line = watching ? caption : headline;
  const action = watching || !actionKey ? null : ACTIONS[actionKey];

  const act = async (run: () => Promise<void>): Promise<void> => {
    setBusy(true);
    await run();
    setBusy(false);
  };

  return (
    <div className="narration">
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
    </div>
  );
}
