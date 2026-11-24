/** The other lifters on the floor: each rack runs its own workout so the board stays alive. */

import type { Rack, Tags } from '../state/model';
import * as model from '../state/model';
import { type Floor, RACK_IDS, type RackId } from './racks';

/** Seconds per beat. Shorter than a real gym so a viewer sees the board change. */
const SET_SECONDS = 8;
const REST_SECONDS = 11;
const IDLE_SECONDS = 9;
const HANDOVER_SECONDS = 3;

export interface Beat {
  /** Seconds until this rack's next change. */
  nextIn: number;
  /** Changes so far, which picks the next lifter's plan and when someone joins the line. */
  count: number;
}

export type Beats = Record<RackId, Beat>;

const PLANS: { sets: number; tags: Tags }[] = [
  { sets: 3, tags: { experience: 'beginner', workIn: true, spot: false, questions: true } },
  { sets: 4, tags: { experience: 'experienced', workIn: false, spot: true, questions: false } },
  { sets: 2, tags: { experience: null, workIn: true, spot: true, questions: false } },
];

/** Staggered so the racks never change all at once. The free rack stays free for a while. */
export function initialBeats(): Beats {
  const offsets: Record<RackId, number> = { 1: 5, 2: 9, 3: 30, 4: 6, 5: 12, 6: 14 };
  const beats = {} as Beats;
  for (const id of RACK_IDS) beats[id] = { nextIn: offsets[id], count: id };
  return beats;
}

/** The next thing that happens at a rack nobody is watching closely. */
export function advance(rack: Rack, count: number): { rack: Rack; nextIn: number } {
  const { session } = rack;
  if (!session) {
    // The next in line, or someone new, checks in with their phone.
    const plan = PLANS[count % PLANS.length];
    const next = model.setSets(model.checkIn({ ...rack, tags: plan.tags }), plan.sets);
    return { rack: next, nextIn: REST_SECONDS };
  }
  if (session.lifting) {
    const rested = model.rackBar(rack);
    // Every third set someone arrives, and a lifter open to sharing says yes.
    const joined = count % 3 === 0 ? model.joinLine(rested, 'work-in') : rested;
    return { rack: model.answerWorkIn(joined, true), nextIn: REST_SECONDS };
  }
  if (session.setsLeft === 0) {
    const ended = model.endSession(rack);
    return { rack: ended, nextIn: ended.waiters.length > 0 ? HANDOVER_SECONDS : IDLE_SECONDS };
  }
  return { rack: model.liftBar(rack), nextIn: SET_SECONDS };
}

/** One second of floor time for every rack except the ones in `skip`. */
export function tick(
  floor: Floor,
  beats: Beats,
  skip: readonly RackId[],
): { floor: Floor; beats: Beats; changed: boolean } {
  let nextFloor = floor;
  const nextBeats = { ...beats };
  for (const id of RACK_IDS) {
    if (skip.includes(id)) continue;
    const beat = beats[id];
    if (beat.nextIn > 1) {
      nextBeats[id] = { ...beat, nextIn: beat.nextIn - 1 };
      continue;
    }
    const step = advance(floor[id], beat.count);
    if (nextFloor === floor) nextFloor = { ...floor };
    nextFloor[id] = step.rack;
    nextBeats[id] = { nextIn: step.nextIn, count: beat.count + 1 };
  }
  return { floor: nextFloor, beats: nextBeats, changed: nextFloor !== floor };
}
