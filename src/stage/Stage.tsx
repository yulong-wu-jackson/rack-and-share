import { type ReactElement, useEffect, useState } from 'react';
import { director } from '../director/director';
import { Phone } from '../phone/Phone';
import { Scene } from '../scene/Scene';
import { rackStatus } from '../state/model';
import { useApp } from '../state/store';
import { Station } from '../station/Station';
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
  const watching = useApp((state) => state.mode === 'watch');
  const nfcPulse = useApp((state) => state.nfcPulse);
  // The phone is Marcus's. Before he arrives it still shows, so only a departure hides it.
  const ownerAway = useApp((state) => !state.present.marcus && state.chapter > 0);
  // While the story plays, a click on a device hands control to the viewer.
  const takeOver = watching ? director.handOver : undefined;

  return (
    <main className="viewport" data-layout={portrait ? 'portrait' : 'landscape'}>
      <div className="stage-fit" style={{ width: size.width * scale, height: size.height * scale }}>
        <div
          id={STAGE_ID}
          className="stage"
          data-status={status}
          style={{ transform: `scale(${scale})` }}
        >
          <TopBar />
          <div className="scene-band">
            <Scene />
          </div>
          <Narration />
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
          <TouchDots />
        </div>
      </div>
    </main>
  );
}
