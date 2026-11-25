import { Nfc } from 'lucide-react';
import type { ReactElement } from 'react';
import { actions, checkedInElsewhere, useApp } from '../state/store';

function title(rackId: number, busy: boolean, elsewhere: number | null): string {
  if (elsewhere !== null) return `You're checked in on Rack ${elsewhere}`;
  return busy ? `Rack ${rackId} is in use` : 'Tap the rack to start';
}

/** Tags are saved: the phone waits to be tapped on a rack. */
export function Ready(): ReactElement {
  const busy = useApp((state) => state.rack.session !== null);
  const rackId = useApp((state) => state.rackId);
  const elsewhere = useApp(checkedInElsewhere);
  return (
    <div className="phone-view phone-ready">
      <div
        className="phone-beacon"
        data-cue="phone-beacon"
        data-idle={busy || elsewhere !== null || undefined}
      >
        <Nfc />
      </div>
      <h2 className="phone-title">{title(rackId, busy, elsewhere)}</h2>
      <button type="button" className="phone-link" onClick={actions.editTags}>
        Edit tags
      </button>
    </div>
  );
}
