import { Minus, Plus } from 'lucide-react';
import { type ReactElement, useEffect, useRef } from 'react';
import { MAX_SETS, pendingRequest, type Session as RackSession } from '../state/model';
import { actions, useApp } from '../state/store';
import { TagSwitches } from './TagSwitches';

const TOAST_MS = 4500;

function unit({ setsLeft, lifting }: RackSession): string {
  const noun = setsLeft === 1 ? 'set' : 'sets';
  return lifting ? `${noun} after this one` : `${noun} left`;
}

/** Confirms a change to the count where the lifter is looking, with a way back. */
function Toast(): ReactElement {
  const toast = useApp((state) => state.toast);
  // Holds the last message while the toast fades out.
  const sets = useRef(0);
  if (toast) sets.current = toast.sets;
  const id = toast?.id;
  useEffect(() => {
    if (id === undefined) return;
    const timer = window.setTimeout(() => actions.dismissToast(id), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [id]);

  return (
    <div className="phone-toast" data-on={toast ? '' : undefined} inert={!toast} role="status">
      Rack updated: {sets.current} {sets.current === 1 ? 'set' : 'sets'}
      <button type="button" onClick={actions.undoSets}>
        Undo
      </button>
    </div>
  );
}

function Request({ open }: { open: boolean }): ReactElement {
  return (
    <div className="phone-request" data-open={open ? '' : undefined} inert={!open}>
      <h3>Someone wants to work in.</h3>
      <button
        type="button"
        className="phone-primary"
        data-touch="request-accept"
        onClick={() => actions.answerWorkIn(true)}
      >
        Share the rack
      </button>
      <button type="button" className="phone-secondary" onClick={() => actions.answerWorkIn(false)}>
        Not now
      </button>
    </div>
  );
}

/** Checked in: the plan, the tags, and the way out. */
export function Session(): ReactElement | null {
  const session = useApp((state) => state.rack.session);
  const asked = useApp((state) => pendingRequest(state.rack) !== null);
  if (!session) return null;
  const { setsLeft, lifting } = session;
  const done = setsLeft === 0 && !lifting;

  return (
    <div className="phone-view phone-session">
      <header className="phone-head">
        <h2 className="phone-title">Rack 3</h2>
        <span className="phone-state" data-lifting={lifting || undefined}>
          {lifting ? 'Mid-set' : 'Resting'}
        </span>
      </header>

      <div className="phone-counter">
        <button
          type="button"
          aria-label="One set fewer"
          data-touch="sets-minus"
          disabled={setsLeft === 0}
          onClick={() => actions.adjustSets(-1)}
        >
          <Minus />
        </button>
        <div className="phone-count">
          <span key={setsLeft} className="phone-number">
            {setsLeft}
          </span>
          <span className="phone-unit">{unit(session)}</span>
        </div>
        <button
          type="button"
          aria-label="One set more"
          disabled={setsLeft === MAX_SETS}
          onClick={() => actions.adjustSets(1)}
        >
          <Plus />
        </button>
      </div>
      <Toast />

      <TagSwitches />
      <button
        type="button"
        className="phone-end"
        data-touch="end-session"
        data-done={done || undefined}
        onClick={actions.endSession}
      >
        End session
      </button>
      <Request open={asked} />
    </div>
  );
}
