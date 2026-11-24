import { Check, Minus, Plus, Undo2 } from 'lucide-react';
import type { ReactElement } from 'react';
import { MAX_SETS, pendingRequest } from '../state/model';
import { actions, useApp } from '../state/store';
import { TagSwitches } from './TagSwitches';

function unit(setsLeft: number, lifting: boolean): string {
  const noun = setsLeft === 1 ? 'set' : 'sets';
  return lifting ? `${noun} after this one` : `${noun} left`;
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
  const draftSets = useApp((state) => state.draftSets);
  const asked = useApp((state) => pendingRequest(state.rack) !== null);
  if (!session) return null;
  const { setsLeft, lifting } = session;
  const displayedSets = draftSets ?? setsLeft;
  const done = displayedSets === 0 && !lifting;

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
          disabled={displayedSets === 0}
          onClick={() => actions.adjustSets(-1)}
        >
          <Minus />
        </button>
        <div className="phone-count" aria-live="polite" aria-atomic="true">
          <span key={displayedSets} className="phone-number">
            {displayedSets}
          </span>
          <span className="phone-unit">{unit(displayedSets, lifting)}</span>
        </div>
        <button
          type="button"
          aria-label="One set more"
          disabled={displayedSets === MAX_SETS}
          onClick={() => actions.adjustSets(1)}
        >
          <Plus />
        </button>
      </div>
      <div className="phone-set-actions">
        {draftSets !== null && (
          <>
            <button
              type="button"
              className="phone-primary"
              data-touch="sets-confirm"
              onClick={actions.confirmSets}
            >
              <Check aria-hidden="true" />
              Confirm
            </button>
            <button type="button" className="phone-secondary" onClick={actions.undoSets}>
              <Undo2 aria-hidden="true" />
              Undo
            </button>
          </>
        )}
      </div>

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
