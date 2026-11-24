import { Nfc } from 'lucide-react';
import type { ReactElement } from 'react';
import { actions, useApp } from '../state/store';

/** Tags are saved: the phone waits to be tapped on a rack. */
export function Ready(): ReactElement {
  const busy = useApp((state) => state.rack.session !== null);
  const rackId = useApp((state) => state.rackId);
  return (
    <div className="phone-view phone-ready">
      <div className="phone-beacon" data-cue="phone-beacon" data-idle={busy || undefined}>
        <Nfc />
      </div>
      <h2 className="phone-title">{busy ? `Rack ${rackId} is in use` : 'Tap the rack to start'}</h2>
      <button type="button" className="phone-link" onClick={actions.editTags}>
        Edit tags
      </button>
    </div>
  );
}
