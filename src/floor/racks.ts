/** The racks on the strength floor, and what the board by the door says about them. */

import {
  GUEST_DEFAULT_TAGS,
  MAX_WAITERS,
  minutesLeft,
  NO_WORK_IN,
  type Rack,
  type RackStatus,
  rackStatus,
  type Tags,
  type WaitStatus,
} from '../state/model';

export const RACK_IDS = [1, 2, 3, 4, 5, 6] as const;
export type RackId = (typeof RACK_IDS)[number];
export type Floor = Record<RackId, Rack>;

/** The rack the story follows. It starts free so the board has somewhere to send Marcus. */
export const HERO_RACK: RackId = 3;

export const BOARD_COPY: Record<RackStatus, { word: string; line: string }> = {
  free: { word: 'Free', line: 'Walk right over.' },
  'your-turn': { word: 'Next up', line: 'Held for the next in line.' },
  'mid-set': { word: 'Mid-set', line: 'Wait for the next rest.' },
  'resting-open': { word: 'Resting', line: 'Open to work in.' },
  'resting-closed': { word: 'Resting', line: 'Not sharing today.' },
};

/** Legend order, from most to least available. */
export const LEGEND: { status: RackStatus; label: string }[] = [
  { status: 'free', label: 'Free' },
  { status: 'resting-open', label: 'Resting, open to work in' },
  { status: 'resting-closed', label: 'Resting, not sharing' },
  { status: 'mid-set', label: 'Mid-set' },
  { status: 'your-turn', label: 'Next up' },
];

interface Seed {
  tags: Tags;
  setsLeft: number;
  lifting: boolean;
  guest?: boolean;
  waiters?: WaitStatus[];
}

function seedRack({ tags, setsLeft, lifting, guest, waiters = [] }: Seed): Rack {
  return {
    tags,
    session: guest ? { by: 'guest', setsLeft, lifting, tags } : { by: 'phone', setsLeft, lifting },
    waiters: waiters.map((status, index) => ({ id: index + 1, status })),
    nextWaiterId: waiters.length + 1,
    workIn: NO_WORK_IN,
  };
}

/** A busy evening: one rack free, the rest in every other state the board can show. */
export function seedFloor(hero: Rack): Floor {
  return {
    1: seedRack({
      tags: { experience: 'experienced', workIn: false, spot: true, questions: false },
      setsLeft: 2,
      lifting: true,
      waiters: ['queued'],
    }),
    2: seedRack({
      tags: { experience: 'beginner', workIn: true, spot: false, questions: true },
      setsLeft: 3,
      lifting: false,
    }),
    3: hero,
    4: seedRack({
      tags: { experience: null, workIn: false, spot: false, questions: false },
      setsLeft: 1,
      lifting: false,
    }),
    5: seedRack({ tags: GUEST_DEFAULT_TAGS, setsLeft: 3, lifting: true, guest: true }),
    6: seedRack({
      tags: { experience: 'experienced', workIn: true, spot: true, questions: true },
      setsLeft: 2,
      lifting: false,
      waiters: ['sharing'],
    }),
  };
}

export function statusCounts(floor: Floor): Record<RackStatus, number> {
  const counts: Record<RackStatus, number> = {
    free: 0,
    'your-turn': 0,
    'mid-set': 0,
    'resting-open': 0,
    'resting-closed': 0,
  };
  for (const id of RACK_IDS) counts[rackStatus(floor[id])] += 1;
  return counts;
}

export type Tip =
  | { kind: 'free' | 'work-in'; id: RackId }
  | { kind: 'soonest'; id: RackId; minutes: number };

/** Where a newcomer should go: a free rack, else one open to work in, else the one that frees up first. */
export function bestBet(floor: Floor): Tip | null {
  const free = RACK_IDS.find((id) => rackStatus(floor[id]) === 'free');
  if (free) return { kind: 'free', id: free };
  const open = RACK_IDS.find(
    (id) => rackStatus(floor[id]) === 'resting-open' && floor[id].waiters.length < MAX_WAITERS,
  );
  if (open) return { kind: 'work-in', id: open };

  // Only racks with room in line count, and people already waiting get a rack first.
  const joinable = RACK_IDS.filter(
    (id) => floor[id].session && floor[id].waiters.length < MAX_WAITERS,
  );
  const unlined = joinable.filter((id) => floor[id].waiters.length === 0);
  let soonest: Extract<Tip, { kind: 'soonest' }> | null = null;
  for (const id of unlined.length > 0 ? unlined : joinable) {
    const session = floor[id].session;
    if (!session) continue;
    const minutes = minutesLeft(session);
    if (!soonest || minutes < soonest.minutes) soonest = { kind: 'soonest', id, minutes };
  }
  return soonest;
}

export function tipLine(tip: Tip): string {
  if (tip.kind === 'soonest') {
    return tip.minutes === 0
      ? `All taken. Rack ${tip.id} frees up in a moment.`
      : `All taken. Rack ${tip.id} frees up first, in about ${tip.minutes} min.`;
  }
  return tip.kind === 'free'
    ? `Rack ${tip.id} is free. Walk right over.`
    : `Nothing free. Rack ${tip.id} is open to work in.`;
}
