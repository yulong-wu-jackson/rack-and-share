import { type ReactElement, useEffect, useState } from 'react';
import { director } from '../director/director';
import { ARRIVAL_CHAPTER } from '../director/script';
import { Floor } from '../floor/Floor';
import { Phone } from '../phone/Phone';
import { Picker } from '../scenario/Picker';
import { SCENARIOS } from '../scenario/scenarios';
import { Scene } from '../scene/Scene';
import { rackStatus } from '../state/model';
import { type Persona, useApp } from '../state/store';
import { Station } from '../station/Station';
import { Cue } from './Cue';
import { PHONE_ID, STAGE_ID, STATION_ID } from './geometry';
import { Narration } from './Narration';
import './stage.css';
import { TopBar } from './TopBar';
import { TouchDots } from './TouchDots';

const LANDSCAPE = { width: 1440, height: 860 };
const PORTRAIT = { width: 820, height: 1716 };

interface Fit {
  portrait: boolean;
  scale: number;
}

function fitToWindow(): Fit {
  const { innerWidth, innerHeight } = window;
  const portrait = innerWidth / innerHeight < 0.9;
  const scale = portrait
    ? innerWidth / PORTRAIT.width
    : Math.min(innerWidth / LANDSCAPE.width, innerHeight / LANDSCAPE.height);
  return { portrait, scale };
}

function useFit(): Fit {
  const [fit, setFit] = useState(fitToWindow);
  useEffect(() => {
    const onResize = (): void => setFit(fitToWindow());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return fit;
}

/** One fixed-size stage, scaled to the window: the gym behind, the two devices in front. */
export function Stage(): ReactElement {
  const { portrait, scale } = useFit();
  const size = portrait ? PORTRAIT : LANDSCAPE;
  const status = useApp((state) => rackStatus(state.rack));
  const view = useApp((state) => state.view);
  const watching = useApp((state) => state.mode === 'watch');
  const nfcPulse = useApp((state) => state.nfcPulse);
  const picking = useApp((state) => state.picker);
  // The phone is the viewer's in a scenario, else Marcus's.
  const owner: Persona = useApp((state) => state.role ?? 'marcus');
  const yours = useApp((state) => state.role !== null);
  // Before its owner arrives it still shows, so only a departure hides it.
  const ownerAway = useApp(
    (state) => !state.present[owner] && (state.mode === 'try' || state.chapter > ARRIVAL_CHAPTER),
  );
  // While the story plays, a click on a device hands control to the viewer.
  const takeOver = watching ? director.handOver : undefined;

  return (
    <main className="viewport" data-layout={portrait ? 'portrait' : 'landscape'}>
      <div className="stage-fit" style={{ width: size.width * scale, height: size.height * scale }}>
        <div
          id={STAGE_ID}
          className="stage"
          data-status={status}
          data-view={view}
          style={{ transform: `scale(${scale})` }}
        >
          <Floor />
          <div className="rack-view" inert={view !== 'rack' || picking}>
            <div className="scene-band">
              <Scene />
            </div>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: catches the click that takes over from the story */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard users take over with the mode switch */}
            <div
              id={STATION_ID}
              className="device tablet"
              data-locked={watching || undefined}
              onClick={takeOver}
            >
              <Station />
            </div>
            {nfcPulse > 0 && <div key={nfcPulse} className="nfc-contact" />}
            <p className="device-label" data-who={owner} data-away={ownerAway || undefined}>
              {SCENARIOS[owner].name}’s phone
              {yours && <span className="device-label-you">You</span>}
            </p>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: catches the click that takes over from the story */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard users take over with the mode switch */}
            <div
              id={PHONE_ID}
              className="device phone"
              data-locked={watching || undefined}
              data-away={ownerAway || undefined}
              onClick={takeOver}
            >
              <Phone />
            </div>
          </div>
          {/* After the full-stage views, so neither covers its buttons. */}
          <Picker />
          <TopBar />
          <Narration />
          <Cue />
          <TouchDots />
        </div>
      </div>
    </main>
  );
}
