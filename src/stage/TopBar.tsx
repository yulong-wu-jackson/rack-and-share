import { Pause, Play, RotateCcw } from 'lucide-react';
import type { ReactElement } from 'react';
import lockup from '../assets/lockup.svg';
import { director } from '../director/director';
import { chapters } from '../director/script';
import { actions, useApp } from '../state/store';

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

export function TopBar(): ReactElement {
  const watching = useApp((state) => state.mode === 'watch');
  return (
    <header className="topbar">
      <img className="brand" src={lockup} alt="Rack & Share" />
      <div className="controls">
        {watching && <Transport />}
        <div className="mode-switch">
          <button type="button" aria-pressed={watching} onClick={() => director.play()}>
            Watch
          </button>
          <button
            type="button"
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
          onClick={() => (watching ? director.play() : actions.reset('try'))}
        >
          <RotateCcw />
        </button>
      </div>
    </header>
  );
}
