import {
  BookOpen,
  Clock,
  HandHelping,
  Hourglass,
  ListChecks,
  Medal,
  MessageCircleQuestion,
  Settings,
  Sprout,
  UserRound,
  X,
} from 'lucide-react';
import type { ReactElement } from 'react';
import { mayaInLine } from '../scenario/scenarios';
import {
  activeTags,
  MAX_WAITERS,
  type Rack,
  setsLine,
  timeLine,
  type WaitStatus,
} from '../state/model';
import { actions, ownSession, useApp } from '../state/store';

const WAIT_LABEL: Record<WaitStatus, string> = {
  asked: 'Asked to work in',
  sharing: 'Working in',
  queued: 'In line',
};

function TagChips({ rack }: { rack: Rack }): ReactElement {
  const tags = activeTags(rack);
  // At rest the status line already says whether they share, so the tag would repeat it.
  return (
    <ul className="chips">
      {tags?.experience === 'beginner' && (
        <li className="chip">
          <Sprout />
          Beginner
        </li>
      )}
      {tags?.experience === 'experienced' && (
        <li className="chip">
          <Medal />
          Experienced
        </li>
      )}
      {tags?.spot && (
        <li className="chip">
          <HandHelping />
          Can spot
        </li>
      )}
      {tags?.questions && (
        <li className="chip">
          <MessageCircleQuestion />
          Open to questions
        </li>
      )}
    </ul>
  );
}

function WaiterChips({ rack }: { rack: Rack }): ReactElement | null {
  const { waiters, session } = rack;
  if (waiters.length === 0) return null;
  return (
    <ul className="waiters" data-cue="station-line">
      {waiters.map((waiter, index) => (
        <li key={waiter.id} className="waiter" data-status={waiter.status}>
          <UserRound />
          {!session && index === 0 ? 'Next' : WAIT_LABEL[waiter.status]}
          <button
            type="button"
            aria-label="Leave the line"
            onClick={() => actions.leaveLine(waiter.id)}
          >
            <X />
          </button>
        </li>
      ))}
    </ul>
  );
}

function TrayLink({
  icon,
  label,
  iconOnly,
  touch,
  onClick,
}: {
  icon: ReactElement;
  label: string;
  iconOnly: boolean;
  touch?: string;
  onClick: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      className={iconOnly ? 'button button-quiet button-icon' : 'button button-quiet'}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
      data-touch={touch}
      onClick={onClick}
    >
      {icon}
      {!iconOnly && label}
    </button>
  );
}

/** The lower half of the screen: the facts a waiting lifter plans around, and what they can do. */
export function Tray({ rack }: { rack: Rack }): ReactElement {
  const { session, waiters } = rack;
  const guest = session?.by === 'guest';
  // Playing Maya, she already has her place once she is in line.
  const inLine = useApp((state) => state.role === 'maya' && mayaInLine(state) !== null);
  // A viewer playing a side never waits for the rack they hold. Watch mode, and a Watch handover with
  // no side picked, keep the button for Maya.
  const own = useApp((state) => state.role !== null && ownSession(state));
  return (
    <section className="tray">
      {session ? (
        <div className="tray-main">
          <div className="facts" data-cue="station-facts">
            <h3 className="time">
              <Clock aria-hidden="true" />
              {timeLine(session)}
            </h3>
            <p className="sets">{setsLine(session)}</p>
            <TagChips rack={rack} />
          </div>
          <div className="line">
            {!own && (
              <button
                type="button"
                className="button button-ink"
                data-touch="wait-open"
                disabled={inLine || waiters.length >= MAX_WAITERS}
                onClick={() => actions.openSheet('wait')}
              >
                <Hourglass aria-hidden="true" />
                {inLine ? 'You’re in line' : 'I’m waiting'}
              </button>
            )}
            <WaiterChips rack={rack} />
          </div>
        </div>
      ) : (
        <div className="tray-main">
          <button
            type="button"
            className="button button-ink"
            data-touch="guest-open"
            onClick={() => actions.openSheet('guest')}
          >
            Start without phone
          </button>
          <div className="line">
            <WaiterChips rack={rack} />
          </div>
        </div>
      )}
      <div className="tray-links">
        {/* Guest buttons need the room, so the shared links shrink to icons and clear the line. */}
        <TrayLink
          icon={<BookOpen />}
          label="Equipment guide"
          iconOnly={guest}
          touch="open-guide"
          onClick={() => actions.openSheet('guide')}
        />
        <TrayLink
          icon={<ListChecks />}
          label="House rules"
          iconOnly={guest}
          onClick={() => actions.openSheet('rules')}
        />
        {guest && (
          <>
            <button
              type="button"
              className="button button-quiet"
              onClick={() => actions.openSheet('guest-edit')}
            >
              <Settings />
              Edit settings
            </button>
            <button type="button" className="button button-end" onClick={actions.endSession}>
              End session
            </button>
          </>
        )}
      </div>
    </section>
  );
}
