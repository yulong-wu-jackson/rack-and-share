import { type ReactElement, useEffect } from 'react';
import { director } from './director/director';
import { Stage } from './stage/Stage';
import { useApp } from './state/store';

function isControl(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLButtonElement;
}

export function App(): ReactElement {
  useEffect(() => {
    if (useApp.getState().mode === 'watch') director.play();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (useApp.getState().mode !== 'watch' || isControl(event.target)) return;
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
