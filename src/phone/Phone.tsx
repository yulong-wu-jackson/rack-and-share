import type { ReactElement } from 'react';
import { phoneScreen, useApp } from '../state/store';
import './phone.css';
import { Ready } from './Ready';
import { Session } from './Session';
import { Setup } from './Setup';
import { Waiting } from './Waiting';

/** The lifter's phone: their tags, their plan, and requests that reach them at a rest. */
export function Phone(): ReactElement {
  const screen = useApp(phoneScreen);
  return (
    <div className="phone-screen">
      <div className="phone-island" />
      {screen === 'setup' && <Setup />}
      {screen === 'ready' && <Ready />}
      {screen === 'session' && <Session />}
      {screen === 'waiting' && <Waiting />}
    </div>
  );
}
