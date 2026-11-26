import { ChevronRight, LayoutGrid, Pause, Play, RotateCcw } from 'lucide-react';
import type { ReactElement } from 'react';
import lockup from '../assets/lockup.svg';
import { director } from '../director/director';
import { chapters } from '../director/script';
import { actions, useApp } from '../state/store';
import { STUDY } from '../state/study';

function Transport(): ReactElement {
  const playing = useApp((state) => state.playing);
  const current = useApp((state) => state.chapter);
  return (
    <div className="transport">
      <button
        type="button"
        className="icon-button"
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={director.togglePause}
      >
        {playing ? <Pause /> : <Play />}
      </button>
      <ol className="chapters">
        {chapters.map((chapter, index) => (
          <li key={chapter.title}>
            <button
              type="button"
              className="chapter"
              data-state={index < current ? 'done' : index === current ? 'current' : 'todo'}
              aria-label={`Chapter ${index + 1}: ${chapter.title}`}
              aria-current={index === current ? 'step' : undefined}
              title={chapter.title}
              onClick={() => director.play(index)}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Up close, the way back to the board. */
function Crumbs(): ReactElement | null {
  const view = useApp((state) => state.view);
  const rackId = useApp((state) => state.rackId);
  const watching = useApp((state) => state.mode === 'watch');
  if (view === 'floor') return null;
  const back = (): void => {
    if (watching) director.handOver();
    actions.showFloor();
  };
  return (
    <nav className="crumbs" aria-label="Where you are">
      <button type="button" className="crumb-back" data-cue="floor-back" onClick={back}>
        <LayoutGrid aria-hidden="true" />
        All racks
      </button>
      <ChevronRight className="crumb-sep" aria-hidden="true" />
      <span aria-current="page">Rack {rackId}</span>
    </nav>
  );
}

/** Starts the story, or the scenario being played, or Try mode, over from the top. */
function startOver(): void {
  const { mode, role, scenarioRack } = useApp.getState();
  if (mode === 'watch') director.play();
  else if (role && scenarioRack !== null) actions.startScenario(role, scenarioRack);
  else actions.reset('try');
}

export function TopBar(): ReactElement {
  const watching = useApp((state) => state.mode === 'watch');
  // In a study session, participants stay on the scenario rack; the moderator reloads to reset.
  if (STUDY) {
    return (
      <header className="topbar">
        <div className="topbar-start">
          <img className="brand" src={lockup} alt="Rack & Share" />
        </div>
      </header>
    );
  }
  return (
    <header className="topbar">
      <div className="topbar-start">
        <img className="brand" src={lockup} alt="Rack & Share" />
        <Crumbs />
      </div>
      <div className="controls">
        {watching && <Transport />}
        <div className="mode-switch">
          <button type="button" aria-pressed={watching} onClick={() => director.play()}>
            Watch
          </button>
          <button
            type="button"
            data-cue="mode-try"
            aria-pressed={!watching}
            onClick={() => watching && director.handOver()}
          >
            Try it
          </button>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Start over"
          title="Start over"
          onClick={startOver}
        >
          <RotateCcw />
        </button>
      </div>
    </header>
  );
}
