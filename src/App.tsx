import { type ReactElement, useEffect } from 'react';
import { director } from './director/director';
import { Stage } from './stage/Stage';
import { actions, useApp } from './state/store';

function isControl(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLButtonElement;
}

export function App(): ReactElement {
  useEffect(() => {
    if (useApp.getState().mode === 'watch') director.play();
  }, []);

  // The racks nobody is looking at keep going, so the board is never frozen.
  useEffect(() => {
    const timer = window.setInterval(actions.tickFloor, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const { mode, sheet } = useApp.getState();
      // Escape steps back out: first from an open panel, then from the rack to the board.
      if (mode === 'try' && event.key === 'Escape') {
        if (sheet) actions.closeSheet();
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
