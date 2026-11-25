import { useEffect, useReducer, useRef } from 'react';
import { STATION_ID } from '../stage/geometry';
import { type Persona, spots, useApp } from '../state/store';
import { type Pose, standingBarY } from './figure';
import { BUILDS, RACK_X, SPOT_X } from './layout';

const WALK_SPEED = 170;
const MAX_STEP_SECONDS = 0.25;
const REP_SECONDS = 2.5;

export interface Actor {
  x: number;
  opacity: number;
  pose: Pose;
  /** Time into the current set, which drives the squat reps. */
  repSeconds: number;
}

export interface SceneFrame {
  actors: Record<Persona, Actor>;
  /** Hook height above the floor, as a negative y offset. */
  hookY: number;
  /** Who carries the bar this frame, if anyone. */
  carrier: Persona | null;
}

function newActor(): Actor {
  return {
    x: SPOT_X.away,
    opacity: 0,
    repSeconds: 0,
    pose: {
      squat: 0,
      grip: 0,
      reach: 0,
      stride: 0,
      phase: 0,
      breath: Math.random() * 6,
    },
  };
}

function approach(value: number, target: number, step: number): number {
  if (Math.abs(target - value) <= step) return target;
  return value + Math.sign(target - value) * step;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Depth of a squat over one rep: down, a short hold, up, then a breath at the top. */
function repDepth(seconds: number): number {
  const t = seconds % REP_SECONDS;
  if (t < 1) return smooth(t);
  if (t < 1.15) return 1;
  if (t < 2) return 1 - smooth((t - 1.15) / 0.85);
  return 0;
}

/** Runs the scene's animation loop and returns the current frame. */
export function useSceneSim(): SceneFrame {
  const [, redraw] = useReducer((count: number) => count + 1, 0);
  const frame = useRef<SceneFrame>({
    actors: { marcus: newActor(), maya: newActor() },
    hookY: standingBarY(BUILDS.marcus),
    carrier: null,
  });
  const lastCut = useRef(-1);
  /** The bar depth last sent to the station, so its barbell only restyles on change. */
  const barDepth = useRef('');

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const step = (now: number): void => {
      // Capped so a throttled or resumed tab moves on in steps instead of one jump.
      const dt = Math.min(MAX_STEP_SECONDS, (now - last) / 1000);
      last = now;
      const state = useApp.getState();
      // Behind the board nobody sees the scene, so it waits.
      if (state.view !== 'rack') {
        raf = requestAnimationFrame(step);
        return;
      }
      const where = spots(state);
      const cut = lastCut.current !== state.sceneCut;
      lastCut.current = state.sceneCut;
      const scene = frame.current;
      const lifting = (state.rack.session?.lifting ?? false) || state.rack.workIn.lifting;
      scene.carrier = null;

      for (const who of ['marcus', 'maya'] as const) {
        const actor = scene.actors[who];
        const pose = actor.pose;
        const spot = where[who];
        const targetX = SPOT_X[spot];
        if (cut) {
          actor.x = targetX;
          actor.opacity = spot === 'away' ? 0 : 1;
        }

        const walking = actor.x !== targetX;
        actor.x = approach(actor.x, targetX, WALK_SPEED * dt);
        actor.opacity = approach(actor.opacity, spot === 'away' ? 0 : 1, dt * 2.6);
        pose.stride = approach(pose.stride, walking ? 1 : 0, dt * 6);
        pose.phase += dt * 10 * pose.stride;
        pose.breath += dt * 1.7;

        const inRack = spot === 'rack' && actor.x === RACK_X && state.atRack === who;
        const working = inRack && lifting;
        // Arms stay on the bar until the lifter is back at the top of the rep.
        pose.grip = approach(pose.grip, working || pose.squat > 0.02 ? 1 : 0, dt * 4.5);
        if (working && pose.grip === 1) {
          actor.repSeconds += dt;
          pose.squat = repDepth(actor.repSeconds);
        } else {
          actor.repSeconds = 0;
          pose.squat = approach(pose.squat, 0, dt * 2.4);
        }
        pose.reach = approach(pose.reach, spot === 'station' && !walking ? 1 : 0, dt * 5);

        if (inRack && pose.grip > 0.9) scene.carrier = who;
      }

      const lifter = scene.actors[state.atRack];
      scene.hookY = approach(scene.hookY, standingBarY(BUILDS[state.atRack]), dt * 20);
      const depth = lifter.pose.squat.toFixed(3);
      if (depth !== barDepth.current) {
        barDepth.current = depth;
        document.getElementById(STATION_ID)?.style.setProperty('--bar', depth);
      }

      redraw();
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return frame.current;
}
