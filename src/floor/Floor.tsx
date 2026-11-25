import { Clock, Hand, MapPin, Sparkles, UsersRound } from 'lucide-react';
import { type ReactElement, useLayoutEffect, useRef } from 'react';
import { BrandSymbol } from '../components/BrandSymbol';
import { ColourWipe } from '../components/ColourWipe';
import { director } from '../director/director';
import { type Rack, rackStatus, timeLine } from '../state/model';
import { actions, useApp } from '../state/store';
import {
  BOARD_COPY,
  bestBet,
  type Floor as FloorState,
  LEGEND,
  RACK_IDS,
  type RackId,
  statusCounts,
  tipLine,
} from './racks';
import './floor.css';

/** Everything the tile shows, read out in one go. */
function tileLabel(id: RackId, rack: Rack): string {
  const { word, line } = BOARD_COPY[rackStatus(rack)];
  const time = rack.session ? ` ${timeLine(rack.session)}.` : '';
  const waiting = rack.waiters.length > 0 ? ` ${rack.waiters.length} waiting.` : '';
  return `Rack ${id}: ${word}. ${line}${time}${waiting}`;
}

function Tile({ id, rack }: { id: RackId; rack: Rack }): ReactElement {
  const status = rackStatus(rack);
  const { word, line } = BOARD_COPY[status];
  const { session, waiters } = rack;
  return (
    <li>
      <button
        type="button"
        className="tile"
        data-status={status}
        data-touch={`floor-rack-${id}`}
        aria-label={tileLabel(id, rack)}
        onClick={() => actions.enterRack(id)}
      >
        <ColourWipe status={status} />
        <span className="tile-head">
          <span className="tile-name">Rack {id}</span>
          {waiters.length > 0 && (
            <span className="tile-waiting" title={`${waiters.length} waiting`}>
              <UsersRound aria-hidden="true" />
              {waiters.length}
            </span>
          )}
          {status === 'mid-set' ? (
            <Hand className="tile-mark" aria-hidden="true" />
          ) : (
            <BrandSymbol className="tile-mark" />
          )}
        </span>
        <span key={status} className="tile-text">
          <strong className="tile-word">{word}</strong>
          <span className="tile-line">{line}</span>
        </span>
        <span className="tile-foot">
          {session && (
            <>
              <Clock aria-hidden="true" />
              {timeLine(session)}
            </>
          )}
        </span>
      </button>
    </li>
  );
}

function Legend({ floor }: { floor: FloorState }): ReactElement {
  const counts = statusCounts(floor);
  return (
    <section className="legend" data-cue="floor-legend">
      <h3>On the floor now</h3>
      <ul>
        {LEGEND.map(({ status, label }) => (
          <li key={status} data-status={status} data-empty={counts[status] === 0 || undefined}>
            <span className="legend-swatch" />
            <span className="legend-label">{label}</span>
            <span className="legend-count">{counts[status]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Sums offsets up to `root`. Offsets ignore transforms, so this works mid-zoom too. */
function centreWithin(element: HTMLElement, root: HTMLElement): { x: number; y: number } {
  let x = element.offsetWidth / 2;
  let y = element.offsetHeight / 2;
  let node: HTMLElement | null = element;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

/** The board by the gym door: every rack's station on one screen, laid out like the floor. */
export function Floor(): ReactElement {
  const view = useApp((state) => state.view);
  const watching = useApp((state) => state.mode === 'watch');
  const stored = useApp((state) => state.floor);
  const rack = useApp((state) => state.rack);
  const rackId = useApp((state) => state.rackId);
  const floor: FloorState = { ...stored, [rackId]: rack };
  const tip = bestBet(floor);
  const root = useRef<HTMLDivElement>(null);

  // The board zooms into, and back out of, the rack in focus. A layout switch resizes the board.
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const place = (): void => {
      const tile = element.querySelector<HTMLElement>(`[data-touch="floor-rack-${rackId}"]`);
      if (!tile) return;
      const { x, y } = centreWithin(tile, element);
      element.style.setProperty('--zoom-x', `${x}px`);
      element.style.setProperty('--zoom-y', `${y}px`);
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(element);
    return () => observer.disconnect();
  }, [rackId]);

  const rows = [RACK_IDS.slice(0, 3), RACK_IDS.slice(3)];
  return (
    <div ref={root} className="floor-view" inert={view !== 'floor'}>
      <Legend floor={floor} />
      {/* biome-ignore lint/a11y/noStaticElementInteractions: catches the click that takes over from the story */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard users take over with the mode switch */}
      <div
        className="device board"
        data-cue="floor-board"
        data-locked={watching || undefined}
        onClick={watching ? director.handOver : undefined}
      >
        <div className="board-screen">
          <header className="board-head">
            <h2>Strength floor</h2>
            <span className="board-live">Live</span>
          </header>
          <div className="board-map">
            {rows.map((row, index) => (
              <ol key={row[0]} className="board-row" data-side={index === 0 ? 'wall' : 'floor'}>
                {row.map((id) => (
                  <Tile key={id} id={id} rack={floor[id]} />
                ))}
              </ol>
            ))}
          </div>
          <footer className="board-foot">
            {tip && (
              <p key={tipLine(tip)} className="board-tip" data-cue="floor-tip">
                <Sparkles aria-hidden="true" />
                {tipLine(tip)}
              </p>
            )}
            <span className="board-here">
              <MapPin aria-hidden="true" />
              You are here
            </span>
          </footer>
        </div>
      </div>
    </div>
  );
}
