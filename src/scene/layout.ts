import type { Persona, Spot } from '../state/store';
import type { Build } from './figure';

/** Scene coordinates match the landscape stage: 1440 wide, floor line at FLOOR. */
export const SCENE_WIDTH = 1440;
export const SCENE_HEIGHT = 266;
export const FLOOR = 252;
export const RACK_X = 540;
export const UPRIGHT_OFFSET = 46;
export const RACK_HEIGHT = 176;

export const SCREEN = { x: 642, y: FLOOR - 146, width: 64, height: 44 };

export const BUILDS: Record<Persona, Build> = {
  marcus: { height: 126, shoulders: 31, bun: false },
  maya: { height: 114, shoulders: 25, bun: true },
};

/** Where each spot is on the floor. People enter and leave by fading at `away`. */
export const SPOT_X: Record<Spot, number> = {
  rack: RACK_X,
  front: 748,
  station: 748,
  near: 800,
  side: 852,
  away: 960,
};
