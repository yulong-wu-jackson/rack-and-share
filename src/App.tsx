import { type ReactElement, useEffect } from 'react';
import { director } from './director/director';
import { runScenario } from './scenario/npc';
import { Stage } from './stage/Stage';
import { actions, useApp } from './state/store';

function isControl(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLButtonElement;
}

export function App(): ReactElement {
  useEffect(() => {
    if (useApp.getState().mode === 'watch') director.play();
  }, []);

  useEffect(runScenario, []);

  // The racks nobody is looking at keep going, so the board is never frozen.
  useEffect(() => {
    const timer = window.setInterval(actions.tickFloor, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const { mode, sheet, rack, picker } = useApp.getState();
      // Escape steps back out: first from an open panel, then from the rack to the board.
      // It leaves text fields alone, and a panel hidden mid-set does not count as open.
      const typing = event.target instanceof HTMLInputElement;
      if (mode === 'try' && event.key === 'Escape' && !typing) {
        if (picker) actions.closePicker();
        else if (sheet && !rack.session?.lifting) actions.closeSheet();
        else actions.showFloor();
      }
      if (mode !== 'watch' || isControl(event.target)) return;
      if (event.key === ' ') {
        event.preventDefault();
        director.togglePause();
      }
      if (event.key === 'ArrowRight') director.jump(1);
      if (event.key === 'ArrowLeft') director.jump(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return <Stage />;
}
