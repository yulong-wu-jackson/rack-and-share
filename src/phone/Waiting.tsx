import { ArrowLeftRight, Clock, Hourglass, Nfc, Send } from 'lucide-react';
import type { ReactElement } from 'react';
import { mayaInLine } from '../scenario/scenarios';
import { type Rack, setsLine, timeLine, type Waiter } from '../state/model';
import { actions, useApp } from '../state/store';

type Tone = 'wait' | 'go' | 'turn';

interface Status {
  tone: Tone;
  icon: ReactElement;
  title: string;
  body: string;
}

/** Where Maya stands, from her request to her turn. The lifter stays nameless, as on the rack. */
function statusFor(rack: Rack, me: Waiter): Status {
  const { session, workIn, waiters } = rack;
  const place = waiters.indexOf(me) + 1;
  if (!session) {
    return {
      tone: 'turn',
      icon: <Nfc />,
      title: 'Your turn',
      body: 'Tap your phone on the rack to check in.',
    };
  }
  if (workIn.lifting) {
    return {
      tone: 'go',
      icon: <ArrowLeftRight />,
      title: 'Your set',
      body: 'The rack shows you mid-set, so nobody interrupts you either.',
    };
  }
  if (me.status === 'asked') {
    return {
      tone: 'wait',
      icon: <Send />,
      title: 'Request sent',
      body: 'The lifter sees it at their next rest. No need to walk over.',
    };
  }
  if (me.status === 'sharing') {
    return workIn.sets === 0
      ? {
          tone: 'go',
          icon: <ArrowLeftRight />,
          title: 'They said yes',
          body: 'Work in while they rest.',
        }
      : {
          tone: 'wait',
          icon: <Hourglass />,
          title: 'You’re next',
          body: 'The rack is yours when they finish.',
        };
  }
  return {
    tone: 'wait',
    icon: <Hourglass />,
    title: place === 1 ? 'You’re next' : `You’re #${place} in line`,
    body: 'We’ll tell you when the rack is free.',
  };
}

/** Maya's phone after she joins the line: her place, the lifter's answer, and the wait. */
export function Waiting(): ReactElement | null {
  const rack = useApp((state) => state.rack);
  const me = useApp(mayaInLine);
  const rackId = useApp((state) => state.rackId);
  if (!me) return null;
  const status = statusFor(rack, me);
  const { session } = rack;

  return (
    <div className="phone-view phone-waiting">
      <header className="phone-head">
        <h2 className="phone-title">Rack {rackId}</h2>
        <span className="phone-state">In line</span>
      </header>
      <section
        key={status.title}
        className="wait-status"
        data-tone={status.tone}
        data-cue="phone-waiting"
      >
        {status.icon}
        <h3>{status.title}</h3>
        <p>{status.body}</p>
      </section>
      {session && (
        <dl className="wait-facts">
          <div>
            <dt>
              <Clock aria-hidden="true" />
              Rack
            </dt>
            <dd>{timeLine(session)}</dd>
          </div>
          <div>
            <dt>Lifter</dt>
            <dd>
              {session.lifting ? 'Mid-set' : 'Resting'} · {setsLine(session)}
            </dd>
          </div>
        </dl>
      )}
      <button
        type="button"
        className="phone-secondary wait-leave"
        onClick={() => actions.leaveLine(me.id)}
      >
        Leave the line
      </button>
    </div>
  );
}
