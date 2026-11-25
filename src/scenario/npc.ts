/** The other person in a scenario: Maya when the viewer plays Marcus, and Marcus when they play Maya. */

import { type AppState, actions, useApp } from '../state/store';
import { mayaInLine, reachedStep } from './scenarios';

interface Move {
  /** Names the move, so a state change that leaves it the same keeps its timer running. */
  key: string;
  delay: number;
  run(): void;
}

function move(key: string, delay: number, run: () => void): Move {
  return { key, delay, run };
}

/** Maya wants the rack Marcus is on. She reads it, asks at his rest, works in once, then takes over. */
function mayaMove(state: AppState): Move | null {
  const { session, workIn } = state.rack;
  const me = mayaInLine(state);

  if (!state.present.maya) {
    // She turns up once Marcus is lifting, or once he has left a free rack behind.
    const due = session?.lifting || (!session && state.step >= 1);
    return due
      ? move('arrive', 1200, () => {
          actions.arrive('maya');
          actions.setGaze(true);
        })
      : null;
  }
  if (state.gaze) return move('look-away', 3200, () => actions.setGaze(false));

  if (!session) return move('take-rack', 2200, actions.mayaTakesRack);
  if (session.by === 'guest') {
    // Her own workout, after Marcus has gone.
    if (session.lifting) return move('rack', 5000, actions.rackBar);
    return session.setsLeft > 0 ? move('lift', 2500, actions.liftBar) : null;
  }

  if (workIn.lifting) return move('finish-work-in', 5000, actions.finishWorkIn);
  if (session.lifting) return null;
  if (!me && state.mayaWaiter === null) return move('ask', 1600, actions.mayaAsks);
  if (me?.status === 'sharing' && workIn.sets === 0)
    return move('work-in', 1800, actions.startWorkIn);
  return null;
}

/** Marcus is on the rack Maya wants. He rests until she has made her choice, then finishes his plan. */
function marcusMove(state: AppState): Move | null {
  const { session, workIn } = state.rack;
  // Maya looks up from the screen once it lets her ask.
  if (state.gaze && !session?.lifting) return move('look-away', 1200, () => actions.setGaze(false));
  if (!session || state.mine === state.rackId) return null;
  if (workIn.lifting) return null;
  if (session.lifting) return move('rack', 6000, actions.rackBar);

  const me = mayaInLine(state);
  if (me?.status === 'asked') return move('answer', 2200, () => actions.answerWorkIn(true));
  // He waits through his rest for Maya: first for her to ask, then for her set if he said yes.
  if (state.mayaWaiter === null) return null;
  if (me?.status === 'sharing' && workIn.sets === 0) return null;

  if (session.setsLeft > 0) return move('lift', 2500, actions.liftBar);
  return move('leave', 2500, () => {
    actions.endSession();
    actions.leave('marcus');
  });
}

function nextMove(state: AppState): Move | null {
  const playing = state.mode === 'try' && state.role !== null;
  const here = state.view === 'rack' && !state.picker && state.rackId === state.scenarioRack;
  if (!playing || !here) return null;
  return state.role === 'marcus' ? mayaMove(state) : marcusMove(state);
}

/** Keeps the scenario's steps up to date and plays the other person. Returns a stop function. */
export function runScenario(): () => void {
  let timer = 0;
  let pending: string | null = null;

  const plan = (state: AppState): void => {
    // Catching up the step sets state again, and that change plans the next move.
    if (state.role !== null && reachedStep(state) !== state.step) {
      actions.syncStep();
      return;
    }
    const next = nextMove(state);
    // The scene cut is part of the key, so a restart or a return to the rack starts the timer over.
    const key = next ? `${state.sceneCut}:${state.role}:${next.key}` : null;
    if (key === pending) return;
    window.clearTimeout(timer);
    pending = key;
    if (!next) return;
    timer = window.setTimeout(() => {
      pending = null;
      next.run();
      plan(useApp.getState());
    }, next.delay);
  };

  const stop = useApp.subscribe(plan);
  plan(useApp.getState());
  return () => {
    stop();
    window.clearTimeout(timer);
  };
}
